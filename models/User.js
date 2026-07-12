const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    default: null,
  },
  name:             { type: String, default: null },
  resetOtp:         { type: String, default: null },
  resetOtpExpiry:   { type: Date,   default: null },
  loginOtp:         { type: String, default: null },
  loginOtpExpiry:   { type: Date,   default: null },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },
  isBlocked: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);