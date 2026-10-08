require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedSuperAdmin = async () => {
  console.log('Starting seed process...');
  console.log('MONGO URI:', process.env.MONGO_URI);
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected.');

    const existingAdmin = await User.findOne({ role: 'superadmin' });
    if (existingAdmin) {
      console.log('Superadmin already exists:');
      console.log('Email:', existingAdmin.email);
      // We'll update the password just in case
      existingAdmin.password = 'superadmin123';
      await existingAdmin.save();
      console.log('Password reset to: superadmin123');
    } else {
      const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'superadmin@hotel.com',
        password: 'superadmin123',
        role: 'superadmin'
      });
      console.log('Superadmin created!');
      console.log('Email:', superAdmin.email);
      console.log('Password: superadmin123');
    }
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
};

seedSuperAdmin();

