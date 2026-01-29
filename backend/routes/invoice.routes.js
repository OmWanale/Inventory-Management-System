const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoice);
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

router.post('/', invoiceController.createInvoice);
router.patch('/:id/payment', invoiceController.updateInvoicePayment);
router.delete('/:id', authorize('admin'), invoiceController.deleteInvoice);

module.exports = router;
