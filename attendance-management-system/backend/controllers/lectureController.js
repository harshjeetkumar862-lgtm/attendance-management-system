const Lecture = require('../models/Lecture');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

/**
 * POST /api/lectures
 * body: { subjectId, topic }
 * A teacher can only create a lecture for a subject that belongs to them.
 */
exports.createLecture = async (req, res, next) => {
  try {
    const { subjectId, topic } = req.body;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required.' });
    }

    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    // Access control: teacher may only create lectures for their own subjects.
    if (String(subject.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: 'You can only create lectures for your own subjects.' });
    }

    const studentCount = await Student.countDocuments({ classId: subject.classId });
    const lectureNumber = (await Lecture.countDocuments({ subjectId: subject._id })) + 1;

    const lecture = await Lecture.create({
      teacherId: teacher._id,
      subjectId: subject._id,
      classId: subject.classId,
      topic: topic || '',
      lectureNumber,
      totalStudents: studentCount
    });

    return res.status(201).json({ success: true, message: 'Lecture created.', lecture });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/lectures?subjectId=
 * Teachers see only their own lectures.
 */
exports.listLectures = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const filter = { teacherId: teacher._id };
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    const lectures = await Lecture.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name code')
      .sort({ date: -1, lectureNumber: -1 });

    return res.json({ success: true, lectures });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/lectures/:id
 * Returns the lecture with its subject's student list and any saved attendance.
 */
exports.getLectureById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const lecture = await Lecture.findById(req.params.id)
      .populate('subjectId', 'name code')
      .populate('classId', 'name code');
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found.' });

    if (String(lecture.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: 'You can only view your own lectures.' });
    }

    const students = await Student.find({ classId: lecture.classId }).sort({ rollNumber: 1 });
    const attendance = await Attendance.find({ lectureId: lecture._id });
    const attMap = {};
    attendance.forEach((a) => (attMap[String(a.studentId)] = a.status));

    const roster = students.map((s) => ({
      studentId: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      studentCode: s.studentId,
      status: attMap[String(s._id)] || null
    }));

    return res.json({ success: true, lecture, roster });
  } catch (err) {
    return next(err);
  }
};

/** DELETE /api/lectures/:id — removes lecture + its attendance (own lectures only) */
exports.deleteLecture = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found.' });
    if (String(lecture.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own lectures.' });
    }

    await Attendance.deleteMany({ lectureId: lecture._id });
    await Lecture.findByIdAndDelete(lecture._id);
    return res.json({ success: true, message: 'Lecture and its attendance deleted.' });
  } catch (err) {
    return next(err);
  }
};
