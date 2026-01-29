const pool = require('../config/database');
const { createAuditLog } = require('../utils/auditLog');

// Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [vendors] = await pool.query(
      `SELECT * FROM vendors WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM vendors WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get vendor by ID
exports.getVendor = async (req, res) => {
  try {
    const [vendors] = await pool.query('SELECT * FROM vendors WHERE id = ?', [req.params.id]);

    if (vendors.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Get vendor's products count
    const [[{ productCount }]] = await pool.query(
      'SELECT COUNT(*) as productCount FROM products WHERE vendor_id = ?',
      [req.params.id]
    );

    // Get vendor's purchase history summary
    const [[purchaseSummary]] = await pool.query(
      `SELECT COUNT(*) as totalPurchases, COALESCE(SUM(total_amount), 0) as totalAmount
       FROM purchases WHERE vendor_id = ?`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...vendors[0],
        productCount,
        ...purchaseSummary
      }
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create vendor
exports.createVendor = async (req, res) => {
  try {
    const {
      name, contactPerson, phone, email, address, city, state,
      postalCode, country, gstNumber, taxId, paymentTerms, notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO vendors (name, contact_person, phone, email, address, city, state, 
        postal_code, country, gst_number, tax_id, payment_terms, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, contactPerson, phone, email, address, city, state,
        postalCode, country || 'India', gstNumber, taxId, paymentTerms, notes]
    );

    await createAuditLog(req.user.id, 'CREATE', 'vendors', result.insertId, null, { name, phone }, req);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update vendor
exports.updateVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const {
      name, contactPerson, phone, email, address, city, state,
      postalCode, country, gstNumber, taxId, paymentTerms, status, notes
    } = req.body;

    const [currentVendor] = await pool.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    if (currentVendor.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await pool.query(
      `UPDATE vendors SET
        name = COALESCE(?, name),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        country = COALESCE(?, country),
        gst_number = COALESCE(?, gst_number),
        tax_id = COALESCE(?, tax_id),
        payment_terms = COALESCE(?, payment_terms),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [name, contactPerson, phone, email, address, city, state,
        postalCode, country, gstNumber, taxId, paymentTerms, status, notes, vendorId]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'vendors', vendorId, currentVendor[0], req.body, req);

    res.json({ success: true, message: 'Vendor updated successfully' });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;

    const [vendor] = await pool.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    if (vendor.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Delete related purchases and their items first
    const [purchases] = await pool.query('SELECT id FROM purchases WHERE vendor_id = ?', [vendorId]);
    for (const purchase of purchases) {
      await pool.query('DELETE FROM purchase_items WHERE purchase_id = ?', [purchase.id]);
    }
    await pool.query('DELETE FROM purchases WHERE vendor_id = ?', [vendorId]);
    await pool.query('UPDATE products SET vendor_id = NULL WHERE vendor_id = ?', [vendorId]);

    // Hard delete vendor
    await pool.query('DELETE FROM vendors WHERE id = ?', [vendorId]);
    await createAuditLog(req.user.id, 'DELETE', 'vendors', vendorId, vendor[0], null, req);

    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get vendor supply history
exports.getVendorSupplyHistory = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [purchases] = await pool.query(
      `SELECT p.*, 
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('productId', pi.product_id, 'productName', pr.name, 
          'quantity', pi.quantity, 'price', pi.purchase_price, 'total', pi.total))
         FROM purchase_items pi
         JOIN products pr ON pi.product_id = pr.id
         WHERE pi.purchase_id = p.id) as items
       FROM purchases p
       WHERE p.vendor_id = ?
       ORDER BY p.purchase_date DESC
       LIMIT ? OFFSET ?`,
      [vendorId, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM purchases WHERE vendor_id = ?',
      [vendorId]
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
    console.error('Get vendor supply history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all vendors for dropdown
exports.getVendorsList = async (req, res) => {
  try {
    const [vendors] = await pool.query(
      'SELECT id, name, contact_person, phone FROM vendors WHERE status = ? ORDER BY name',
      ['active']
    );
    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Get vendors list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
