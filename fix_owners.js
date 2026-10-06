const mongoose = require('mongoose');
const env = require('./backend/src/config/env');
const Hostel = require('./backend/src/models/Hostel');
const User = require('./backend/src/models/User');

mongoose.connect(env.mongoUri).then(async () => {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.log('No admin found');
    process.exit(0);
  }
  
  const result = await Hostel.updateMany(
    { $or: [{ owner: { $exists: false } }, { owner: null }] },
    { $set: { owner: admin._id } }
  );
  console.log(`Updated ${result.modifiedCount} hostels to be owned by admin ${admin.name} (${admin._id})`);
  process.exit(0);
}).catch(console.error);
