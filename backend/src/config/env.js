require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('[env] WARNING: JWT_SECRET not set. Using insecure development default.');
  jwtSecret = 'nxhotel_dev_only_insecure_secret';
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret,
  jwtExpire: process.env.JWT_EXPIRE || '7d'
};
