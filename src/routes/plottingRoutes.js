const express = require('express');
const router = express.Router();
const plottingController = require('../controllers/plottingController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', plottingController.getPlotting);
router.post('/', authorize('superadmin', 'admin'), plottingController.createPlotting);
router.put('/:id/acc-sidang', authorize('superadmin', 'admin', 'dosen'), plottingController.accSidang);
router.put('/:id', authorize('superadmin', 'admin'), plottingController.updatePlotting);
router.delete('/:id', authorize('superadmin', 'admin'), plottingController.deletePlotting);

module.exports = router;
