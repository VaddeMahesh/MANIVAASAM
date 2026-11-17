const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.get('/me', protect, adminController.getProfile);
router.put('/me', protect, adminController.updateProfile);
router.post('/surplus', protect, adminController.addSurplus);

module.exports = router;
