const router = require('express').Router();
const { getClients, addClient, updateClient, deleteClient } = require('../controllers/clientController');

router.get('/', getClients);
router.post('/', addClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
