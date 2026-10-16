const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('teacher'));

router.get('/', teacherController.listTeachers);
router.get('/me', teacherController.getProfile);
router.get('/me/subjects', teacherController.getMySubjects);
router.get('/me/classes', teacherController.getMyClasses);
router.get('/me/stats', teacherController.getDashboardStats);

module.exports = router;
