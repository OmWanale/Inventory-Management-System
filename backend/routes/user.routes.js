const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', authorize('admin'), userController.getAllUsers);
router.get('/audit-logs', authorize('admin'), userController.getAuditLogs);
router.post('/', authorize('admin'), userController.createUser);
router.get('/:id', authorize('admin'), userController.getUser);
router.put('/:id', authorize('admin'), userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);
router.post('/:id/reset-password', authorize('admin'), userController.resetPassword);

module.exports = router;
