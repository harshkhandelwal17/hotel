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

    // Restore data back to the original admin (admin@example.com)
    try {
      const User = require('../models/User');
      const Hostel = require('../models/Hostel');
      
      const realAdmin = await User.findOne({ email: 'admin@example.com' });
      if (realAdmin) {
        // Assign any remaining ownerless hostels to the real admin
        await Hostel.updateMany(
          { $or: [{ owner: { $exists: false } }, { owner: null }] },
          { $set: { owner: realAdmin._id } }
        );
        
        // Revert the previous script: move properties from mahendra back to the real admin
        const mahendraAdmin = await User.findOne({ email: 'mahendragore30121999@gmail.com' });
        if (mahendraAdmin) {
          await Hostel.updateMany(
            { owner: mahendraAdmin._id },
            { $set: { owner: realAdmin._id } }
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
