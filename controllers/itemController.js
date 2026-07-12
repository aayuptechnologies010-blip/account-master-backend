const mongoose = require('mongoose');
const Item = require('../models/Item');

const generateItemCode = async (userId) => {
  const lastItem = await Item.findOne({ userId, ipmrpCd: /^ITM\d+$/ })
    .sort({ ipmrpCd: -1 })
    .select('ipmrpCd');
  let num = lastItem ? parseInt(lastItem.ipmrpCd.replace('ITM', ''), 10) + 1 : 1;

  // Skip over any codes that already exist
  for (let i = 0; i < 20; i++) {
    const code = `ITM${String(num).padStart(3, '0')}`;
    const exists = await Item.findOne({ userId, ipmrpCd: code }).select('_id');
    if (!exists) return code;
    num++;
  }
  return `ITM${String(num).padStart(3, '0')}`;
};

exports.getItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    console.error('getItems error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const threshold = req.query.threshold !== undefined
      ? parseInt(req.query.threshold, 10)
      : 10;
    if (isNaN(threshold) || threshold < 0) {
      return res.status(400).json({ success: false, message: 'Invalid threshold value' });
    }
    const items = await Item.find({ stkBal: { $lt: threshold } });
    res.json({ success: true, items });
  } catch (err) {
    console.error('getLowStockItems error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addItem = async (req, res) => {
  try {
    const ipmrpCd = req.body.ipmrpCd || (await generateItemCode(req.user.id));
    const item = new Item({ ...req.body, userId: req.user.id, ipmrpCd });
    await item.save();
    res.status(201).json({ success: true, item });
  } catch (err) {
    console.error('addItem error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }
    const {
      descript, shortCd, shortDesc, itpackCd, itCd, is0Mrp, mrp, mrpTag, mrpOrder,
      purGrRt, salnetRt, stkMarg, salGrRt, purRemark, salRemark, offOnmrp, closeMt,
      purcMarg, freeQty, gstPc, gstCess, purBxRt, salBxRt, stkBal, unit,
      iBarcode, schPc, hsnCd, claimRt, expDt, itmPhoto,
    } = req.body;
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id },
      {
        descript, shortCd, shortDesc, itpackCd, itCd, is0Mrp, mrp, mrpTag, mrpOrder,
        purGrRt, salnetRt, stkMarg, salGrRt, purRemark, salRemark, offOnmrp, closeMt,
        purcMarg, freeQty, gstPc, gstCess, purBxRt, salBxRt, stkBal, unit,
        iBarcode, schPc, hsnCd, claimRt, expDt, itmPhoto,
      },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    console.error('updateItem error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }
    const item = await Item.findOneAndDelete({ _id: req.params.id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteItem error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
