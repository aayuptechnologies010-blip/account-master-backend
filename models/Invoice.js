const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  customer_id:   Number,
  product_name:  String,
  quantity:      Number,
  price:         Number,
  total:         { type: Number, required: true },
  status:        { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
  created_at:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Invoice', invoiceSchema);
