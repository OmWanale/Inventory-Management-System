const pool = require('../config/database');
const { createAuditLog } = require('../utils/auditLog');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// Generate invoice number
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const [result] = await pool.query(
    `SELECT MAX(CAST(SUBSTRING(invoice_number, 10) AS UNSIGNED)) as maxNum 
     FROM invoices WHERE invoice_number LIKE ?`,
    [`INV-${year}-%`]
  );
  const nextNum = (result[0].maxNum || 0) + 1;
  return `INV-${year}-${String(nextNum).padStart(3, '0')}`;
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const { search, customer, status, invoiceStatus, paymentMode, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (customer) {
      whereClause += ' AND i.customer_id = ?';
      params.push(customer);
    }

    if (status === 'overdue') {
      whereClause += ' AND i.payment_status != ? AND i.due_date < CURDATE()';
      params.push('paid');
    } else if (status) {
      whereClause += ' AND i.payment_status = ?';
      params.push(status);
    }

    if (invoiceStatus) {
      whereClause += ' AND i.status = ?';
      params.push(invoiceStatus);
    }

    if (paymentMode) {
      whereClause += ' AND i.payment_mode = ?';
      params.push(paymentMode);
    }

    if (startDate) {
      whereClause += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    const [invoices] = await pool.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
        CASE
          WHEN i.payment_status = 'paid' THEN 'paid'
          WHEN i.due_date < CURDATE() AND i.payment_status != 'paid' THEN 'overdue'
          ELSE i.payment_status
        END as computed_payment_status
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get invoice by ID
exports.getInvoice = async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.billing_address, c.city, c.state, c.postal_code, c.gst_number as customer_gst,
        u.full_name as created_by_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get invoice items
    const [items] = await pool.query(
      `SELECT ii.*, p.name as product_name, p.sku
       FROM invoice_items ii
       JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = ?`,
      [req.params.id]
    );

    // Get payment history
    const [payments] = await pool.query(
      `SELECT ip.*, u.full_name as created_by_name
       FROM invoice_payments ip
       LEFT JOIN users u ON ip.created_by = u.id
       WHERE ip.invoice_id = ?
       ORDER BY ip.payment_date DESC`,
      [req.params.id]
    );

    const invoice = invoices[0];
    const computedStatus = invoice.payment_status === 'paid' ? 'paid'
      : (invoice.due_date && new Date(invoice.due_date) < new Date() ? 'overdue' : invoice.payment_status);

    res.json({
      success: true,
      data: {
        ...invoice,
        computed_payment_status: computedStatus,
        items,
        payments
      }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create invoice
exports.createInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      customerId, invoiceDate, dueDate, items, taxRate, discountRate,
      discountAmount, shippingCost, amountPaid, paymentMode, paymentStatus, notes
    } = req.body;

    if (!invoiceDate || !dueDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice date, due date, and at least one item are required'
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      // Check stock availability
      const [[product]] = await connection.query(
        'SELECT quantity, name FROM products WHERE id = ?',
        [item.productId]
      );

      if (!product) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }

      if (product.quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`
        });
      }

      subtotal += (item.quantity * item.unitPrice) - (item.discount || 0);
    }

    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const discount = discountAmount || (subtotal * ((discountRate || 0) / 100));
    const totalAmount = subtotal + taxAmount - discount + (shippingCost || 0);

    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice
    const [invoiceResult] = await connection.query(
      `INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, 
        tax_rate, tax_amount, discount_rate, discount_amount, shipping_cost, total_amount, 
        amount_paid, payment_mode, payment_status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNumber, customerId || null, invoiceDate, dueDate, subtotal,
        taxRate || 0, taxAmount, discountRate || 0, discount, shippingCost || 0, totalAmount,
        amountPaid || 0, paymentMode || 'cash', paymentStatus || 'pending', notes, req.user.id]
    );

    const invoiceId = invoiceResult.insertId;

    // Create invoice items and reduce stock
    for (const item of items) {
      const itemTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
      
      await connection.query(
        `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.productId, item.quantity, item.unitPrice, item.discount || 0, itemTotal]
      );

      // Get current stock
      const [[product]] = await connection.query(
        'SELECT quantity FROM products WHERE id = ?',
        [item.productId]
      );

      const previousQuantity = product.quantity;
      const newQuantity = previousQuantity - item.quantity;

      // Update product stock
      await connection.query(
        'UPDATE products SET quantity = ? WHERE id = ?',
        [newQuantity, item.productId]
      );

      // Create inventory movement
      await connection.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, 
          reference_id, previous_quantity, new_quantity, created_by)
         VALUES (?, 'stock_out', ?, 'invoice', ?, ?, ?, ?)`,
        [item.productId, item.quantity, invoiceId, previousQuantity, newQuantity, req.user.id]
      );
    }

    // Update customer outstanding balance if credit
    if (customerId && paymentStatus !== 'paid') {
      const outstanding = totalAmount - (amountPaid || 0);
      await connection.query(
        'UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?',
        [outstanding, customerId]
      );
    }

    await connection.commit();

    await createAuditLog(req.user.id, 'CREATE', 'invoices', invoiceId, null, 
      { invoiceNumber, customerId, totalAmount }, req);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: { id: invoiceId, invoiceNumber }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Update invoice payment
exports.updateInvoicePayment = async (req, res) => {
  try {
    const { amountPaid, paymentMode, paymentStatus } = req.body;
    const invoiceId = req.params.id;

    const [invoice] = await pool.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (invoice.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const previousAmountPaid = invoice[0].amount_paid;
    const newAmountPaid = amountPaid !== undefined ? amountPaid : previousAmountPaid;
    
    let newPaymentStatus = paymentStatus;
    if (!newPaymentStatus) {
      if (newAmountPaid >= invoice[0].total_amount) {
        newPaymentStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newPaymentStatus = 'partial';
      } else {
        newPaymentStatus = 'pending';
      }
    }

    await pool.query(
      `UPDATE invoices SET 
        amount_paid = ?, 
        payment_mode = COALESCE(?, payment_mode), 
        payment_status = ?
       WHERE id = ?`,
      [newAmountPaid, paymentMode, newPaymentStatus, invoiceId]
    );

    // Update customer outstanding balance
    if (invoice[0].customer_id) {
      const balanceChange = previousAmountPaid - newAmountPaid;
      await pool.query(
        'UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?',
        [balanceChange, invoice[0].customer_id]
      );
    }

    await createAuditLog(req.user.id, 'UPDATE_PAYMENT', 'invoices', invoiceId, 
      { amountPaid: previousAmountPaid, paymentStatus: invoice[0].payment_status }, 
      { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus }, req);

    res.json({ success: true, message: 'Payment updated successfully' });
  } catch (error) {
    console.error('Update invoice payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Record payment for invoice
exports.recordPayment = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const invoiceId = req.params.id;
    const { paymentDate, amount, paymentMode, referenceNo, notes } = req.body;

    const [[invoice]] = await connection.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const currentPaid = parseFloat(invoice.amount_paid) || 0;
    const total = parseFloat(invoice.total_amount);
    const pendingAmount = Math.round((total - currentPaid) * 100) / 100;

    if (payAmount > pendingAmount + 0.01) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment amount (${payAmount}) exceeds pending amount (${pendingAmount})`
      });
    }

    // Insert payment record
    await connection.query(
      `INSERT INTO invoice_payments (invoice_id, payment_date, amount, payment_mode, reference_no, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, paymentDate || new Date(), payAmount, paymentMode || 'cash', referenceNo || null, notes || null, req.user.id]
    );

    // Recalculate from payment records
    const [[{ totalPaid }]] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) as totalPaid FROM invoice_payments WHERE invoice_id = ?',
      [invoiceId]
    );

    const newPaid = parseFloat(totalPaid);
    let newStatus = 'pending';
    if (newPaid >= total) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'partial';

    await connection.query(
      'UPDATE invoices SET amount_paid = ?, payment_status = ?, payment_mode = ? WHERE id = ?',
      [newPaid, newStatus, paymentMode || 'cash', invoiceId]
    );

    // Update customer outstanding balance
    if (invoice.customer_id) {
      await connection.query(
        'UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?',
        [payAmount, invoice.customer_id]
      );
    }

    await connection.commit();

    await createAuditLog(req.user.id, 'RECORD_PAYMENT', 'invoices', invoiceId,
      { amount_paid: currentPaid }, { amount_paid: newPaid, payment: payAmount }, req);

    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Record invoice payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Get payments for an invoice
exports.getPayments = async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT ip.*, u.full_name as created_by_name
       FROM invoice_payments ip
       LEFT JOIN users u ON ip.created_by = u.id
       WHERE ip.invoice_id = ?
       ORDER BY ip.payment_date DESC`,
      [req.params.id]
    );

    const [[invoice]] = await pool.query(
      'SELECT total_amount, amount_paid FROM invoices WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: payments,
      summary: {
        totalAmount: invoice?.total_amount || 0,
        totalPaid: invoice?.amount_paid || 0,
        pending: (invoice?.total_amount || 0) - (invoice?.amount_paid || 0)
      }
    });
  } catch (error) {
    console.error('Get invoice payments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete invoice (with stock rollback)
exports.deleteInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const invoiceId = req.params.id;

    const [invoice] = await connection.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (invoice.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Check if payments exist
    const [[{ paymentCount }]] = await connection.query(
      'SELECT COUNT(*) as paymentCount FROM invoice_payments WHERE invoice_id = ?',
      [invoiceId]
    );
    if (paymentCount > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice with recorded payments. Remove payments first.'
      });
    }

    // Get invoice items
    const [items] = await connection.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );

    // Restore stock for each item
    for (const item of items) {
      const [[product]] = await connection.query('SELECT quantity FROM products WHERE id = ?', [item.product_id]);
      
      const newQuantity = product.quantity + item.quantity;
      
      await connection.query('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, item.product_id]);

      // Create reverse inventory movement
      await connection.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, 
          reference_id, previous_quantity, new_quantity, notes, created_by)
         VALUES (?, 'stock_in', ?, 'return', ?, ?, ?, 'Invoice deleted', ?)`,
        [item.product_id, item.quantity, invoiceId, product.quantity, newQuantity, req.user.id]
      );
    }

    // Update customer outstanding balance
    if (invoice[0].customer_id) {
      const outstanding = invoice[0].total_amount - invoice[0].amount_paid;
      await connection.query(
        'UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?',
        [outstanding, invoice[0].customer_id]
      );
    }

    // Delete invoice (cascade will delete items)
    await connection.query('DELETE FROM invoices WHERE id = ?', [invoiceId]);

    await connection.commit();

    await createAuditLog(req.user.id, 'DELETE', 'invoices', invoiceId, invoice[0], null, req);

    res.json({ success: true, message: 'Invoice deleted and stock restored' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Download invoice PDF
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const [invoices] = await pool.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.billing_address, c.city, c.state, c.postal_code, c.gst_number as customer_gst
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.id = ?`,
      [invoiceId]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const [items] = await pool.query(
      `SELECT ii.*, p.name as product_name, p.sku
       FROM invoice_items ii
       JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = ?`,
      [invoiceId]
    );

    // Get company info
    const [config] = await pool.query('SELECT config_key, config_value FROM system_config');
    const companyInfo = {};
    config.forEach(c => companyInfo[c.config_key] = c.config_value);

    const customer = {
      name: invoices[0].customer_name,
      phone: invoices[0].customer_phone,
      email: invoices[0].customer_email,
      billing_address: invoices[0].billing_address,
      city: invoices[0].city,
      state: invoices[0].state,
      postal_code: invoices[0].postal_code,
      gst_number: invoices[0].customer_gst
    };

    const pdfBuffer = await generateInvoicePDF(invoices[0], items, customer, companyInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoices[0].invoice_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download invoice PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
