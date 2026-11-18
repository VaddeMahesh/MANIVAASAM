const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, apartmentController.listApartments);
router.get('/:id', protect, apartmentController.getApartment);
router.put('/:id', protect, adminOnly, apartmentController.updateApartment);

module.exports = router;
