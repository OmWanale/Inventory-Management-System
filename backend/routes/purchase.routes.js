const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchase);
router.get('/:id/pdf', purchaseController.downloadPurchasePDF);

router.post('/', purchaseController.createPurchase);
router.patch('/:id/payment', purchaseController.updatePurchasePayment);
router.delete('/:id', authorize('admin'), purchaseController.deletePurchase);

module.exports = router;
