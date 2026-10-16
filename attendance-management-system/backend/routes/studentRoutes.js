const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Student's own data
router.get('/me', authorize('student'), studentController.getProfile);
router.get('/me/attendance', authorize('student'), studentController.getMyAttendance);

// Teacher/admin views
router.get('/', authorize('teacher'), studentController.listStudents);
router.get('/:id', authorize('teacher'), studentController.getStudentById);

module.exports = router;
