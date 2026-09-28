const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const Guest = require('./src/models/Guest');
  
  // Create a dummy guest
  await Guest.create({
    fullName: 'Test Search Name',
    mobileNumber: '9999999999',
    idProofType: 'Aadhaar',
    hostel: new mongoose.Types.ObjectId()
  });

  // Search by name
  const regex = new RegExp('test search', 'i');
  const results = await Guest.find({ fullName: regex });
  console.log('Results:', results.length);
  process.exit(0);
}
test();
