const router = require('express').Router();
const { getItems, getLowStockItems, addItem, updateItem, deleteItem } = require('../controllers/itemController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getItems);
router.get('/low-stock', authMiddleware, getLowStockItems);
router.post('/', authMiddleware, addItem);
router.put('/:id', authMiddleware, updateItem);
router.delete('/:id', authMiddleware, deleteItem);

module.exports = router;
