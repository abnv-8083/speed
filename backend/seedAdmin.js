/**
 * Seed Admin User Script
 * Run once to create the initial admin account in MongoDB Atlas.
 *
 * Usage:
 *   node backend/seedAdmin.js
 *
 * Reads MONGODB_URI from .env (one level up).
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env, or falls back to defaults below.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('./models/User');

// Force Google DNS to resolve Atlas SRV records (bypasses ISP DNS issues)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI      = process.env.MONGODB_URI;
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@speednet.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SpeedNet@2025';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin User';

if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set in .env');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB Atlas');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`ℹ️   Admin user already exists: ${ADMIN_EMAIL}`);
      process.exit(0);
    }

    const admin = new User({
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name:     ADMIN_NAME,
    });

    await admin.save();
    console.log(`✅  Admin user created successfully`);
    console.log(`    Email:    ${ADMIN_EMAIL}`);
    console.log(`    Password: ${ADMIN_PASSWORD}`);
    console.log(`\n⚠️   Change this password after first login!`);
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  }
})();
