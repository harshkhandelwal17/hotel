require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';
const app = require('../src/app');
const mongoose = require('mongoose');
const env = require('../src/config/env');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  if (!env.mongoUri) {
    throw new Error('Please define the MONGO_URI environment variable');
  }

  const db = await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  cachedDb = db;
  return db;
}

// Vercel Serverless Handler
module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
};
