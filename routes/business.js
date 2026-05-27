const router = require('express').Router();
const { getBusinessProfile, updateBusinessProfile } = require('../controllers/businessController');

router.get('/', getBusinessProfile);
router.put('/', updateBusinessProfile);

module.exports = router;
