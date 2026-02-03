const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../src/models/admin');

const initAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@catabo.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists:');
      console.log('Email: admin@catabo.com');
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create default admin
    const admin = new Admin({
      username: 'admin',
      email: 'admin@catabo.com',
      password: 'Admin123!',
      role: 'superadmin'
    });

    await admin.save();

    console.log('\n✓ Default admin created successfully!');
    console.log('\n=== Admin Credentials ===');
    console.log('Email: admin@catabo.com');
    console.log('Password: Admin123!');
    console.log('Role: superadmin');
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

initAdmin();
