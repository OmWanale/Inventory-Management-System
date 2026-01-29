const pool = require('../config/database');
const { createAuditLog } = require('../utils/auditLog');

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [customers] = await pool.query(
      `SELECT * FROM customers WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get customer by ID
exports.getCustomer = async (req, res) => {
  try {
    const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);

    if (customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Get customer's invoice summary
    const [[invoiceSummary]] = await pool.query(
      `SELECT COUNT(*) as totalInvoices, COALESCE(SUM(total_amount), 0) as totalAmount,
        COALESCE(SUM(amount_paid), 0) as totalPaid
       FROM invoices WHERE customer_id = ?`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...customers[0],
        ...invoiceSummary
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const {
      name, phone, email, billingAddress, shippingAddress, city, state,
      postalCode, country, gstNumber, taxId, creditLimit, notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO customers (name, phone, email, billing_address, shipping_address, city, state, 
        postal_code, country, gst_number, tax_id, credit_limit, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email, billingAddress, shippingAddress, city, state,
        postalCode, country || 'India', gstNumber, taxId, creditLimit || 0, notes]
    );

    await createAuditLog(req.user.id, 'CREATE', 'customers', result.insertId, null, { name, phone }, req);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const {
      name, phone, email, billingAddress, shippingAddress, city, state,
      postalCode, country, gstNumber, taxId, creditLimit, status, notes
    } = req.body;

    const [currentCustomer] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (currentCustomer.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await pool.query(
      `UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        billing_address = COALESCE(?, billing_address),
        shipping_address = COALESCE(?, shipping_address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        country = COALESCE(?, country),
        gst_number = COALESCE(?, gst_number),
        tax_id = COALESCE(?, tax_id),
        credit_limit = COALESCE(?, credit_limit),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [name, phone, email, billingAddress, shippingAddress, city, state,
        postalCode, country, gstNumber, taxId, creditLimit, status, notes, customerId]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'customers', customerId, currentCustomer[0], req.body, req);

    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;

    const [customer] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (customer.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Delete related invoices and their items first
    const [invoices] = await pool.query('SELECT id FROM invoices WHERE customer_id = ?', [customerId]);
    for (const invoice of invoices) {
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
    }
    await pool.query('DELETE FROM invoices WHERE customer_id = ?', [customerId]);

    // Hard delete customer
    await pool.query('DELETE FROM customers WHERE id = ?', [customerId]);
    await createAuditLog(req.user.id, 'DELETE', 'customers', customerId, customer[0], null, req);

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get customer purchase history
exports.getCustomerHistory = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [invoices] = await pool.query(
      `SELECT i.*, 
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('productId', ii.product_id, 'productName', p.name, 
          'quantity', ii.quantity, 'price', ii.unit_price, 'total', ii.total))
         FROM invoice_items ii
         JOIN products p ON ii.product_id = p.id
         WHERE ii.invoice_id = i.id) as items
       FROM invoices i
       WHERE i.customer_id = ?
       ORDER BY i.invoice_date DESC
       LIMIT ? OFFSET ?`,
      [customerId, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM invoices WHERE customer_id = ?',
      [customerId]
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
    console.error('Get customer history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all customers for dropdown
exports.getCustomersList = async (req, res) => {
  try {
    const [customers] = await pool.query(
      'SELECT id, name, phone, email FROM customers WHERE status = ? ORDER BY name',
      ['active']
    );
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Get customers list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
