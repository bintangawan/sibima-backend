const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/summary', authorize('superadmin', 'admin'), masterDataController.getSummary);
router.get('/dosen-aktif', masterDataController.getActiveDosen);

// Fakultas
router.get('/fakultas', masterDataController.getFakultas);

// Prodi
router.get('/prodi', masterDataController.getProdi);
router.post('/prodi', authorize('superadmin'), masterDataController.createProdi);
router.put('/prodi/:id', authorize('superadmin'), masterDataController.updateProdi);
router.delete('/prodi/:id', authorize('superadmin'), masterDataController.deleteProdi);

// Tahun Ajaran
router.get('/tahun-ajaran', masterDataController.getTahunAjaran);
router.post('/tahun-ajaran', authorize('superadmin'), masterDataController.createTahunAjaran);
router.put('/tahun-ajaran/:id', authorize('superadmin'), masterDataController.updateTahunAjaran);
router.delete('/tahun-ajaran/:id', authorize('superadmin'), masterDataController.deleteTahunAjaran);

module.exports = router;
