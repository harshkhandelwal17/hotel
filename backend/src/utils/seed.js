const mongoose = require('mongoose');
const dotenv = require('dotenv');
const env = require('../config/env');
const connectDB = require('../config/db');

const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Bed = require('../models/Bed');

dotenv.config({ path: '../../.env' }); // Ensure env is loaded if running independently

const seedData = async () => {
  try {
    await mongoose.connect(env.mongoUri || 'mongodb://127.0.0.1:27017/hostel_management');
    
    await User.deleteMany();
    await Hostel.deleteMany();
    await Room.deleteMany();
    await Bed.deleteMany();
    
    // Create Hostels
    const hostel1 = await Hostel.create({
      name: 'Hostel A',
      address: '123 Main St, Cityville',
      contactNumber: '1234567890',
      email: 'hostela@example.com'
    });
    
    const hostel2 = await Hostel.create({
      name: 'Hostel B',
      address: '456 Side St, Cityville',
      contactNumber: '0987654321',
      email: 'hostelb@example.com'
    });

    // Create Admin and Receptionist
    await User.create([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      },
      {
        name: 'Raj',
        email: 'reception@example.com',
        password: 'password123',
        role: 'receptionist',
        assignedHostel: hostel1._id
      }
    ]);
    
    // Create Rooms and Beds for Hostel 1
    const roomA101 = await Room.create({
      roomNumber: 'A-101',
      hostel: hostel1._id,
      floor: 'Ground',
      capacity: 4,
      pricing: 600
    });
    
    await Bed.insertMany([
      { bedNumber: 'A-101-1', room: roomA101._id, hostel: hostel1._id },
      { bedNumber: 'A-101-2', room: roomA101._id, hostel: hostel1._id },
      { bedNumber: 'A-101-3', room: roomA101._id, hostel: hostel1._id },
      { bedNumber: 'A-101-4', room: roomA101._id, hostel: hostel1._id },
    ]);
    
    const roomA102 = await Room.create({
      roomNumber: 'A-102',
      hostel: hostel1._id,
      floor: 'Ground',
      capacity: 2,
      pricing: 800
    });

    await Bed.insertMany([
      { bedNumber: 'A-102-1', room: roomA102._id, hostel: hostel1._id },
      { bedNumber: 'A-102-2', room: roomA102._id, hostel: hostel1._id }
    ]);

    console.log('Data Destroyed and Seeded successfully!');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
