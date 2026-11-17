const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const complaintController = require('../controllers/complaintController');
const { protect } = require('../middleware/auth');

router.get('/', protect, complaintController.listComplaints);
router.post('/', protect, [
  body('flatNumber').notEmpty().withMessage('Flat number required'),
  body('residentName').notEmpty().withMessage('Resident name required'),
  body('category').notEmpty().withMessage('Category required'),
  body('description').notEmpty().withMessage('Description required'),
], complaintController.createComplaint);
router.get('/:id', protect, complaintController.getComplaint);
router.put('/:id', protect, complaintController.updateComplaint);
router.delete('/:id', protect, complaintController.deleteComplaint);
router.post('/:id/comments', protect, complaintController.addComment);

module.exports = router;
