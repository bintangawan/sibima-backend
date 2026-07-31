const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', configController.getConfigs);
router.put('/', authorize('superadmin'), configController.updateConfigs);

module.exports = router;
