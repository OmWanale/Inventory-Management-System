const pool = require('../config/database');
const { createAuditLog } = require('../utils/auditLog');
const { generatePurchasePDF } = require('../utils/pdfGenerator');

const generatePurchaseNumber = async () => {
  const year = new Date().getFullYear();
  const [result] = await pool.query(
    `SELECT MAX(CAST(SUBSTRING(purchase_number, 9) AS UNSIGNED)) as maxNum 
     FROM purchases WHERE purchase_number LIKE ?`,
    [`PO-${year}-%`]
  );
  const nextNum = (result[0].maxNum || 0) + 1;
  return `PO-${year}-${String(nextNum).padStart(3, '0')}`;
};

exports.getAllPurchases = async (req, res) => {
  try {
    const { search, vendor, status, orderStatus, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.purchase_number LIKE ? OR p.invoice_number LIKE ? OR v.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (vendor) { whereClause += ' AND p.vendor_id = ?'; params.push(vendor); }
    if (status === 'overdue') {
      whereClause += " AND p.payment_status != ? AND p.payment_due_date < CURDATE()";
      params.push('paid');
    } else if (status) { whereClause += ' AND p.payment_status = ?'; params.push(status); }
    if (orderStatus) { whereClause += ' AND p.order_status = ?'; params.push(orderStatus); }
    if (startDate) { whereClause += ' AND p.purchase_date >= ?'; params.push(startDate); }
    if (endDate) { whereClause += ' AND p.purchase_date <= ?'; params.push(endDate); }

    const [purchases] = await pool.query(
      `SELECT p.*, v.name as vendor_name, u.full_name as received_by_name,
        CASE
          WHEN p.payment_status = 'paid' THEN 'paid'
          WHEN p.payment_due_date < CURDATE() AND p.payment_status != 'paid' THEN 'overdue'
          ELSE p.payment_status
        END as computed_payment_status,
        (p.total_amount - p.amount_paid) as pending_amount,
        (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true, data: purchases,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPurchase = async (req, res) => {
  try {
    const [purchases] = await pool.query(
      `SELECT p.*, v.name as vendor_name, v.contact_person, v.phone as vendor_phone,
        v.email as vendor_email, u.full_name as received_by_name
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (purchases.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    const [items] = await pool.query(
      `SELECT pi.*, pr.name as product_name, pr.sku
       FROM purchase_items pi JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = ?`,
      [req.params.id]
    );
    const [payments] = await pool.query(
      `SELECT pp.*, u.full_name as created_by_name
       FROM purchase_payments pp LEFT JOIN users u ON pp.created_by = u.id
       WHERE pp.purchase_id = ? ORDER BY pp.payment_date DESC`,
      [req.params.id]
    );
    const purchase = purchases[0];
    const computedStatus = purchase.payment_status === 'paid' ? 'paid'
      : (purchase.payment_due_date && new Date(purchase.payment_due_date) < new Date() ? 'overdue' : purchase.payment_status);
    res.json({
      success: true,
      data: { ...purchase, computed_payment_status: computedStatus, items, payments }
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createPurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { vendorId, purchaseDate, paymentDueDate, invoiceNumber, items,
      taxAmount, discountAmount, shippingCost, notes } = req.body;

    if (!vendorId || !purchaseDate || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vendor, purchase date, and at least one item are required' });
    }

    const dueDate = paymentDueDate || new Date(new Date(purchaseDate).getTime() + 30*24*60*60*1000).toISOString().split('T')[0];

    let subtotal = 0;
    for (const item of items) { subtotal += item.quantity * item.purchasePrice; }
    const totalAmount = subtotal + (taxAmount || 0) - (discountAmount || 0) + (shippingCost || 0);
    const purchaseNumber = await generatePurchaseNumber();

    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (purchase_number, vendor_id, purchase_date, payment_due_date, invoice_number,
        subtotal, tax_amount, discount_amount, shipping_cost, total_amount, amount_paid,
        payment_status, payment_method, order_status, notes, received_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', NULL, 'ordered', ?, ?)`,
      [purchaseNumber, vendorId, purchaseDate, dueDate, invoiceNumber,
        subtotal, taxAmount || 0, discountAmount || 0, shippingCost || 0, totalAmount, notes, req.user.id]
    );
    const purchaseId = purchaseResult.insertId;
    for (const item of items) {
      const itemTotal = item.quantity * item.purchasePrice;
      await connection.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price, total) VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.productId, item.quantity, item.purchasePrice, itemTotal]
      );
    }
    await connection.commit();
    await createAuditLog(req.user.id, 'CREATE', 'purchases', purchaseId, null,
      { purchaseNumber, vendorId, totalAmount, orderStatus: 'ordered' }, req);
    res.status(201).json({ success: true, message: 'Purchase order created successfully', data: { id: purchaseId, purchaseNumber } });
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { connection.release(); }
};

exports.markAsReceived = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const purchaseId = req.params.id;
    const [[purchase]] = await connection.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (!purchase) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Purchase not found' }); }
    if (purchase.order_status === 'received') { await connection.rollback(); return res.status(400).json({ success: false, message: 'Purchase order already received' }); }
    if (purchase.order_status === 'cancelled') { await connection.rollback(); return res.status(400).json({ success: false, message: 'Cannot receive a cancelled order' }); }

    const [items] = await connection.query('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
    for (const item of items) {
      const [[product]] = await connection.query('SELECT quantity FROM products WHERE id = ?', [item.product_id]);
      const previousQuantity = product.quantity;
      const newQuantity = previousQuantity + item.quantity;
      await connection.query('UPDATE products SET quantity = ?, purchase_price = ? WHERE id = ?', [newQuantity, item.purchase_price, item.product_id]);
      await connection.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, created_by)
         VALUES (?, 'stock_in', ?, 'purchase', ?, ?, ?, ?)`,
        [item.product_id, item.quantity, purchaseId, previousQuantity, newQuantity, req.user.id]
      );
    }
    await connection.query("UPDATE purchases SET order_status = 'received' WHERE id = ?", [purchaseId]);
    await connection.commit();
    await createAuditLog(req.user.id, 'RECEIVE', 'purchases', purchaseId, { order_status: purchase.order_status }, { order_status: 'received' }, req);
    res.json({ success: true, message: 'Purchase order marked as received. Stock updated.' });
  } catch (error) {
    await connection.rollback();
    console.error('Mark as received error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { connection.release(); }
};

exports.recordPayment = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const purchaseId = req.params.id;
    const { paymentDate, amount, paymentMode, referenceNo, notes } = req.body;
    const [[purchase]] = await connection.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (!purchase) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Purchase not found' }); }

    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) { await connection.rollback(); return res.status(400).json({ success: false, message: 'Invalid payment amount' }); }

    const currentPaid = parseFloat(purchase.amount_paid) || 0;
    const total = parseFloat(purchase.total_amount);
    const pendingAmount = Math.round((total - currentPaid) * 100) / 100;
    if (payAmount > pendingAmount + 0.01) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Payment amount (${payAmount}) exceeds pending amount (${pendingAmount})` });
    }

    await connection.query(
      `INSERT INTO purchase_payments (purchase_id, payment_date, amount, payment_mode, reference_no, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [purchaseId, paymentDate || new Date(), payAmount, paymentMode || 'cash', referenceNo || null, notes || null, req.user.id]
    );

    const [[{ totalPaid }]] = await connection.query('SELECT COALESCE(SUM(amount), 0) as totalPaid FROM purchase_payments WHERE purchase_id = ?', [purchaseId]);
    const newPaid = parseFloat(totalPaid);
    let newStatus = 'pending';
    if (newPaid >= total) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'partial';
    await connection.query('UPDATE purchases SET amount_paid = ?, payment_status = ?, payment_method = ? WHERE id = ?', [newPaid, newStatus, paymentMode || 'cash', purchaseId]);
    await connection.commit();
    await createAuditLog(req.user.id, 'RECORD_PAYMENT', 'purchases', purchaseId, { amount_paid: currentPaid }, { amount_paid: newPaid, payment: payAmount }, req);
    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Record purchase payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { connection.release(); }
};

exports.getPayments = async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT pp.*, u.full_name as created_by_name FROM purchase_payments pp LEFT JOIN users u ON pp.created_by = u.id WHERE pp.purchase_id = ? ORDER BY pp.payment_date DESC`,
      [req.params.id]
    );
    const [[purchase]] = await pool.query('SELECT total_amount, amount_paid FROM purchases WHERE id = ?', [req.params.id]);
    res.json({
      success: true, data: payments,
      summary: { totalAmount: purchase?.total_amount || 0, totalPaid: purchase?.amount_paid || 0, pending: (purchase?.total_amount || 0) - (purchase?.amount_paid || 0) }
    });
  } catch (error) {
    console.error('Get purchase payments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const purchaseId = req.params.id;
    const validStatuses = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }
    const [[purchase]] = await pool.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (!purchase) { return res.status(404).json({ success: false, message: 'Purchase not found' }); }
    await pool.query('UPDATE purchases SET order_status = ? WHERE id = ?', [orderStatus, purchaseId]);
    await createAuditLog(req.user.id, 'UPDATE_STATUS', 'purchases', purchaseId, { order_status: purchase.order_status }, { order_status: orderStatus }, req);
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updatePurchasePayment = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const purchaseId = req.params.id;
    const [purchase] = await pool.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (purchase.length === 0) { return res.status(404).json({ success: false, message: 'Purchase not found' }); }
    await pool.query('UPDATE purchases SET payment_status = ?, payment_method = COALESCE(?, payment_method) WHERE id = ?', [paymentStatus, paymentMethod, purchaseId]);
    await createAuditLog(req.user.id, 'UPDATE_PAYMENT', 'purchases', purchaseId, { paymentStatus: purchase[0].payment_status }, { paymentStatus }, req);
    res.json({ success: true, message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Update purchase payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deletePurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const purchaseId = req.params.id;
    const [purchase] = await connection.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (purchase.length === 0) { return res.status(404).json({ success: false, message: 'Purchase not found' }); }

    const [[{ paymentCount }]] = await connection.query('SELECT COUNT(*) as paymentCount FROM purchase_payments WHERE purchase_id = ?', [purchaseId]);
    if (paymentCount > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot delete purchase with recorded payments. Remove payments first.' });
    }

    if (purchase[0].order_status === 'received') {
      const [items] = await connection.query('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
      for (const item of items) {
        const [[product]] = await connection.query('SELECT quantity FROM products WHERE id = ?', [item.product_id]);
        const newQuantity = Math.max(0, product.quantity - item.quantity);
        await connection.query('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, item.product_id]);
        await connection.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, notes, created_by)
           VALUES (?, 'stock_out', ?, 'return', ?, ?, ?, 'Purchase deleted', ?)`,
          [item.product_id, item.quantity, purchaseId, product.quantity, newQuantity, req.user.id]
        );
      }
    }

    await connection.query('DELETE FROM purchases WHERE id = ?', [purchaseId]);
    await connection.commit();
    await createAuditLog(req.user.id, 'DELETE', 'purchases', purchaseId, purchase[0], null, req);
    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { connection.release(); }
};

exports.downloadPurchasePDF = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const [purchases] = await pool.query(
      `SELECT p.*, v.name as vendor_name, v.contact_person, v.phone as vendor_phone, v.gst_number as vendor_gst
       FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ?`,
      [purchaseId]
    );
    if (purchases.length === 0) { return res.status(404).json({ success: false, message: 'Purchase not found' }); }
    const [items] = await pool.query(
      `SELECT pi.*, pr.name as product_name, pr.sku FROM purchase_items pi JOIN products pr ON pi.product_id = pr.id WHERE pi.purchase_id = ?`,
      [purchaseId]
    );
    const [config] = await pool.query('SELECT config_key, config_value FROM system_config');
    const companyInfo = {};
    config.forEach(c => companyInfo[c.config_key] = c.config_value);
    const vendor = { name: purchases[0].vendor_name, contact_person: purchases[0].contact_person, phone: purchases[0].vendor_phone, gst_number: purchases[0].vendor_gst };
    const pdfBuffer = await generatePurchasePDF(purchases[0], items, vendor, companyInfo);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=purchase-${purchases[0].purchase_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download purchase PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
