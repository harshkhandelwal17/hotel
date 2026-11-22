const mongoose = require('mongoose');
const env = require('./env');

// Connection lifecycle event monitors
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] ⚠️ Disconnected from database. Attempting reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] ✅ Reconnected to database successfully.');
});
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] ❌ Connection error:', err.message);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Automatically drop the old non-sparse index if it exists on the live DB
    try {
      await conn.connection.collection('guests').dropIndex('mobileNumber_1');
    } catch (indexErr) {
      // Ignore error if index doesn't exist
    }
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
