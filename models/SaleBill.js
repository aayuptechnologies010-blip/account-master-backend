const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    description: String,
    qty:         { type: Number, default: 0 },
    price:       { type: Number, default: 0 },
    amount:      { type: Number, default: 0 },
  },
  { _id: false }
);

const saleBillSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    voucherNo:      { type: String },
    customerAc:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    salesmanId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Salesman' },
    salesmanName:   { type: String },
    osRefNo:        { type: String },
    date:           { type: Date, default: Date.now },
    area:           { type: String },
    gstin:          { type: String },
    creditAccounts: { type: String },
    items:          [billItemSchema],
    amountR:        { type: Number, default: 0 },
    qty:            { type: Number, default: 0 },
    amountParty:    { type: Number, default: 0 },
    balance:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

saleBillSchema.index({ userId: 1, voucherNo: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('SaleBill', saleBillSchema);
