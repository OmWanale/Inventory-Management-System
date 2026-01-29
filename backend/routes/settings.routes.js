const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const settingsController = require('../controllers/settings.controller');

// All routes require authentication
router.use(authenticate);

// Get settings (any authenticated user)
router.get('/', settingsController.getSettings);

// Update settings (admin only)
router.put('/', authorize('admin'), settingsController.updateSettings);

module.exports = router;
