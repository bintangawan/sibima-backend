const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public endpoints
router.post('/login', authController.login);

// Protected endpoints (require JWT Bearer token)
router.get('/me', authenticate, authController.getMe);
router.put('/password', authenticate, authController.changePassword);
router.put('/profile', authenticate, upload.single('avatar'), authController.updateProfile);

module.exports = router;
