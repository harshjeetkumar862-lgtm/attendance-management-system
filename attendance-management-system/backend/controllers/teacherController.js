const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Lecture = require('../models/Lecture');
const Student = require('../models/Student');

/** GET /api/teachers/me */
exports.getProfile = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId })
      .populate('subjects', 'name code classId')
      .populate('classes', 'name code semester');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    return res.json({ success: true, teacher });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/teachers/me/subjects */
exports.getMySubjects = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subjects = await Subject.find({ teacherId: teacher._id })
      .populate('classId', 'name code semester')
      .sort({ name: 1 });
    return res.json({ success: true, subjects });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/teachers/me/classes */
exports.getMyClasses = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subjects = await Subject.find({ teacherId: teacher._id }).populate('classId', 'name code semester');
    const classMap = new Map();
    subjects.forEach((s) => {
      if (s.classId) classMap.set(String(s.classId._id), s.classId);
    });
    return res.json({ success: true, classes: Array.from(classMap.values()) });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/teachers/me/stats — dashboard summary */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subjects = await Subject.find({ teacherId: teacher._id }).populate('classId', 'name code');
    const subjectIds = subjects.map((s) => s._id);
    const classIds = [...new Set(subjects.map((s) => String(s.classId?._id)).filter(Boolean))];

    const [lectureCount, studentCount] = await Promise.all([
      Lecture.countDocuments({ teacherId: teacher._id }),
      Student.countDocuments({ classId: { $in: classIds } })
    ]);

    return res.json({
      success: true,
      stats: {
        subjects: subjects.length,
        classes: classIds.length,
        lectures: lectureCount,
        students: studentCount
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/teachers — list all teachers (for admin/class overview) */
exports.listTeachers = async (req, res, next) => {
  try {
    const teachers = await Teacher.find().populate('subjects', 'name code').sort({ name: 1 });
    return res.json({ success: true, teachers });
  } catch (err) {
    return next(err);
  }
};
