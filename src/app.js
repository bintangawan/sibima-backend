const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// CORS configuration (allow frontend client requests)
app.use(cors({
  origin: '*', // In production, restrict to frontend domain e.g. http://localhost:5173
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static storage directory (for uploaded proposals, logbooks, surat, avatars)
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Root landing message
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'SIBIMA API Core Engine',
    version: '2.4.0',
    status: 'Running',
    documentation: '/api/v1/health'
  });
});

// API Routes mounting
app.use('/api/v1', routes);
app.use('/api', routes); // Fallback mapping for /api -> /api/v1

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan pada server SIBIMA.`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
