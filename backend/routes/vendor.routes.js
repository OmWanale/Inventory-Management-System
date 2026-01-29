const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.get('/', vendorController.getAllVendors);
router.get('/list', vendorController.getVendorsList);
router.get('/:id', vendorController.getVendor);
router.get('/:id/history', vendorController.getVendorSupplyHistory);

router.post('/', vendorController.createVendor);
router.put('/:id', vendorController.updateVendor);
router.delete('/:id', authorize('admin'), vendorController.deleteVendor);

module.exports = router;
