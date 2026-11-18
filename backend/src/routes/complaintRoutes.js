const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const complaintController = require('../controllers/complaintController');
const { protect, adminOnly } = require('../middleware/auth');

// Admin-only. Residents use /api/resident/my-complaints and /api/resident/complaints instead.
router.use(protect, adminOnly);

router.get('/', complaintController.listComplaints);
router.post('/', [
  body('flatNumber').notEmpty().withMessage('Flat number required'),
  body('residentName').notEmpty().withMessage('Resident name required'),
  body('category').notEmpty().withMessage('Category required'),
  body('description').notEmpty().withMessage('Description required'),
], complaintController.createComplaint);
router.get('/:id', complaintController.getComplaint);
router.put('/:id', complaintController.updateComplaint);
router.delete('/:id', complaintController.deleteComplaint);
router.post('/:id/comments', complaintController.addComment);

module.exports = router;
