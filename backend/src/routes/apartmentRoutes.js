const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, apartmentController.listApartments);
router.get('/:id', protect, apartmentController.getApartment);
router.put('/:id', protect, apartmentController.updateApartment);

module.exports = router;
