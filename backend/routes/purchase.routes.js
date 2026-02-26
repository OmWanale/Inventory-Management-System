const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchase);
router.get('/:id/pdf', purchaseController.downloadPurchasePDF);
router.get('/:id/payments', purchaseController.getPayments);

router.post('/', purchaseController.createPurchase);
router.post('/:id/receive', purchaseController.markAsReceived);
router.post('/:id/record-payment', purchaseController.recordPayment);
router.patch('/:id/payment', purchaseController.updatePurchasePayment);
router.patch('/:id/order-status', purchaseController.updateOrderStatus);
router.delete('/:id', authorize('admin'), purchaseController.deletePurchase);

module.exports = router;
