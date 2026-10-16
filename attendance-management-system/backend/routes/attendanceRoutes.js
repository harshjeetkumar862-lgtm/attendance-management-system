const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('teacher'));

router.post('/', attendanceController.markAttendance);
router.put('/', attendanceController.updateAttendance);
router.get('/lecture/:lectureId', attendanceController.getAttendanceByLecture);
router.get('/subject/:subjectId', attendanceController.getAttendanceBySubject);

module.exports = router;
