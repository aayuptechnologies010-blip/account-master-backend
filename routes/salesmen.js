const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/salesmanController');

router.get('/', auth, ctrl.getSalesmen);
router.post('/', auth, ctrl.addSalesman);
router.put('/:id', auth, ctrl.updateSalesman);
router.delete('/:id', auth, ctrl.deleteSalesman);
router.get('/:id/activity', auth, ctrl.getSalesmanActivity);

module.exports = router;
