require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');

// Connect to Database
connectDB();

const PORT = env.port || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in ${env.nodeEnv} mode on port ${PORT}`);
});
