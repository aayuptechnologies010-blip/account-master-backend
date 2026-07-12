const router = require('express').Router();
const auth   = require('../middleware/auth');
const { getDashboard, getActivityFeed } = require('../controllers/dashboardController');

router.get('/', auth, getDashboard);
router.get('/activity', auth, getActivityFeed);

module.exports = router;
