const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Stay = require('./src/models/Stay');
  const stay = await Stay.findOne({ status: 'Active' });
  if (!stay) {
    console.log('No active stay found');
    process.exit(0);
  }
  
  console.log('Attempting checkout on stay', stay._id);
  
  // mock req, res
  const req = {
    params: { id: stay._id },
    body: { additionalCharges: 0, checkoutPayment: 10, paymentMethod: 'Cash' },
    user: { _id: new mongoose.Types.ObjectId() }
  };
  
  const res = {
    status: (code) => ({
      json: (data) => console.log('Response:', code, data)
    })
  };
  
  const next = (err) => console.error('Next called with err:', err);
  
  const { checkout } = require('./src/controllers/stayController');
  await checkout(req, res, next);
  
  // reset stay status
  stay.status = 'Active';
  await stay.save();
  
  process.exit(0);
}
run();
