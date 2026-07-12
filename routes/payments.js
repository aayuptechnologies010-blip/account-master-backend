const router = require('express').Router();
const { getPayments, addPayment, deletePayment } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getPayments);
router.post('/', authMiddleware, addPayment);
router.delete('/:id', authMiddleware, deletePayment);

module.exports = router;
