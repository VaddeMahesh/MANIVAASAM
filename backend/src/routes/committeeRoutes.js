const express = require('express');
const router = express.Router();
const committeeController = require('../controllers/committeeController');
const { protect } = require('../middleware/auth');

router.get('/', protect, committeeController.listMembers);
router.post('/', protect, committeeController.createMember);
router.put('/:id', protect, committeeController.updateMember);
router.delete('/:id', protect, committeeController.deleteMember);

module.exports = router;
