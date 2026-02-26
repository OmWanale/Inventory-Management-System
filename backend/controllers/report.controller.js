const pool = require('../config/database');

// Sales Report
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, customerId, groupBy = 'day' } = req.query;

    let dateFormat, groupClause;
    switch (groupBy) {
      case 'month':
        dateFormat = '%Y-%m';
        groupClause = "DATE_FORMAT(i.invoice_date, '%Y-%m')";
        break;
      case 'week':
        dateFormat = '%Y-%u';
        groupClause = "YEARWEEK(i.invoice_date)";
        break;
      default:
        dateFormat = '%Y-%m-%d';
        groupClause = 'DATE(i.invoice_date)';
    }

    let whereClause = '1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    if (customerId) {
      whereClause += ' AND i.customer_id = ?';
      params.push(customerId);
    }

    // Summary
    const [[summary]] = await pool.query(
      `SELECT 
        COUNT(DISTINCT i.id) as totalInvoices,
        COALESCE(SUM(i.subtotal), 0) as subtotal,
        COALESCE(SUM(i.tax_amount), 0) as tax,
        COALESCE(SUM(i.discount_amount), 0) as discount,
        COALESCE(SUM(i.total_amount), 0) as totalSales,
        COALESCE(SUM(i.amount_paid), 0) as paidAmount,
        COALESCE(SUM(i.total_amount - i.amount_paid), 0) as pendingAmount
       FROM invoices i WHERE ${whereClause}`,
      params
    );

    // Time series data
    const [timeSeries] = await pool.query(
      `SELECT 
        ${groupClause} as period,
        COUNT(*) as invoices,
        SUM(i.total_amount) as sales,
        SUM(i.amount_paid) as collected
       FROM invoices i 
       WHERE ${whereClause}
       GROUP BY ${groupClause}
       ORDER BY period`,
      params
    );

    // Customer-wise breakdown
    const [customerBreakdown] = await pool.query(
      `SELECT 
        c.id, c.name,
        COUNT(*) as invoices,
        SUM(i.total_amount) as totalSales,
        SUM(i.amount_paid) as paid
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE ${whereClause}
       GROUP BY i.customer_id
       ORDER BY totalSales DESC
       LIMIT 10`,
      params
    );

    // Product-wise breakdown
    const [productBreakdown] = await pool.query(
      `SELECT 
        p.id, p.name, p.sku,
        SUM(ii.quantity) as quantity,
        SUM(ii.total) as total
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       JOIN products p ON ii.product_id = p.id
       WHERE ${whereClause}
       GROUP BY p.id
       ORDER BY total DESC
       LIMIT 10`,
      params
    );

    // Invoice list for table
    const [invoices] = await pool.query(
      `SELECT i.id, i.invoice_number, i.invoice_date, c.name as customer_name,
        i.total_amount, i.payment_status,
        (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as item_count
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE ${whereClause}
       ORDER BY i.invoice_date DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        summary,
        timeSeries,
        customerBreakdown,
        productBreakdown,
        invoices
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Purchase Report
exports.getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, vendorId, groupBy = 'day' } = req.query;

    let groupClause;
    switch (groupBy) {
      case 'month':
        groupClause = "DATE_FORMAT(p.purchase_date, '%Y-%m')";
        break;
      case 'week':
        groupClause = "YEARWEEK(p.purchase_date)";
        break;
      default:
        groupClause = 'DATE(p.purchase_date)';
    }

    let whereClause = '1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND p.purchase_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND p.purchase_date <= ?';
      params.push(endDate);
    }

    if (vendorId) {
      whereClause += ' AND p.vendor_id = ?';
      params.push(vendorId);
    }

    // Summary
    const [[summary]] = await pool.query(
      `SELECT 
        COUNT(DISTINCT p.id) as totalOrders,
        COALESCE(SUM(p.subtotal), 0) as subtotal,
        COALESCE(SUM(p.tax_amount), 0) as tax,
        COALESCE(SUM(p.total_amount), 0) as totalPurchases,
        COALESCE(SUM(p.amount_paid), 0) as paidAmount,
        COALESCE(SUM(p.total_amount - p.amount_paid), 0) as pendingAmount
       FROM purchases p WHERE ${whereClause}`,
      params
    );

    // Time series
    const [timeSeries] = await pool.query(
      `SELECT 
        ${groupClause} as period,
        COUNT(*) as purchases,
        SUM(p.total_amount) as total
       FROM purchases p 
       WHERE ${whereClause}
       GROUP BY ${groupClause}
       ORDER BY period`,
      params
    );

    // Vendor-wise breakdown
    const [vendorBreakdown] = await pool.query(
      `SELECT 
        v.id, v.name,
        COUNT(*) as purchases,
        SUM(p.total_amount) as totalAmount
       FROM purchases p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE ${whereClause}
       GROUP BY p.vendor_id
       ORDER BY totalAmount DESC
       LIMIT 10`,
      params
    );

    // Purchase list for table
    const [purchaseList] = await pool.query(
      `SELECT p.id, p.purchase_number as po_number, p.purchase_date, v.name as vendor_name,
        p.total_amount, p.amount_paid, p.payment_status as status, p.order_status,
        p.payment_due_date,
        (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count
       FROM purchases p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE ${whereClause}
       ORDER BY p.purchase_date DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        summary,
        timeSeries,
        vendorBreakdown,
        purchases: purchaseList
      }
    });
  } catch (error) {
    console.error('Get purchase report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Profit & Loss Report
exports.getProfitLossReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND date <= ?';
      params.push(endDate);
    }

    // Sales (Revenue)
    const [[sales]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM invoices WHERE ${whereClause.replace(/date/g, 'invoice_date')}`,
      params
    );

    // Cost of goods sold (based on purchase price)
    const [[cogs]] = await pool.query(
      `SELECT COALESCE(SUM(ii.quantity * p.purchase_price), 0) as total
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       JOIN products p ON ii.product_id = p.id
       WHERE ${whereClause.replace(/date/g, 'i.invoice_date')}`,
      params
    );

    // Purchases (expenses)
    const [[purchases]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM purchases WHERE ${whereClause.replace(/date/g, 'purchase_date')}`,
      params
    );

    const grossProfit = sales.total - cogs.total;
    const netProfit = sales.total - purchases.total;

    // Invoice breakdown
    const [[invoiceBreakdown]] = await pool.query(
      `SELECT 
        COUNT(*) as totalInvoices,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paidSales,
        COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as pendingSales
       FROM invoices WHERE ${whereClause.replace(/date/g, 'invoice_date')}`,
      params
    );

    // Purchase breakdown
    const [[purchaseBreakdown]] = await pool.query(
      `SELECT 
        COUNT(*) as totalPurchaseOrders,
        COALESCE(SUM(amount_paid), 0) as paidPurchases,
        COALESCE(SUM(total_amount - amount_paid), 0) as pendingPurchases
       FROM purchases WHERE ${whereClause.replace(/date/g, 'purchase_date')}`,
      params
    );

    // Monthly breakdown
    const [monthlyData] = await pool.query(
      `SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m') as month,
        SUM(total_amount) as sales
       FROM invoices
       WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
       ORDER BY month`
    );

    const [monthlyPurchases] = await pool.query(
      `SELECT 
        DATE_FORMAT(purchase_date, '%Y-%m') as month,
        SUM(total_amount) as purchases
       FROM purchases
       WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(purchase_date, '%Y-%m')
       ORDER BY month`
    );

    res.json({
      success: true,
      data: {
        totalSales: sales.total,
        totalPurchases: purchases.total,
        costOfGoodsSold: cogs.total,
        grossProfit,
        netProfit,
        grossMargin: sales.total > 0 ? ((grossProfit / sales.total) * 100).toFixed(2) : 0,
        totalInvoices: invoiceBreakdown.totalInvoices,
        paidSales: invoiceBreakdown.paidSales,
        pendingSales: invoiceBreakdown.pendingSales,
        totalPurchaseOrders: purchaseBreakdown.totalPurchaseOrders,
        paidPurchases: purchaseBreakdown.paidPurchases,
        pendingPurchases: purchaseBreakdown.pendingPurchases,
        monthlySales: monthlyData,
        monthlyPurchases
      }
    });
  } catch (error) {
    console.error('Get profit loss report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Stock Report
exports.getStockReport = async (req, res) => {
  try {
    const { category, vendor, status } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    if (vendor) {
      whereClause += ' AND p.vendor_id = ?';
      params.push(vendor);
    }

    if (status === 'low') {
      whereClause += ' AND p.quantity <= p.reorder_level';
    } else if (status === 'out') {
      whereClause += ' AND p.quantity = 0';
    }

    const [products] = await pool.query(
      `SELECT p.id, p.sku, p.name, p.category, p.quantity, p.quantity as stock_quantity, p.reorder_level,
        p.purchase_price, p.selling_price,
        (p.quantity * p.purchase_price) as costValue,
        (p.quantity * p.selling_price) as retailValue,
        v.name as vendor_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.is_active = TRUE AND ${whereClause}
       ORDER BY p.name`,
      params
    );

    // Summary
    const summary = {
      totalProducts: products.length,
      totalUnits: products.reduce((sum, p) => sum + p.quantity, 0),
      totalValue: products.reduce((sum, p) => sum + parseFloat(p.costValue || 0), 0),
      totalCostValue: products.reduce((sum, p) => sum + parseFloat(p.costValue || 0), 0),
      totalRetailValue: products.reduce((sum, p) => sum + parseFloat(p.retailValue || 0), 0),
      lowStock: products.filter(p => p.quantity <= p.reorder_level && p.quantity > 0).length,
      lowStockCount: products.filter(p => p.quantity <= p.reorder_level).length,
      outOfStock: products.filter(p => p.quantity === 0).length,
      outOfStockCount: products.filter(p => p.quantity === 0).length
    };

    res.json({
      success: true,
      data: { products, summary }
    });
  } catch (error) {
    console.error('Get stock report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Export data as CSV
exports.exportCSV = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let data, headers, filename;

    switch (type) {
      case 'sales':
        const [invoices] = await pool.query(
          `SELECT i.invoice_number, i.invoice_date, c.name as customer, 
            i.subtotal, i.tax_amount, i.discount_amount, i.total_amount, 
            i.payment_mode, i.payment_status
           FROM invoices i
           LEFT JOIN customers c ON i.customer_id = c.id
           WHERE i.invoice_date BETWEEN ? AND ?
           ORDER BY i.invoice_date`,
          [startDate || '1900-01-01', endDate || '2100-12-31']
        );
        data = invoices;
        headers = ['Invoice Number', 'Date', 'Customer', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Mode', 'Status'];
        filename = 'sales-report.csv';
        break;

      case 'purchases':
        const [purchases] = await pool.query(
          `SELECT p.purchase_number, p.purchase_date, v.name as vendor, 
            p.invoice_number, p.subtotal, p.tax_amount, p.total_amount, p.payment_status
           FROM purchases p
           JOIN vendors v ON p.vendor_id = v.id
           WHERE p.purchase_date BETWEEN ? AND ?
           ORDER BY p.purchase_date`,
          [startDate || '1900-01-01', endDate || '2100-12-31']
        );
        data = purchases;
        headers = ['PO Number', 'Date', 'Vendor', 'Invoice#', 'Subtotal', 'Tax', 'Total', 'Status'];
        filename = 'purchases-report.csv';
        break;

      case 'stock':
        const [products] = await pool.query(
          `SELECT p.sku, p.name, p.category, p.quantity, p.reorder_level, 
            p.purchase_price, p.selling_price, v.name as vendor
           FROM products p
           LEFT JOIN vendors v ON p.vendor_id = v.id
           WHERE p.is_active = TRUE
           ORDER BY p.name`
        );
        data = products;
        headers = ['SKU', 'Name', 'Category', 'Quantity', 'Reorder Level', 'Cost Price', 'Selling Price', 'Vendor'];
        filename = 'stock-report.csv';
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    // Generate CSV
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = Object.values(row).map(val => {
        if (val === null) return '';
        const str = String(val);
        return str.includes(',') ? `"${str}"` : str;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
