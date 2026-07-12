const router      = require('express').Router();
const auth        = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  verifyFirebaseToken, logout, devLogin,
  register, login,
  forgotPassword, newPassword,
  getProfile, updateProfile,
  sendOtp, verifyOtp,
  changePassword,
} = require('../controllers/authController');
const {
  getAllUsers,
  toggleBlockUser,
  approveUser,
  rejectUser,
} = require('../controllers/adminController');

router.post('/verify-firebase', authLimiter, verifyFirebaseToken);
router.post('/logout',          logout);
router.post('/dev-login',       authLimiter, devLogin);
router.post('/register',        authLimiter, register);
router.post('/login',           authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/new-password',    authLimiter, newPassword);
router.post('/send-otp',        authLimiter, sendOtp);
router.post('/verify-otp',      authLimiter, verifyOtp);
router.get('/profile',          auth, getProfile);
router.put('/profile',          auth, updateProfile);
router.put('/change-password',  auth, changePassword);

// Users management for Business Owner
router.get('/users',                auth, getAllUsers);
router.put('/users/:id/block',      auth, toggleBlockUser);
router.put('/users/:id/approve',    auth, approveUser);
router.put('/users/:id/reject',     auth, rejectUser);

module.exports = router;
