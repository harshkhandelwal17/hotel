const mongoose = require('mongoose');
const Stay = require('./backend/src/models/Stay');
const Guest = require('./backend/src/models/Guest');
require('dotenv').config({ path: './backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const guest = await Guest.findOne({ fullName: 'Rahul' });
  if (!guest) return console.log("Rahul not found");
  
  const stays = await Stay.find({ $or: [{ guest: guest._id }, { coGuests: guest._id }] })
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('room', 'roomNumber');
      
  console.log(JSON.stringify(stays, null, 2));
  process.exit(0);
}
run();
