const mongoose = require('mongoose');

const failedRecordSchema = new mongoose.Schema(
  {
    row: { type: Number, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const importLogSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resource:      { type: String, required: true },
    fileName:      { type: String },
    importedBy:    { type: String }, // email/phone of whoever ran the import
    totalRecords:  { type: Number, default: 0 },
    imported:      { type: Number, default: 0 },
    skipped:       { type: Number, default: 0 },
    failed:        { type: Number, default: 0 },
    durationMs:    { type: Number, default: 0 },
    failedRecords: [failedRecordSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImportLog', importLogSchema);
