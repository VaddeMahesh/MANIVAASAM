const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const { protect } = require('../middleware/auth');

router.get('/', protect, bankController.getBank);
router.post('/', protect, bankController.createOrUpdate);
router.delete('/:id', protect, bankController.deleteBank);

module.exports = router;
