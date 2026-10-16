const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate, authorize } = require('../middleware/auth');

// Public list of classes (needed by the register page).
router.get('/', classController.listClasses);

router.use(authenticate);
router.post('/', authorize('teacher'), classController.createClass);
router.get('/:id/students', authorize('teacher'), classController.getClassStudents);
router.get('/:id/subjects', authorize('teacher'), classController.getClassSubjects);

module.exports = router;
