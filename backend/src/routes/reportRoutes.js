const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/financial', protect, reportController.financialReport);
router.get('/collections', protect, reportController.collectionsReport);
router.get('/expenses', protect, reportController.expensesReport);
router.get('/complaints', protect, reportController.complaintsReport);
router.get('/occupancy', protect, reportController.occupancyReport);

module.exports = router;
