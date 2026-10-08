const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./backend/src/models/User');

dotenv.config({ path: './backend/.env' });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('DB Connected');
  // Find an admin and make them superadmin
  const admin = await User.findOne({ role: 'admin' });
  if (admin) {
    admin.role = 'superadmin';
    await admin.save();
    console.log(`User ${admin.email} is now a superadmin!`);
  } else {
    console.log('No admin found to upgrade.');
  }
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});

