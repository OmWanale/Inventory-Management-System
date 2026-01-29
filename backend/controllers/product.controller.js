const pool = require('../config/database');
const { createAuditLog } = require('../utils/auditLog');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, vendor, status, lowStock, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    if (vendor) {
      whereClause += ' AND p.vendor_id = ?';
      params.push(vendor);
    }

    if (status !== undefined) {
      whereClause += ' AND p.is_active = ?';
      params.push(status === 'active');
    }

    if (lowStock === 'true') {
      whereClause += ' AND p.quantity <= p.reorder_level';
    }

    const [products] = await pool.query(
      `SELECT p.*, v.name as vendor_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get product by ID
exports.getProduct = async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, v.name as vendor_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: products[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const {
      sku, name, description, category, brand, unit,
      quantity, purchasePrice, sellingPrice, reorderLevel,
      maxStock, vendorId, barcode
    } = req.body;

    // Validate required fields
    if (!sku || !name || !sellingPrice) {
      return res.status(400).json({
        success: false,
        message: 'SKU, name, and selling price are required'
      });
    }

    // Check for duplicate SKU
    const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/products/${req.file.filename}`;
    }

    const [result] = await pool.query(
      `INSERT INTO products (sku, name, description, category, brand, unit, quantity, 
        purchase_price, selling_price, reorder_level, max_stock, vendor_id, image, barcode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku, name, description, category, brand, unit || 'piece', quantity || 0,
        purchasePrice || 0, sellingPrice, reorderLevel || 10, maxStock || 1000,
        vendorId || null, imagePath, barcode]
    );

    // Audit log
    await createAuditLog(req.user.id, 'CREATE', 'products', result.insertId, null, { sku, name }, req);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      sku, name, description, category, brand, unit,
      purchasePrice, sellingPrice, reorderLevel, maxStock, vendorId, barcode, isActive
    } = req.body;

    // Get current product
    const [currentProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (currentProduct.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check for duplicate SKU
    if (sku) {
      const [existing] = await pool.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, productId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'SKU already exists' });
      }
    }

    // Handle image upload
    let imagePath = currentProduct[0].image;
    if (req.file) {
      imagePath = `/uploads/products/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE products SET
        sku = COALESCE(?, sku),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        brand = COALESCE(?, brand),
        unit = COALESCE(?, unit),
        purchase_price = COALESCE(?, purchase_price),
        selling_price = COALESCE(?, selling_price),
        reorder_level = COALESCE(?, reorder_level),
        max_stock = COALESCE(?, max_stock),
        vendor_id = ?,
        image = ?,
        barcode = COALESCE(?, barcode),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [sku, name, description, category, brand, unit, purchasePrice, sellingPrice,
        reorderLevel, maxStock, vendorId, imagePath, barcode, isActive, productId]
    );

    // Audit log
    await createAuditLog(req.user.id, 'UPDATE', 'products', productId, currentProduct[0], req.body, req);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (product.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete related records first
    await pool.query('DELETE FROM invoice_items WHERE product_id = ?', [productId]);
    await pool.query('DELETE FROM purchase_items WHERE product_id = ?', [productId]);
    await pool.query('DELETE FROM inventory_movements WHERE product_id = ?', [productId]);

    // Hard delete product
    await pool.query('DELETE FROM products WHERE id = ?', [productId]);
    await createAuditLog(req.user.id, 'DELETE', 'products', productId, product[0], null, req);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category`
    );
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, v.name as vendor_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.quantity <= p.reorder_level AND p.is_active = TRUE
       ORDER BY (p.quantity / NULLIF(p.reorder_level, 0)) ASC`
    );

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update stock manually
exports.updateStock = async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const productId = req.params.id;

    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (product.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousQuantity = product[0].quantity;
    const newQuantity = parseInt(quantity);

    await pool.query('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, productId]);

    // Create inventory movement
    const movementType = newQuantity > previousQuantity ? 'stock_in' : 'stock_out';
    await pool.query(
      `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, 
        previous_quantity, new_quantity, notes, created_by)
       VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?)`,
      [productId, movementType, Math.abs(newQuantity - previousQuantity), previousQuantity, newQuantity, notes, req.user.id]
    );

    await createAuditLog(req.user.id, 'STOCK_ADJUSTMENT', 'products', productId, 
      { quantity: previousQuantity }, { quantity: newQuantity, notes }, req);

    res.json({ success: true, message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
