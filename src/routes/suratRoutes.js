const express = require('express');
const router = express.Router();
const suratController = require('../controllers/suratController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(authenticate);

router.get('/', suratController.getSurat);
router.post('/', authorize('superadmin', 'admin'), upload.single('surat'), suratController.createSurat);
router.put('/:id', authorize('superadmin', 'admin'), suratController.updateSuratStatus);

module.exports = router;
