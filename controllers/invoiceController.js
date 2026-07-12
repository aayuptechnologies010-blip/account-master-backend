const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id }).sort({ created_at: -1 });
    res.json({ success: true, invoices });
  } catch (err) {
    console.error('getInvoices error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addInvoice = async (req, res) => {
  try {
    const invoice = new Invoice({ ...req.body, userId: req.user.id });
    await invoice.save();
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('addInvoice error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }
    const { customer_name, customer_id, product_name, quantity, price, total, status } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { customer_name, customer_id, product_name, quantity, price, total, status },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (err) {
    console.error('updateInvoice error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteInvoice error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
