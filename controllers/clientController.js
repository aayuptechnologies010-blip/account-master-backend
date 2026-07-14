const mongoose = require('mongoose');
const Client = require('../models/Client');
const SaleBill = require('../models/SaleBill');
const DebitNote = require('../models/DebitNote');
const Payment = require('../models/Payment');

exports.getClients = async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin === true;
    const query = isAdmin ? {} : { userId: req.user.id };
    const clients = await Client.find(query).populate('userId', 'name email phone');

    // Fetch raw userIds to map populates that return null (i.e. Admin IDs)
    const rawIds = await Client.find(query).select('userId');
    const rawIdMap = new Map(rawIds.map(r => [String(r._id), String(r.userId)]));

    const Admin = require('../models/Admin');
    const admins = await Admin.find().select('name email');
    const adminMap = new Map(admins.map(a => [String(a._id), a.name || a.email]));

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      const clientsWithBalance = clients.map((c) => {
        const id = String(c._id);
        let addedBy = 'Admin';
        if (c.userId) {
          addedBy = `${c.userId.name || 'User'} (${c.userId.phone || c.userId.email || ''})`;
        } else {
          const rawUserId = rawIdMap.get(id);
          const adminName = adminMap.get(rawUserId);
          if (adminName) addedBy = `${adminName} (Admin)`;
        }
        return { ...c.toObject(), outstandingBalance: 0, addedBy };
      });
      return res.json({ success: true, clients: clientsWithBalance });
    }
    const matchStage = isAdmin ? {} : { userId: new mongoose.Types.ObjectId(req.user.id) };

    const [saleTotals, debitTotals, paymentTotals] = await Promise.all([
      SaleBill.aggregate([{ $match: matchStage }, { $group: { _id: '$customerAc', total: { $sum: '$amountR' } } }]),
      DebitNote.aggregate([{ $match: matchStage }, { $group: { _id: '$customerAc', total: { $sum: '$amountR' } } }]),
      Payment.aggregate([{ $match: matchStage }, { $group: { _id: '$customerAc', total: { $sum: '$amount' } } }]),
    ]);

    const toMap = (arr) => new Map(arr.map((x) => [String(x._id), x.total]));
    const saleMap = toMap(saleTotals), debitMap = toMap(debitTotals), paymentMap = toMap(paymentTotals);

    const clientsWithBalance = clients.map((c) => {
      const id = String(c._id);
      const outstandingBalance = (saleMap.get(id) || 0) - (debitMap.get(id) || 0) - (paymentMap.get(id) || 0);
      
      let addedBy = 'Admin';
      if (c.userId) {
        addedBy = `${c.userId.name || 'User'} (${c.userId.phone || c.userId.email || ''})`;
      } else {
        const rawUserId = rawIdMap.get(id);
        const adminName = adminMap.get(rawUserId);
        if (adminName) addedBy = `${adminName} (Admin)`;
      }

      return { ...c.toObject(), outstandingBalance, addedBy };
    });

    res.json({ success: true, clients: clientsWithBalance });
  } catch (err) {
    console.error('getClients error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /clients/:id/ledger — voucher history + running/outstanding balance
exports.getClientLedger = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const [bills, notes, payments] = await Promise.all([
      SaleBill.find({ userId: req.user.id, customerAc: client._id }).select('voucherNo date amountR'),
      DebitNote.find({ userId: req.user.id, customerAc: client._id }).select('voucherNo date amountR'),
      Payment.find({ userId: req.user.id, customerAc: client._id }).select('voucherNo date amount'),
    ]);

    const entries = [
      ...bills.map((b) => ({ type: 'sale', voucherNo: b.voucherNo, date: b.date, debit: b.amountR, credit: 0 })),
      ...notes.map((n) => ({ type: 'debit_note', voucherNo: n.voucherNo, date: n.date, debit: 0, credit: n.amountR })),
      ...payments.map((p) => ({ type: 'payment', voucherNo: p.voucherNo, date: p.date, debit: 0, credit: p.amount })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    const ledger = entries.map((e) => {
      running += e.debit - e.credit;
      return { ...e, runningBalance: running };
    });

    res.json({
      success: true,
      client: { _id: client._id, partyName: client.partyName, prtCd: client.prtCd },
      ledger,
      outstandingBalance: running,
    });
  } catch (err) {
    console.error('getClientLedger error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addClient = async (req, res) => {
  try {
    const lastClient = await Client.findOne({ userId: req.user.id }).sort({ sr: -1 }).select('sr');
    let sr = (lastClient?.sr ?? 0) + 1;

    // Skip over any sr values whose prtCd already exists (handles gaps from failed saves)
    for (let i = 0; i < 20; i++) {
      const prtCd = `RST${String(sr).padStart(3, '0')}`;
      const exists = await Client.findOne({ userId: req.user.id, prtCd }).select('_id');
      if (!exists) break;
      sr++;
    }

    const prtCd = `RST${String(sr).padStart(3, '0')}`;
    const client = new Client({ ...req.body, userId: req.user.id, sr, prtCd });
    await client.save();
    res.status(201).json({ success: true, client });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Party code already exists, please retry' });
    }
    console.error('addClient error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateClient = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }
    const { partyName, add1, add2, add3, pinCode, contactNo, partyGstinNo, areaCd, areaName } = req.body;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { partyName, add1, add2, add3, pinCode, contactNo, partyGstinNo, areaCd, areaName },
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, client });
  } catch (err) {
    console.error('updateClient error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }
    const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteClient error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
