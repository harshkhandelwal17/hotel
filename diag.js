const mongoose = require('mongoose');
const env = require('./backend/src/config/env');
const User = require('./backend/src/models/User');
const Hostel = require('./backend/src/models/Hostel');
const Room = require('./backend/src/models/Room');

mongoose.connect(env.mongoUri).then(async () => {
  const admin = await User.findOne({ email: 'mahendragore30121999@gmail.com' });
  console.log("Admin ID:", admin._id);
  
  const myHostels = await Hostel.find({ owner: admin._id });
  console.log("Hostels owned:", myHostels.map(h => ({ id: h._id, name: h.name })));
  
  const hostelIds = myHostels.map(h => h._id);
  
  const rooms = await Room.find({ hostel: { $in: hostelIds } });
  console.log("Rooms found:", rooms.map(r => ({ number: r.roomNumber, hostel: r.hostel })));

  process.exit(0);
});
