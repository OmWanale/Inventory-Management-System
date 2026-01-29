const pool = require('../config/database');

// Get inventory movements
exports.getInventoryMovements = async (req, res) => {
  try {
    const { productId, type, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (productId) {
      whereClause += ' AND im.product_id = ?';
      params.push(productId);
    }

    if (type) {
      whereClause += ' AND im.movement_type = ?';
      params.push(type);
    }

    if (startDate) {
      whereClause += ' AND im.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND im.created_at <= ?';
      params.push(endDate);
    }

    const [movements] = await pool.query(
      `SELECT im.*, p.name as product_name, p.sku, u.full_name as created_by_name
       FROM inventory_movements im
       JOIN products p ON im.product_id = p.id
       LEFT JOIN users u ON im.created_by = u.id
       WHERE ${whereClause}
       ORDER BY im.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM inventory_movements im WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory movements error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get product inventory history
exports.getProductHistory = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [movements] = await pool.query(
      `SELECT im.*, u.full_name as created_by_name
       FROM inventory_movements im
       LEFT JOIN users u ON im.created_by = u.id
       WHERE im.product_id = ?
       ORDER BY im.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM inventory_movements WHERE product_id = ?`,
      [productId]
    );

    res.json({
      success: true,
      data: movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get product history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get inventory summary
exports.getInventorySummary = async (req, res) => {
  try {
    // Stock value
    const [[stockValue]] = await pool.query(
      `SELECT 
        SUM(quantity * purchase_price) as costValue,
        SUM(quantity * selling_price) as retailValue,
        SUM(quantity) as totalUnits
       FROM products WHERE is_active = TRUE`
    );

    // Category breakdown
    const [categoryBreakdown] = await pool.query(
      `SELECT category, 
        SUM(quantity) as units,
        SUM(quantity * purchase_price) as costValue,
        SUM(quantity * selling_price) as retailValue
       FROM products 
       WHERE is_active = TRUE AND category IS NOT NULL
       GROUP BY category
       ORDER BY retailValue DESC`
    );

    // Stock movement summary for current month
    const [[monthlyMovement]] = await pool.query(
      `SELECT 
        SUM(CASE WHEN movement_type = 'stock_in' THEN quantity ELSE 0 END) as stockIn,
        SUM(CASE WHEN movement_type = 'stock_out' THEN quantity ELSE 0 END) as stockOut
       FROM inventory_movements
       WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
    );

    res.json({
      success: true,
      data: {
        stockValue: {
          cost: stockValue.costValue || 0,
          retail: stockValue.retailValue || 0,
          totalUnits: stockValue.totalUnits || 0
        },
        categoryBreakdown,
        monthlyMovement: {
          stockIn: monthlyMovement.stockIn || 0,
          stockOut: monthlyMovement.stockOut || 0
        }
      }
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
