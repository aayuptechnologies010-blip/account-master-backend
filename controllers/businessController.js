const Business = require('../models/Business');

exports.getBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findOne();
    res.json(business || {});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBusinessProfile = async (req, res) => {
  try {
    let business = await Business.findOne();
    if (!business) {
      business = new Business(req.body);
    } else {
      Object.assign(business, req.body);
    }
    await business.save();
    res.json({ success: true, business });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
