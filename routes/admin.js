const router    = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  adminRegister,
  adminLogin,
  adminProfile,
  changePassword,
  getAllUsers,
  toggleBlockUser,
  approveUser,
  rejectUser,
  getAllBusinesses,
  getAllInvoices,
} = require('../controllers/adminController');

// Auth
router.post('/register',            authLimiter, adminRegister);
router.post('/login',               authLimiter, adminLogin);

// Protected
router.get('/profile',              adminAuth, adminProfile);
router.put('/change-password',      adminAuth, changePassword);

// Users management
router.get('/users',                adminAuth, getAllUsers);
router.put('/users/:id/block',      adminAuth, toggleBlockUser);
router.put('/users/:id/approve',    adminAuth, approveUser);
router.put('/users/:id/reject',     adminAuth, rejectUser);

// Data
router.get('/businesses',           adminAuth, getAllBusinesses);
router.get('/invoices',             adminAuth, getAllInvoices);

module.exports = router;
