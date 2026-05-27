const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  sr: Number,
  prtCd: { type: String, unique: true },
  partyName: { type: String, required: true },
  add1: String,
  add2: String,
  add3: String,
  pinCode: String,
  contactNo: String,
  partyGstinNo: String,
  areaCd: String,
  areaName: String,
});

module.exports = mongoose.model('Client', clientSchema);
