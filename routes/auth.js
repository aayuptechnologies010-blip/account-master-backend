const router = require('express').Router();
const { verifyFirebaseToken, logout } = require('../controllers/authController');

router.post('/verify-firebase', verifyFirebaseToken);
router.post('/logout', logout);

module.exports = router;
