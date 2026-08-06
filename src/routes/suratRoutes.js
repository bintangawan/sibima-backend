const express = require('express');
const router = express.Router();
const suratController = require('../controllers/suratController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', suratController.getSurat);
router.get('/:id/preview', suratController.getNotaTugasPreview);
router.get('/:id/pdf', suratController.downloadNotaTugasPdf);
router.put('/:id', authorize('superadmin', 'admin'), suratController.updateSuratStatus);

module.exports = router;
