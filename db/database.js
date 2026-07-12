const mongoose = require('mongoose');

const dropStaleIndexes = async () => {
  const db = mongoose.connection.db;

  // Drop old single-field indexes that conflict with new compound indexes
  const staleIndexes = [
    { collection: 'clients',  index: 'prtCd_1' },
    { collection: 'items',    index: 'ipmrpCd_1' },
    { collection: 'salebills', index: 'voucherNo_1' },
    { collection: 'debitnotes', index: 'voucherNo_1' },
    { collection: 'salesmen', index: 'code_1' },
  ];

  for (const { collection, index } of staleIndexes) {
    try {
      await db.collection(collection).dropIndex(index);
      console.log(`Dropped stale index: ${collection}.${index}`);
    } catch (e) {
      // Index does not exist — ignore
    }
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
    await dropStaleIndexes();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
module.exports = connectDB;