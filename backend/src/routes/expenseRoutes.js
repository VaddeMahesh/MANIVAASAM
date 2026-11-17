const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const expenseController = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.get('/', protect, expenseController.listExpenses);
router.get('/summary', protect, expenseController.summary);
router.post('/', protect, [
  body('apartmentId').notEmpty().withMessage('Apartment ID required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
  body('year').isInt({ min: 2000 }).withMessage('Valid year required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0')
], expenseController.createExpense);
router.get('/:id', protect, expenseController.getExpense);
router.put('/:id', protect, expenseController.updateExpense);
router.delete('/:id', protect, expenseController.deleteExpense);

module.exports = router;
