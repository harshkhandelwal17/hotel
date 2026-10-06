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

    // Assign ownerless hostels to the correct admin (mahendragore30121999@gmail.com)
    try {
      const User = require('../models/User');
      const Hostel = require('../models/Hostel');
      
      const admin = await User.findOne({ email: 'mahendragore30121999@gmail.com' });
      if (admin) {
        // Assign all hostels to this admin to fix the multi-admin conflict
        const result = await Hostel.updateMany(
          { $or: [{ owner: { $exists: false } }, { owner: null }] },
          { $set: { owner: admin._id } }
        );
        
        // Also force overwrite any hostels that were accidentally given to the dummy 'admin@example.com'
        const dummyAdmin = await User.findOne({ email: 'admin@example.com' });
        if (dummyAdmin) {
          await Hostel.updateMany(
            { owner: dummyAdmin._id },
            { $set: { owner: admin._id } }
          );
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
