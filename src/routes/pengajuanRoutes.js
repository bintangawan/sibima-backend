const express = require('express');
const router = express.Router();
const pengajuanController = require('../controllers/pengajuanController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(authenticate);

router.get('/', pengajuanController.getPengajuan);
router.post('/', upload.single('proposal'), pengajuanController.createPengajuan);
router.put('/:id/verify', authorize('superadmin', 'admin'), pengajuanController.verifyPengajuan);
router.delete('/:id', pengajuanController.cancelPengajuan);

module.exports = router;
