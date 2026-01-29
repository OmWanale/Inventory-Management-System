const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { upload, setUploadPath } = require('../middleware/upload.middleware');

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProduct);

// Create/Update/Delete routes
router.post('/', setUploadPath('products'), upload.single('image'), productController.createProduct);
router.put('/:id', setUploadPath('products'), upload.single('image'), productController.updateProduct);
router.patch('/:id/stock', productController.updateStock);
router.delete('/:id', authorize('admin'), productController.deleteProduct);

module.exports = router;
