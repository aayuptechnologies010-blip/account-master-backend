const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerAc:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    salesmanId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Salesman' },
    salesmanName: { type: String },
    voucherNo:    { type: String },
    amount:       { type: Number, required: true },
    date:         { type: Date, default: Date.now },
    notes:        { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, voucherNo: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
