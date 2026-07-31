const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sibimapps_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'
});

// Test database connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [Database] Berhasil terhubung ke MySQL Database:', process.env.DB_NAME || 'sibimapps_db');
    connection.release();
  } catch (error) {
    console.error('❌ [Database] Gagal terhubung ke MySQL Database:', error.message);
  }
}

testConnection();

module.exports = pool;
