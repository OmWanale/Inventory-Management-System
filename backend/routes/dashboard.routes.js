const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/low-stock-alerts', dashboardController.getLowStockAlerts);
router.get('/recent-transactions', dashboardController.getRecentTransactions);
router.get('/chart-data', dashboardController.getChartData);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/category-distribution', dashboardController.getCategoryDistribution);

module.exports = router;
