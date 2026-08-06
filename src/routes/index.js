const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const masterDataRoutes = require('./masterDataRoutes');
const configRoutes = require('./configRoutes');
const auditRoutes = require('./auditRoutes');
const pengajuanRoutes = require('./pengajuanRoutes');
const plottingRoutes = require('./plottingRoutes');
const logbookRoutes = require('./logbookRoutes');
const suratRoutes = require('./suratRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const persetujuanRoutes = require('./persetujuanRoutes');

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/master-data', masterDataRoutes);
router.use('/config', configRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/pengajuan', pengajuanRoutes);
router.use('/plotting', plottingRoutes);
router.use('/logbook', logbookRoutes);
router.use('/surat', suratRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/persetujuan', persetujuanRoutes);

// API Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SIBIMA API Core Engine v2.4 is running smoothly!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
