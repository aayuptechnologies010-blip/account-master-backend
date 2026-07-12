const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Salesman = require('../models/Salesman');

const generateVoucherNo = async (userId) => {
  const last = await Payment.findOne({ userId, voucherNo: /^PMT\d+$/ })
    .sort({ voucherNo: -1 }).select('voucherNo');
  let num = last ? parseInt(last.voucherNo.replace('PMT', ''), 10) + 1 : 1;
  for (let i = 0; i < 20; i++) {
    const voucherNo = `PMT${String(num).padStart(4, '0')}`;
    const exists = await Payment.findOne({ userId, voucherNo }).select('_id');
    if (!exists) return voucherNo;
    num++;
  }
  return `PMT${String(num).padStart(4, '0')}`;
};

// GET /payments — optional ?clientId= / ?salesmanId= filters
exports.getPayments = async (req, res) => {
  try {
    const { clientId, salesmanId } = req.query;
    const filter = { userId: req.user.id };
    if (clientId) filter.customerAc = clientId;
    if (salesmanId) filter.salesmanId = salesmanId;

    const payments = await Payment.find(filter)
      .sort({ date: -1 })
      .populate('customerAc', 'partyName prtCd contactNo')
      .populate('salesmanId', 'name code');
    res.json({ success: true, payments });
  } catch (err) {
    console.error('getPayments error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /payments — record a cash/payment collection against a client
exports.addPayment = async (req, res) => {
  try {
    const { customerAc, salesmanId, amount, date, notes } = req.body;

    if (!customerAc || !amount) {
      return res.status(400).json({ success: false, message: 'customerAc and amount are required' });
    }

    const voucherNo = await generateVoucherNo(req.user.id);

    let salesmanName = req.body.salesmanName;
    if (salesmanId && !salesmanName) {
      const salesman = await Salesman.findOne({ _id: salesmanId, userId: req.user.id });
      if (salesman) salesmanName = salesman.name;
    }

    const payment = new Payment({
      userId: req.user.id,
      customerAc, salesmanId, salesmanName, voucherNo, amount, date, notes,
    });
    await payment.save();
    res.status(201).json({ success: true, payment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Voucher number already exists' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format: ${err.path}` });
    }
    console.error('addPayment error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deletePayment error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
