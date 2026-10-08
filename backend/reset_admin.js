require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const reset = async () => {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel_management');
    console.log('Connected to DB!');
    
    // Find all superadmins
    const superadmins = await User.find({ role: 'superadmin' });
    
    if (superadmins.length > 0) {
        console.log(`Found ${superadmins.length} superadmin(s). Resetting passwords to 123456...`);
        for (let admin of superadmins) {
            admin.password = '123456';
            admin.isActive = true;
            await admin.save();
            console.log(`-> Superadmin updated: Email: ${admin.email} | Password: 123456`);
        }
    } else {
        console.log("No superadmin found! Creating a new one...");
        const newAdmin = new User({
            name: 'Super Admin',
            email: 'admin@example.com',
            role: 'superadmin',
            isActive: true,
            password: 'password' // temporary, will be overwritten
        });
        newAdmin.password = '123456';
        await newAdmin.save();
        console.log(`-> Created Superadmin: Email: admin@example.com | Password: 123456`);
    }
    
    console.log("Done! You can now login.");
    process.exit(0);
  } catch(e) {
      console.error("Error:", e);
      process.exit(1);
  }
}

reset();
