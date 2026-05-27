const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: String,
  ownerName: String,
  phone: String,
  email: String,
  address: String,
});

module.exports = mongoose.model('Business', businessSchema);