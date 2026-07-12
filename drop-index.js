const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in your .env file.');
  process.exit(1);
}

const dropIndex = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    console.log('Fetching indexes for "users" collection...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    if (indexes.some(idx => idx.name === 'phone_1')) {
      console.log('Dropping index "phone_1"...');
      await collection.dropIndex('phone_1');
      console.log('Successfully dropped "phone_1" index.');
    } else {
      console.log('Index "phone_1" does not exist.');
    }

  } catch (error) {
    console.error('Error occurred:', error.message || error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

dropIndex();
