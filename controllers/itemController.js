const Item = require('../models/Item');

const generateItemCode = async () => {
  const count = await Item.countDocuments();
  return `ITM${String(count + 1).padStart(3, '0')}`;
};

exports.getItems = async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const items = await Item.find({ stkBal: { $lt: String(threshold) } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addItem = async (req, res) => {
  try {
    const ipmrpCd = req.body.ipmrpCd || (await generateItemCode());
    const item = new Item({ ...req.body, ipmrpCd });
    await item.save();
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
