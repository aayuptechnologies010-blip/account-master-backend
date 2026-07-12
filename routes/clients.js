const router = require('express').Router();
const { getClients, addClient, updateClient, deleteClient, getClientLedger } = require('../controllers/clientController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getClients);
router.post('/', authMiddleware, addClient);
router.put('/:id', authMiddleware, updateClient);
router.delete('/:id', authMiddleware, deleteClient);
router.get('/:id/ledger', authMiddleware, getClientLedger);

module.exports = router;
