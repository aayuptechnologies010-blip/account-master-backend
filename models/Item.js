const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ipmrpCd:   { type: String },
  descript:  String,
  shortCd:   String,
  shortDesc: String,
  itpackCd:  String,
  itCd:      String,
  is0Mrp:    { type: Boolean, default: false },
  mrp:       { type: Number, default: 0 },
  mrpTag:    String,
  mrpOrder:  { type: Number, default: 0 },
  purGrRt:   { type: Number, default: 0 },
  salnetRt:  { type: Number, default: 0 },
  stkMarg:   { type: Number, default: 0 },
  salGrRt:   { type: Number, default: 0 },
  purRemark: String,
  salRemark: String,
  offOnmrp:  { type: Number, default: 0 },
  closeMt:   { type: Boolean, default: false },
  purcMarg:  { type: Number, default: 0 },
  freeQty:   { type: Number, default: 0 },
  gstPc:     { type: Number, default: 0 },
  gstCess:   String,
  purBxRt:   { type: Number, default: 0 },
  salBxRt:   { type: Number, default: 0 },
  stkBal:    { type: Number, default: 0 },
  unit:      { type: String, default: 'pcs' },
  iBarcode:  String,
  schPc:     { type: Number, default: 0 },
  hsnCd:     String,
  claimRt:   { type: Number, default: 0 },
  expDt:     String,
  itmPhoto:  String,
});

itemSchema.index({ userId: 1, ipmrpCd: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Item', itemSchema);
