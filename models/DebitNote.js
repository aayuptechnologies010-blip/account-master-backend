const mongoose = require('mongoose');

const debitNoteItemSchema = new mongoose.Schema(
  {
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    description: String,
    qty:         { type: Number, default: 0 },
    price:       { type: Number, default: 0 },
    amount:      { type: Number, default: 0 },
  },
  { _id: false }
);

const debitNoteSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // 'amount' = Debit Note (Amount - No Stock update)
    // 'item'   = Debit Note (Item Wise - No Stock update)
    type:           { type: String, enum: ['amount', 'item'], required: true },
    voucherNo:      { type: String },
    customerAc:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    salesmanId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Salesman' },
    salesmanName:   { type: String },
    osRefNo:        { type: String },
    date:           { type: Date, default: Date.now },
    area:           { type: String },
    gstin:          { type: String },
    creditAccounts: { type: String },
    // Used by type='item' only
    items:          [debitNoteItemSchema],
    amountR:        { type: Number, default: 0 },
    qty:            { type: Number, default: 0 },
    amountParty:    { type: Number, default: 0 },
    balance:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

debitNoteSchema.index({ userId: 1, voucherNo: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('DebitNote', debitNoteSchema);
