const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/sales', reportController.getSalesReport);
router.get('/purchases', reportController.getPurchaseReport);
router.get('/profit-loss', reportController.getProfitLossReport);
router.get('/stock', reportController.getStockReport);
router.get('/export', reportController.exportCSV);

module.exports = router;
