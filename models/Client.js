const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sr:           Number,
  prtCd:        { type: String },
  partyName:    { type: String, required: true },
  add1:         String,
  add2:         String,
  add3:         String,
  pinCode:      String,
  contactNo:    String,
  partyGstinNo: String,
  areaCd:       String,
  areaName:     String,
});

clientSchema.index({ userId: 1, prtCd: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', clientSchema);
