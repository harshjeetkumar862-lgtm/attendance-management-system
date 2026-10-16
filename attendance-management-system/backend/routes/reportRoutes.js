const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Teachers
router.get('/class', authorize('teacher'), reportController.classReport);
router.get('/excel', reportController.exportExcel); // role-aware (teacher class / student personal)

// Students + teachers (student can only access own via controller checks)
router.get('/student/:studentId', reportController.studentReport);
router.get('/overall', reportController.overallReport);

module.exports = router;
