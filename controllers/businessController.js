const Business = require('../models/Business');

exports.createBusinessProfile = async (req, res) => {
  try {
    const existing = await Business.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Business profile already exists. Use PUT to update.' });
    }
    const { businessName, ownerName, phone, email, address } = req.body;
    if (!businessName) {
      return res.status(400).json({ success: false, message: 'businessName required hai' });
    }
    const business = new Business({ businessName, ownerName, phone, email, address, userId: req.user.id });
    await business.save();
    res.status(201).json({ success: true, business });
  } catch (err) {
    console.error('createBusinessProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user.id });
    res.json({ success: true, business: business || {} });
  } catch (err) {
    console.error('getBusinessProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateBusinessProfile = async (req, res) => {
  try {
    let business = await Business.findOne({ userId: req.user.id });
    const { businessName, ownerName, phone, email, address } = req.body;
    const allowed = { businessName, ownerName, phone, email, address };
    if (!business) {
      business = new Business({ ...allowed, userId: req.user.id });
    } else {
      Object.assign(business, allowed);
    }
    await business.save();
    res.json({ success: true, business });
  } catch (err) {
    console.error('updateBusinessProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
