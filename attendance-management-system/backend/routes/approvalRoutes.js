const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/organization/teachers', authorize('organization'), approvalController.listPendingTeachers);
router.patch('/organization/teachers/:userId', authorize('organization'), approvalController.reviewTeacher);
router.get('/teacher/students', authorize('teacher'), approvalController.listPendingStudents);
router.patch('/teacher/students/:userId', authorize('teacher'), approvalController.reviewStudent);

module.exports = router;