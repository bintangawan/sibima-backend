require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log('🚀 SIBIMA Backend Server v2.4 started successfully!');
  console.log(`🌐 Listening on port: http://localhost:${PORT}`);
  console.log(`📂 Storage directory: d:\\sibima-apps\\backend\\storage`);
  console.log(`🛠️  Environment     : ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection Error:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception Error:', err);
});
