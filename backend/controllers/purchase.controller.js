const pool = require('../config/database');
const { createAuditLog } = require('../utils/auditLog');
const { generatePurchasePDF } = require('../utils/pdfGenerator');

// Generate purchase number
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

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  try {
    const { search, vendor, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.purchase_number LIKE ? OR p.invoice_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (vendor) {
      whereClause += ' AND p.vendor_id = ?';
      params.push(vendor);
    }

    if (status) {
      whereClause += ' AND p.payment_status = ?';
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND p.purchase_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND p.purchase_date <= ?';
      params.push(endDate);
    }

    const [purchases] = await pool.query(
      `SELECT p.*, v.name as vendor_name, u.full_name as received_by_name
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM purchases p WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get purchase by ID
exports.getPurchase = async (req, res) => {
  try {
    const [purchases] = await pool.query(
      `SELECT p.*, v.name as vendor_name, v.contact_person, v.phone as vendor_phone,
        u.full_name as received_by_name
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (purchases.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Get purchase items
    const [items] = await pool.query(
      `SELECT pi.*, pr.name as product_name, pr.sku
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = ?`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...purchases[0],
        items
      }
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create purchase
exports.createPurchase = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      vendorId, purchaseDate, invoiceNumber, items,
      taxAmount, discountAmount, shippingCost, paymentStatus, paymentMethod, notes
    } = req.body;

    if (!vendorId || !purchaseDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vendor, purchase date, and at least one item are required'
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.purchasePrice;
    }

    const totalAmount = subtotal + (taxAmount || 0) - (discountAmount || 0) + (shippingCost || 0);
    const purchaseNumber = await generatePurchaseNumber();

    // Create purchase
    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (purchase_number, vendor_id, purchase_date, invoice_number, 
        subtotal, tax_amount, discount_amount, shipping_cost, total_amount, 
        payment_status, payment_method, notes, received_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchaseNumber, vendorId, purchaseDate, invoiceNumber,
        subtotal, taxAmount || 0, discountAmount || 0, shippingCost || 0, totalAmount,
        paymentStatus || 'pending', paymentMethod, notes, req.user.id]
    );

    const purchaseId = purchaseResult.insertId;

    // Create purchase items and update stock
    for (const item of items) {
      const itemTotal = item.quantity * item.purchasePrice;
      
      await connection.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price, total)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.productId, item.quantity, item.purchasePrice, itemTotal]
      );

      // Get current stock
      const [[product]] = await connection.query(
        'SELECT quantity FROM products WHERE id = ?',
        [item.productId]
      );

      const previousQuantity = product.quantity;
      const newQuantity = previousQuantity + item.quantity;

      // Update product stock
      await connection.query(
        'UPDATE products SET quantity = ?, purchase_price = ? WHERE id = ?',
        [newQuantity, item.purchasePrice, item.productId]
      );

      // Create inventory movement
      await connection.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, 
          reference_id, previous_quantity, new_quantity, created_by)
         VALUES (?, 'stock_in', ?, 'purchase', ?, ?, ?, ?)`,
        [item.productId, item.quantity, purchaseId, previousQuantity, newQuantity, req.user.id]
      );
    }

    await connection.commit();

    await createAuditLog(req.user.id, 'CREATE', 'purchases', purchaseId, null, 
      { purchaseNumber, vendorId, totalAmount }, req);

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: { id: purchaseId, purchaseNumber }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Update purchase payment status
exports.updatePurchasePayment = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const purchaseId = req.params.id;

    const [purchase] = await pool.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (purchase.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    await pool.query(
      'UPDATE purchases SET payment_status = ?, payment_method = COALESCE(?, payment_method) WHERE id = ?',
      [paymentStatus, paymentMethod, purchaseId]
    );

    await createAuditLog(req.user.id, 'UPDATE_PAYMENT', 'purchases', purchaseId, 
      { paymentStatus: purchase[0].payment_status }, { paymentStatus }, req);

    res.json({ success: true, message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Update purchase payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete purchase (with stock rollback)
exports.deletePurchase = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const purchaseId = req.params.id;

    const [purchase] = await connection.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (purchase.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Get purchase items
    const [items] = await connection.query(
      'SELECT * FROM purchase_items WHERE purchase_id = ?',
      [purchaseId]
    );

    // Rollback stock for each item
    for (const item of items) {
      const [[product]] = await connection.query('SELECT quantity FROM products WHERE id = ?', [item.product_id]);
      
      const newQuantity = Math.max(0, product.quantity - item.quantity);
      
      await connection.query('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, item.product_id]);

      // Create reverse inventory movement
      await connection.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, 
          reference_id, previous_quantity, new_quantity, notes, created_by)
         VALUES (?, 'stock_out', ?, 'return', ?, ?, ?, 'Purchase deleted', ?)`,
        [item.product_id, item.quantity, purchaseId, product.quantity, newQuantity, req.user.id]
      );
    }

    // Delete purchase (cascade will delete items)
    await connection.query('DELETE FROM purchases WHERE id = ?', [purchaseId]);

    await connection.commit();

    await createAuditLog(req.user.id, 'DELETE', 'purchases', purchaseId, purchase[0], null, req);

    res.json({ success: true, message: 'Purchase deleted and stock rolled back' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Download purchase PDF
exports.downloadPurchasePDF = async (req, res) => {
  try {
    const purchaseId = req.params.id;

    const [purchases] = await pool.query(
      `SELECT p.*, v.name as vendor_name, v.contact_person, v.phone as vendor_phone, v.gst_number as vendor_gst
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = ?`,
      [purchaseId]
    );

    if (purchases.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const [items] = await pool.query(
      `SELECT pi.*, pr.name as product_name, pr.sku
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = ?`,
      [purchaseId]
    );

    // Get company info
    const [config] = await pool.query('SELECT config_key, config_value FROM system_config');
    const companyInfo = {};
    config.forEach(c => companyInfo[c.config_key] = c.config_value);

    const vendor = {
      name: purchases[0].vendor_name,
      contact_person: purchases[0].contact_person,
      phone: purchases[0].vendor_phone,
      gst_number: purchases[0].vendor_gst
    };

    const pdfBuffer = await generatePurchasePDF(purchases[0], items, vendor, companyInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=purchase-${purchases[0].purchase_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download purchase PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
