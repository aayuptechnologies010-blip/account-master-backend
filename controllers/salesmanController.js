const mongoose = require('mongoose');
const Salesman = require('../models/Salesman');
const SaleBill = require('../models/SaleBill');
const DebitNote = require('../models/DebitNote');
const Payment = require('../models/Payment');

const generateSalesmanCode = async (userId) => {
  const lastSalesman = await Salesman.findOne({ userId, code: /^SM\d+$/ })
    .sort({ code: -1 })
    .select('code');
  let num = lastSalesman ? parseInt(lastSalesman.code.replace('SM', ''), 10) + 1 : 1;

  // Skip over any codes that already exist
  for (let i = 0; i < 20; i++) {
    const code = `SM${String(num).padStart(3, '0')}`;
    const exists = await Salesman.findOne({ userId, code }).select('_id');
    if (!exists) return code;
    num++;
  }
  return `SM${String(num).padStart(3, '0')}`;
};

exports.getSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({ userId: req.user.id });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [billSalesmen, noteSalesmen] = await Promise.all([
      SaleBill.distinct('salesmanId', { userId: req.user.id, date: { $gte: startOfToday } }),
      DebitNote.distinct('salesmanId', { userId: req.user.id, date: { $gte: startOfToday } }),
    ]);
    const activeIds = new Set([...billSalesmen, ...noteSalesmen].filter(Boolean).map(String));

    const salesmenWithStatus = salesmen.map((s) => ({
      ...s.toObject(),
      activeToday: activeIds.has(String(s._id)),
    }));

    res.json({ success: true, salesmen: salesmenWithStatus });
  } catch (err) {
    console.error('getSalesmen error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /salesmen/:id/activity — today's bills + cash collected for one salesman
exports.getSalesmanActivity = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid salesman ID' });
    }
    const salesman = await Salesman.findOne({ _id: req.params.id, userId: req.user.id });
    if (!salesman) return res.status(404).json({ success: false, message: 'Salesman not found' });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [bills, payments] = await Promise.all([
      SaleBill.find({ userId: req.user.id, salesmanId: salesman._id, date: { $gte: startOfToday } })
        .sort({ date: -1 })
        .populate('customerAc', 'partyName prtCd'),
      Payment.find({ userId: req.user.id, salesmanId: salesman._id, date: { $gte: startOfToday } })
        .sort({ date: -1 })
        .populate('customerAc', 'partyName prtCd'),
    ]);

    const totalCashCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({ success: true, salesman: { _id: salesman._id, name: salesman.name, code: salesman.code }, bills, payments, totalCashCollected });
  } catch (err) {
    console.error('getSalesmanActivity error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addSalesman = async (req, res) => {
  try {
    const code = req.body.code || (await generateSalesmanCode(req.user.id));
    const salesman = new Salesman({ ...req.body, userId: req.user.id, code });
    await salesman.save();
    res.status(201).json({ success: true, salesman });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Salesman code already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('addSalesman error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateSalesman = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid salesman ID' });
    }
    const { name, code, phone, email, area } = req.body;
    const salesman = await Salesman.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, code, phone, email, area },
      { new: true }
    );
    if (!salesman) return res.status(404).json({ success: false, message: 'Salesman not found' });
    res.json({ success: true, salesman });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Salesman code already exists' });
    }
    console.error('updateSalesman error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteSalesman = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid salesman ID' });
    }
    const salesman = await Salesman.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!salesman) return res.status(404).json({ success: false, message: 'Salesman not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteSalesman error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
