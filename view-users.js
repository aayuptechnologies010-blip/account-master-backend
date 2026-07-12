const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const viewUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const User = require('./models/User');
    const users = await User.find({});
    console.log('--- Current Users in DB ---');
    users.forEach(user => {
      console.log({
        _id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hasPassword: !!user.password
      });
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

viewUsers();
