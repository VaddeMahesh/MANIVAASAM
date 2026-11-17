const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const billController = require('../controllers/billController');
const { protect } = require('../middleware/auth');

router.get('/', protect, billController.listBills);
router.post('/bulk-import', protect, billController.bulkImportBills);
router.post('/generate', protect, [
  body('billingMonth').matches(/^\d{4}-\d{2}$/).withMessage('billingMonth must be YYYY-MM'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
], billController.generateBills);
router.post('/', protect, [
  body('apartmentId').notEmpty().withMessage('Apartment ID required'),
  body('flatId').notEmpty().withMessage('Flat ID required'),
  body('billingMonth').matches(/^\d{4}-\d{2}$/).withMessage('billingMonth must be YYYY-MM'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
], billController.createBill);
router.get('/:id', protect, billController.getBill);
router.put('/:id', protect, billController.updateBill);
router.delete('/:id', protect, billController.deleteBill);

module.exports = router;
