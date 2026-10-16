const express = require('express');
const router = express.Router();
const lectureController = require('../controllers/lectureController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('teacher'));

router.post('/', lectureController.createLecture);
router.get('/', lectureController.listLectures);
router.get('/:id', lectureController.getLectureById);
router.delete('/:id', lectureController.deleteLecture);

module.exports = router;
