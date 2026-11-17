const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { protect } = require('../middleware/auth');

router.get('/my-flat', protect, residentController.getMyFlat);
router.get('/my-bills', protect, residentController.getMyBills);
router.get('/my-payments', protect, residentController.getMyPayments);
router.post('/submit-payment', protect, residentController.submitPayment);

module.exports = router;
