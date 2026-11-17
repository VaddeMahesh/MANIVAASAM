const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const flatController = require('../controllers/flatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, flatController.listFlats);
router.post('/', protect, [
  body('flatNumber').notEmpty().withMessage('Flat number required'),
  body('apartmentId').notEmpty().withMessage('Apartment ID required'),
  body('floorNumber').isInt({ min: 1 }).withMessage('Floor number required')
], flatController.createFlat);
router.get('/:id', protect, flatController.getFlat);
router.put('/:id', protect, flatController.updateFlat);
router.patch('/:id/status', protect, flatController.updateStatus);
router.get('/:id/share', protect, flatController.shareFlat);
router.delete('/:id', protect, flatController.deleteFlat);

module.exports = router;
