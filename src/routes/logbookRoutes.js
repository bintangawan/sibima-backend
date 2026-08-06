const express = require('express');
const router = express.Router();
const logbookController = require('../controllers/logbookController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(authenticate);

router.get('/', logbookController.getLogbooks);
router.get('/bimbingan', authorize('superadmin', 'admin', 'dosen'), logbookController.getDosenBimbingan);
router.get('/mahasiswa/:mahasiswaRef', logbookController.getMahasiswaLogbook);
router.get('/:id', logbookController.getLogbookById);
router.post('/', upload.single('dokumen'), logbookController.createLogbook);
router.put('/:id/review', authorize('superadmin', 'dosen'), logbookController.reviewLogbook);

module.exports = router;
