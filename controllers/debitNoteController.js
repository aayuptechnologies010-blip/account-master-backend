const mongoose = require('mongoose');
const DebitNote = require('../models/DebitNote');
const Salesman = require('../models/Salesman');

const generateVoucherNo = async (userId, type) => {
  const prefix = type === 'amount' ? 'DNA' : 'DNI';
  const regex = new RegExp(`^${prefix}\\d+$`);
  const last = await DebitNote.findOne({ userId, type, voucherNo: regex })
    .sort({ voucherNo: -1 }).select('voucherNo');
  let num = last ? parseInt(last.voucherNo.replace(prefix, ''), 10) + 1 : 1;
  for (let i = 0; i < 20; i++) {
    const voucherNo = `${prefix}${String(num).padStart(4, '0')}`;
    const exists = await DebitNote.findOne({ userId, voucherNo }).select('_id');
    if (!exists) return voucherNo;
    num++;
  }
  return `${prefix}${String(num).padStart(4, '0')}`;
};

exports.getDebitNotes = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { userId: req.user.id };
    if (type === 'amount' || type === 'item') filter.type = type;

    const notes = await DebitNote.find(filter)
      .sort({ date: -1 })
      .populate('customerAc', 'partyName prtCd contactNo')
      .populate('salesmanId', 'name code');
    res.json({ success: true, notes });
  } catch (err) {
    console.error('getDebitNotes error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDebitNoteByVoucher = async (req, res) => {
  try {
    const note = await DebitNote.findOne({
      voucherNo: req.params.voucherNo,
      userId: req.user.id,
    })
      .populate('customerAc', 'partyName prtCd contactNo partyGstinNo areaCd areaName')
      .populate('salesmanId', 'name code')
      .populate('items.itemId', 'descript ipmrpCd mrp salnetRt stkBal gstPc hsnCd');

    if (!note) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, note });
  } catch (err) {
    console.error('getDebitNoteByVoucher error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addDebitNote = async (req, res) => {
  try {
    const {
      type, customerAc, salesmanId, osRefNo, date, area, gstin,
      creditAccounts, items, amountR, qty, amountParty, balance,
    } = req.body;

    if (!type || !['amount', 'item'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "amount" or "item"' });
    }

    const voucherNo = await generateVoucherNo(req.user.id, type);

    let salesmanName = req.body.salesmanName;
    if (salesmanId && !salesmanName) {
      const salesman = await Salesman.findOne({ _id: salesmanId, userId: req.user.id });
      if (salesman) salesmanName = salesman.name;
    }

    const note = new DebitNote({
      userId: req.user.id,
      type, voucherNo,
      customerAc, salesmanId, salesmanName, osRefNo, date, area, gstin,
      creditAccounts,
      // items only relevant for type='item'
      items: type === 'item' ? items : [],
      amountR, qty, amountParty, balance,
    });
    await note.save();
    // Debit notes do NOT update stock (by design)
    res.status(201).json({ success: true, note });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Voucher number already exists' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format: ${err.path}` });
    }
    console.error('addDebitNote error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateDebitNote = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid debit note ID' });
    }
    const {
      customerAc, salesmanId, salesmanName, osRefNo, date, area, gstin,
      creditAccounts, items, amountR, qty, amountParty, balance,
    } = req.body;
    const note = await DebitNote.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { customerAc, salesmanId, salesmanName, osRefNo, date, area, gstin,
        creditAccounts, items, amountR, qty, amountParty, balance },
      { new: true }
    );
    if (!note) return res.status(404).json({ success: false, message: 'Debit note not found' });
    res.json({ success: true, note });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format: ${err.path}` });
    }
    console.error('updateDebitNote error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteDebitNote = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid debit note ID' });
    }
    const note = await DebitNote.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ success: false, message: 'Debit note not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteDebitNote error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
