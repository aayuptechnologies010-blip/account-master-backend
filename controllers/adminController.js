const Admin    = require('../models/Admin');
const User     = require('../models/User');
const Business = require('../models/Business');
const Invoice  = require('../models/Invoice');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');

// POST /admin/register
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'email, phone aur password required hain' });
    }

    const existingEmail = await Admin.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Is email se admin already exist karta hai' });
    }

    const existingPhone = await Admin.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Is phone number se admin already exist karta hai' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ name, email, phone, password: hashedPassword });
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      admin: {
        _id:   admin._id,
        name:  admin.name,
        email: admin.email,
        phone: admin.phone,
      },
    });
  } catch (err) {
    console.error('adminRegister error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /admin/login  — email + password ya phone + password dono se login
exports.adminLogin = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ success: false, message: 'password aur email ya phone required hai' });
    }

    const query = email ? { email: email.toLowerCase().trim() } : { phone: phone.trim() };
    const admin = await Admin.findOne(query);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Credentials galat hain' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credentials galat hain' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        _id:   admin._id,
        name:  admin.name,
        email: admin.email,
        phone: admin.phone,
      },
    });
  } catch (err) {
    console.error('adminLogin error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /admin/profile  (protected)
exports.adminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, admin });
  } catch (err) {
    console.error('adminProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /admin/change-password  (protected)
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'oldPassword aur newPassword required hain' });
    }

    const admin = await Admin.findById(req.admin.id);
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Purana password galat hai' });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ success: true, message: 'Password successfully change ho gaya' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /admin/users  — sabhi users ki list
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -firebaseUid -resetOtp -resetOtpExpiry').sort({ createdAt: -1 });
    res.json({ success: true, total: users.length, users });
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /admin/users/:id/block  — user block ya unblock
exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: user.isBlocked ? 'User block ho gaya' : 'User unblock ho gaya',
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    console.error('toggleBlockUser error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /admin/users/:id/approve  — pending registration ko approve karo
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User approved', status: user.status });
  } catch (err) {
    console.error('approveUser error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /admin/users/:id/reject  — pending registration ko reject karo
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User rejected', status: user.status });
  } catch (err) {
    console.error('rejectUser error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /admin/businesses  — sabhi businesses ki list
exports.getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().populate('userId', 'phone name email isBlocked status').sort({ _id: -1 });
    res.json({ success: true, total: businesses.length, businesses });
  } catch (err) {
    console.error('getAllBusinesses error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /admin/invoices  — sabhi invoices ki list
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('userId', 'phone name email').sort({ created_at: -1 });
    res.json({ success: true, total: invoices.length, invoices });
  } catch (err) {
    console.error('getAllInvoices error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
