const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/passwordHash');
const { normalizeRoleCode } = require('../src/config/roleCatalog');

async function main() {
  const mobile = process.env.SUPERADMIN_MOBILE || process.argv[2];
  const password = process.env.SUPERADMIN_PASSWORD || process.argv[3];
  const fullName = process.env.SUPERADMIN_NAME || process.argv[4] || 'Platform Super Admin';
  const username = (process.env.SUPERADMIN_USERNAME || process.argv[5] || 'superadmin').toLowerCase();
  if (!mobile || !password) {
    console.error('Usage: node scripts/createSuperAdmin.js <mobile> <password> [fullName] [username]');
    process.exit(1);
  }
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('Missing MongoDB connection string in MONGODB_URI, MONGO_URI, or DATABASE_URL');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const passwordHash = await hashPassword(password);
  const payload = {
    username,
    fullName,
    mobile,
    mobileNumber: mobile,
    role: 'super_admin',
    isSuperAdmin: true,
    status: 'active',
    passwordHash,
    companyId: '',
    companyName: 'Platform',
  };
  const existing = await User.findOne({ $or: [{ mobile }, { mobileNumber: mobile }, { username }] });
  let user;
  if (existing) {
    Object.assign(existing, payload);
    user = await existing.save();
    console.log(`Updated super admin: ${user.username} (${user.mobile || user.mobileNumber})`);
  } else {
    user = await User.create(payload);
    console.log(`Created super admin: ${user.username} (${user.mobile || user.mobileNumber})`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
