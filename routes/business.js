const router = require('express').Router();
const { createBusinessProfile, getBusinessProfile, updateBusinessProfile } = require('../controllers/businessController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, createBusinessProfile);
router.get('/', authMiddleware, getBusinessProfile);
router.put('/', authMiddleware, updateBusinessProfile);

module.exports = router;
