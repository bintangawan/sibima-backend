const express = require('express');
const router = express.Router();
const persetujuanController = require('../controllers/persetujuanController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', persetujuanController.getPersetujuan);
router.get('/:id', persetujuanController.getPersetujuanById);
router.post('/', authorize('mahasiswa'), persetujuanController.submitPersetujuan);
router.post('/:bimbinganId/acc-sempro', authorize('dosen'), persetujuanController.accSempro);
router.put('/:id/keputusan', authorize('dosen'), persetujuanController.decidePersetujuan);

module.exports = router;
