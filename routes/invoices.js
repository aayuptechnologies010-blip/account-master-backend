const router = require('express').Router();
const { getInvoices, addInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getInvoices);
router.post('/', authMiddleware, addInvoice);
router.put('/:id', authMiddleware, updateInvoice);
router.delete('/:id', authMiddleware, deleteInvoice);

module.exports = router;
