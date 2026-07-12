const mongoose = require('mongoose');

const salesmanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:   { type: String, required: true },
    code:   { type: String },
    phone:  String,
    email:  String,
    area:   String,
  },
  { timestamps: true }
);

salesmanSchema.index({ userId: 1, code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Salesman', salesmanSchema);
