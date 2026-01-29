const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/', customerController.getAllCustomers);
router.get('/list', customerController.getCustomersList);
router.get('/:id', customerController.getCustomer);
router.get('/:id/history', customerController.getCustomerHistory);

router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', authorize('admin'), customerController.deleteCustomer);

module.exports = router;
