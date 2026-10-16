const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/mine', authorize('teacher', 'student'), timetableController.listMine);
router.post('/', authorize('teacher'), timetableController.create);
router.delete('/:id', authorize('teacher'), timetableController.remove);

module.exports = router;