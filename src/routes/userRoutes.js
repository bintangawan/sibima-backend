const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// All endpoints protected and restricted to superadmin (or admin for viewing)
router.use(authenticate);

router.get('/', authorize('superadmin', 'admin'), userController.getUsers);
router.get('/:id', authorize('superadmin', 'admin'), userController.getUserById);
router.post('/', authorize('superadmin'), userController.createUser);
router.put('/:id', authorize('superadmin'), userController.updateUser);
router.delete('/:id', authorize('superadmin'), userController.deleteUser);
router.post('/:id/reset-password', authorize('superadmin'), userController.resetPassword);

module.exports = router;
