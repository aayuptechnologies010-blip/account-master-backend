const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'admin') {
      // Super admin directly accesses all data — no ownerId required
      req.user = { id: decoded.id, role: 'admin', isAdmin: true };
    } else {
      // Re-check block/approval status on every request so admin actions
      // (block, reject) take effect immediately, not just on next login.
      const user = await User.findById(decoded.id).select('isBlocked status');
      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Account suspended' });
      }
      if (user.status === 'pending') {
        return res.status(403).json({ message: 'Account pending admin approval' });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({ message: 'Registration rejected' });
      }
      req.user = decoded;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
