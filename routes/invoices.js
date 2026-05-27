const router = require('express').Router();
const { getInvoices, addInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoiceController');

router.get('/', getInvoices);
router.post('/', addInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
