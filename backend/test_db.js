const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Guest = require('./src/models/Guest');
  const guests = await Guest.find();
  console.log('Guests:', guests.map(g => g.fullName + ' - ' + g.mobileNumber));
  
  const search1 = await Guest.find({ fullName: /a/i });
  console.log('Search by A:', search1.length);
  
  process.exit(0);
}
run();
