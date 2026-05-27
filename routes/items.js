const router = require('express').Router();
const { getItems, getLowStockItems, addItem, updateItem, deleteItem } = require('../controllers/itemController');

router.get('/', getItems);
router.get('/low-stock', getLowStockItems);
router.post('/', addItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

module.exports = router;
