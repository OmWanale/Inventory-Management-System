const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/movements', inventoryController.getInventoryMovements);
router.get('/summary', inventoryController.getInventorySummary);
router.get('/product/:productId/history', inventoryController.getProductHistory);

module.exports = router;
