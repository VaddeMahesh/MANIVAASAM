const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, paymentController.listPayments);
router.get('/pending-verifications', protect, paymentController.getPendingVerifications);
router.get('/defaulters', protect, paymentController.getDefaulters);
router.post('/', protect, [
  body('billId').notEmpty().withMessage('Bill ID required'),
  body('paidAmount').isFloat({ gt: 0 }).withMessage('Paid amount must be > 0'),
  body('paymentMethod').notEmpty().withMessage('Payment method required'),
], paymentController.createPayment);
router.put('/:id/verify', protect, paymentController.verifyPayment);
router.get('/:id', protect, paymentController.getPayment);
router.put('/:id', protect, paymentController.updatePayment);

module.exports = router;
