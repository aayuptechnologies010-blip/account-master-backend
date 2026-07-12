/**
 * Script to create an admin or superadmin account.
 * Usage: node create-admin.js <email> <password> [role]
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in your .env file.');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];
const role = args[2] || 'admin'; // default role is admin

if (!email || !password) {
  console.log('\n--- Account Master Admin Creation Script ---');
  console.log('Usage: node create-admin.js <email> <password> [role]');
  console.log('Allowed roles: admin, superadmin, user (Default: admin)');
  console.log('Example: node create-admin.js admin@example.com password123 superadmin\n');
  process.exit(0);
}

// Validate role
const allowedRoles = ['admin', 'superadmin', 'user'];
if (!allowedRoles.includes(role)) {
  console.error(`Error: Invalid role "${role}". Allowed roles are: ${allowedRoles.join(', ')}`);
  process.exit(1);
}

// Load User model
const User = require('./models/User');

const createAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      console.error(`Error: A user with email "${cleanEmail}" already exists in the database.`);
      process.exit(1);
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      email: cleanEmail,
      password: hashedPassword,
      role: role
    });

    await newUser.save();
    console.log(`\nSuccess! Created ${role} account:`);
    console.log(`- Email: ${cleanEmail}`);
    console.log(`- Role: ${role}\n`);

  } catch (error) {
    console.error('An error occurred during account creation:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

createAdmin();
