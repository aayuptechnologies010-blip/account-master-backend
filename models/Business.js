const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: String,
  ownerName:    String,
  phone:        String,
  email:        String,
  address:      String,
});

module.exports = mongoose.model('Business', businessSchema);
