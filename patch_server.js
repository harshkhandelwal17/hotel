const fs = require('fs');
const content = `require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');

const PORT = env.port || 5000;

// Connect to Database first, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(\`Server is running in \${env.nodeEnv} mode on port \${PORT}\`);
  });
}).catch(err => {
  console.error("Failed to start server due to DB connection error", err);
});
`;
fs.writeFileSync('backend/server.js', content);
