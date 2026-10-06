const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Automatically drop the old non-sparse index if it exists on the live DB
    try {
      await conn.connection.collection('guests').dropIndex('mobileNumber_1');
      console.log('Successfully dropped old non-sparse mobileNumber index');
    } catch (indexErr) {
      // Ignore error if index doesn't exist
    }

    // Assign ownerless hostels to the first admin
    try {
      const User = require('../models/User');
      const Hostel = require('../models/Hostel');
      
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        const result = await Hostel.updateMany(
          { $or: [{ owner: { $exists: false } }, { owner: null }] },
          { $set: { owner: admin._id } }
        );
        if (result.modifiedCount > 0) {
          console.log(`Migrated ${result.modifiedCount} ownerless hostels to admin ${admin._id}`);
        }
      }
    } catch (migErr) {
      console.error('Migration error:', migErr);
    }
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
