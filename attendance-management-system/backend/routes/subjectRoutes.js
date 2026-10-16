const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', subjectController.listSubjects);
router.post('/', authorize('teacher'), subjectController.createSubject);

module.exports = router;
