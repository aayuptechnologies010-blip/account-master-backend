const mongoose = require('mongoose');
const SaleBill = require('../models/SaleBill');
const Client = require('../models/Client');
const Item = require('../models/Item');
const Salesman = require('../models/Salesman');

const MENU = {
  name: 'Outward Bills Maintenance Menu',
  options: [
    { id: 1, key: 'sale_bill',         label: 'Sale Bill',                          description: 'Generate sale bill with stock update' },
    { id: 2, key: 'debit_note_amount', label: 'Debit Note (Amount - No Stock update)', description: 'Amount based debit note - No Stock update' },
    { id: 3, key: 'debit_note_item',   label: 'Debit Note (Item Wise)',              description: 'Item wise debit note - No Stock update' },
  ],
};

exports.getMenu = (req, res) => {
  res.json({ success: true, menu: MENU });
};

const generateVoucherNo = async (userId) => {
  const last = await SaleBill.findOne({ userId, voucherNo: /^SB\d+$/ })
    .sort({ voucherNo: -1 }).select('voucherNo');
  let num = last ? parseInt(last.voucherNo.replace('SB', ''), 10) + 1 : 1;
  for (let i = 0; i < 20; i++) {
    const voucherNo = `SB${String(num).padStart(4, '0')}`;
    const exists = await SaleBill.findOne({ userId, voucherNo }).select('_id');
    if (!exists) return voucherNo;
    num++;
  }
  return `SB${String(num).padStart(4, '0')}`;
};

// Returns all dropdown data needed to build a sale bill form:
// parties (clients), items, salesmen, distinct areas
exports.getFormData = async (req, res) => {
  try {
    const [clients, items, salesmen, areas] = await Promise.all([
      Client.find({ userId: req.user.id }, 'partyName prtCd contactNo partyGstinNo areaCd areaName'),
      Item.find({ userId: req.user.id }, 'descript ipmrpCd mrp salnetRt stkBal gstPc hsnCd'),
      Salesman.find({ userId: req.user.id }),
      Client.distinct('areaName', { userId: req.user.id }),
    ]);
    res.json({ success: true, clients, items, salesmen, areas: areas.filter(Boolean) });
  } catch (err) {
    console.error('getFormData error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// When a party is selected: return party details + all its previous bills + references
exports.getPartyDetails = async (req, res) => {
  try {
    const { partyId } = req.params;
    if (!mongoose.isValidObjectId(partyId)) {
      return res.status(400).json({ success: false, message: 'Invalid party ID' });
    }
    const [party, bills] = await Promise.all([
      Client.findOne({ _id: partyId, userId: req.user.id }),
      SaleBill.find({ customerAc: partyId, userId: req.user.id })
        .sort({ date: -1 })
        .populate('items.itemId', 'descript ipmrpCd mrp stkBal')
        .populate('salesmanId', 'name code'),
    ]);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    // Collect unique OS ref numbers from past bills for reference dropdown
    const references = [...new Set(bills.map((b) => b.osRefNo).filter(Boolean))];

    res.json({ success: true, party, bills, references });
  } catch (err) {
    console.error('getPartyDetails error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSaleBills = async (req, res) => {
  try {
    const bills = await SaleBill.find({ userId: req.user.id })
      .sort({ date: -1 })
      .populate('customerAc', 'partyName prtCd contactNo')
      .populate('salesmanId', 'name code');
    res.json({ success: true, bills });
  } catch (err) {
    console.error('getSaleBills error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Fetch full bill details by voucher no — includes account sub info and all references
exports.getSaleBillByVoucher = async (req, res) => {
  try {
    const bill = await SaleBill.findOne({
      voucherNo: req.params.voucherNo,
      userId: req.user.id,
    })
      .populate('customerAc', 'partyName prtCd contactNo partyGstinNo areaCd areaName')
      .populate('salesmanId', 'name code')
      .populate('items.itemId', 'descript ipmrpCd mrp salnetRt stkBal gstPc hsnCd');

    if (!bill) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, bill });
  } catch (err) {
    console.error('getSaleBillByVoucher error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addSaleBill = async (req, res) => {
  try {
    // Extract only safe fields — never trust _id, userId, or voucherNo from the client
    const {
      customerAc, salesmanId, osRefNo, date, area, gstin,
      creditAccounts, items, amountR, qty, amountParty, balance,
    } = req.body;

    const voucherNo = await generateVoucherNo(req.user.id);

    // Auto-populate salesmanName snapshot from the ref so it stays accurate at bill time
    let salesmanName = req.body.salesmanName;
    if (salesmanId && !salesmanName) {
      const salesman = await Salesman.findOne({ _id: salesmanId, userId: req.user.id });
      if (salesman) salesmanName = salesman.name;
    }

    const bill = new SaleBill({
      userId: req.user.id,
      voucherNo,
      customerAc, salesmanId, salesmanName, osRefNo, date, area, gstin,
      creditAccounts, items, amountR, qty, amountParty, balance,
    });
    await bill.save();

    // Decrement stock for each item in the sale bill
    if (items && items.length > 0) {
      const bulkOps = items
        .filter((i) => i.itemId && i.qty)
        .map((i) => ({
          updateOne: {
            filter: { _id: i.itemId, userId: req.user.id },
            update: { $inc: { stkBal: -i.qty } },
          },
        }));
      if (bulkOps.length > 0) await Item.bulkWrite(bulkOps);
    }

    res.status(201).json({ success: true, bill });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Voucher number already exists' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format: ${err.path}` });
    }
    console.error('addSaleBill error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateSaleBill = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid bill ID' });
    }
    // voucherNo and userId are immutable after creation
    const {
      customerAc, salesmanId, salesmanName, osRefNo, date, area, gstin,
      creditAccounts, items, amountR, qty, amountParty, balance,
    } = req.body;
    const bill = await SaleBill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { customerAc, salesmanId, salesmanName, osRefNo, date, area, gstin,
        creditAccounts, items, amountR, qty, amountParty, balance },
      { new: true }
    );
    if (!bill) return res.status(404).json({ success: false, message: 'Sale bill not found' });
    res.json({ success: true, bill });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format: ${err.path}` });
    }
    console.error('updateSaleBill error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteSaleBill = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid bill ID' });
    }
    const bill = await SaleBill.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!bill) return res.status(404).json({ success: false, message: 'Sale bill not found' });

    // Restore stock for each item when a sale bill is deleted
    if (bill.items && bill.items.length > 0) {
      const bulkOps = bill.items
        .filter((i) => i.itemId && i.qty)
        .map((i) => ({
          updateOne: {
            filter: { _id: i.itemId, userId: req.user.id },
            update: { $inc: { stkBal: i.qty } },
          },
        }));
      if (bulkOps.length > 0) await Item.bulkWrite(bulkOps);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('deleteSaleBill error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
