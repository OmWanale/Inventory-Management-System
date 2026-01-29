const pool = require('../config/database');

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    // Get totals
    const [[productStats]] = await pool.query(
      `SELECT 
        COUNT(*) as totalProducts,
        SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END) as lowStockCount,
        SUM(quantity) as totalStock
       FROM products WHERE is_active = TRUE`
    );

    const [[vendorStats]] = await pool.query(
      `SELECT COUNT(*) as totalVendors FROM vendors WHERE status = 'active'`
    );

    const [[customerStats]] = await pool.query(
      `SELECT COUNT(*) as totalCustomers FROM customers WHERE status = 'active'`
    );

    // Current month stats
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const [[purchaseStats]] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM purchases WHERE DATE_FORMAT(purchase_date, '%Y-%m') = ?`,
      [currentMonth]
    );

    const [[salesStats]] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(amount_paid), 0) as collected
       FROM invoices WHERE DATE_FORMAT(invoice_date, '%Y-%m') = ?`,
      [currentMonth]
    );

    // Pending payments
    const [[pendingPurchases]] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM purchases WHERE payment_status != 'paid'`
    );

    const [[pendingInvoices]] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount - amount_paid), 0) as total
       FROM invoices WHERE payment_status != 'paid'`
    );

    res.json({
      success: true,
      data: {
        products: {
          total: productStats.totalProducts,
          lowStock: productStats.lowStockCount,
          totalStock: productStats.totalStock
        },
        vendors: { total: vendorStats.totalVendors },
        customers: { total: customerStats.totalCustomers },
        currentMonth: {
          purchases: { count: purchaseStats.count, total: purchaseStats.total },
          sales: { count: salesStats.count, total: salesStats.total, collected: salesStats.collected }
        },
        pending: {
          purchases: { count: pendingPurchases.count, total: pendingPurchases.total },
          invoices: { count: pendingInvoices.count, total: pendingInvoices.total }
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.id, p.name, p.sku, p.quantity, p.reorder_level, v.name as vendor_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.quantity <= p.reorder_level AND p.is_active = TRUE
       ORDER BY (p.quantity / NULLIF(p.reorder_level, 0)) ASC
       LIMIT 10`
    );

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get recent transactions
exports.getRecentTransactions = async (req, res) => {
  try {
    // Recent invoices
    const [recentInvoices] = await pool.query(
      `SELECT i.id, i.invoice_number as reference, i.total_amount as amount, 
        i.invoice_date as date, c.name as party_name, 'sale' as type
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       ORDER BY i.created_at DESC
       LIMIT 5`
    );

    // Recent purchases
    const [recentPurchases] = await pool.query(
      `SELECT p.id, p.purchase_number as reference, p.total_amount as amount, 
        p.purchase_date as date, v.name as party_name, 'purchase' as type
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       ORDER BY p.created_at DESC
       LIMIT 5`
    );

    // Merge and sort
    const transactions = [...recentInvoices, ...recentPurchases]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get monthly chart data
exports.getChartData = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    // Get monthly sales and purchases for last N months
    const [salesData] = await pool.query(
      `SELECT DATE_FORMAT(invoice_date, '%Y-%m') as month,
        COUNT(*) as count, SUM(total_amount) as total
       FROM invoices
       WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
       ORDER BY month`,
      [months]
    );

    const [purchaseData] = await pool.query(
      `SELECT DATE_FORMAT(purchase_date, '%Y-%m') as month,
        COUNT(*) as count, SUM(total_amount) as total
       FROM purchases
       WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(purchase_date, '%Y-%m')
       ORDER BY month`,
      [months]
    );

    // Generate all months in range
    const allMonths = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      allMonths.push(date.toISOString().slice(0, 7));
    }

    // Map data to all months
    const chartData = allMonths.map(month => {
      const sale = salesData.find(s => s.month === month);
      const purchase = purchaseData.find(p => p.month === month);
      return {
        month,
        sales: sale ? parseFloat(sale.total) : 0,
        purchases: purchase ? parseFloat(purchase.total) : 0
      };
    });

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get top products
exports.getTopProducts = async (req, res) => {
  try {
    const [topSelling] = await pool.query(
      `SELECT p.id, p.name, p.sku, SUM(ii.quantity) as totalSold, SUM(ii.total) as revenue
       FROM invoice_items ii
       JOIN products p ON ii.product_id = p.id
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY p.id
       ORDER BY totalSold DESC
       LIMIT 5`
    );

    res.json({ success: true, data: topSelling });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get category distribution
exports.getCategoryDistribution = async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT category, COUNT(*) as count, SUM(quantity) as totalStock
       FROM products
       WHERE is_active = TRUE AND category IS NOT NULL AND category != ''
       GROUP BY category
       ORDER BY count DESC`
    );

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get category distribution error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
