const User = require('../models/User');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');

exports.verifyFirebaseToken = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, phone_number: phone } = decoded;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number not found in token' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ phone, firebaseUid: uid });
    } else {
      user.firebaseUid = uid;
    }
    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, token });
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'Firebase token expired' });
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = async (req, res) => {
  res.json({ success: true });
};
