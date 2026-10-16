const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

/** GET /api/students/me */
exports.getProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId }).populate('classId', 'name code semester');
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });
    return res.json({ success: true, student });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/students/me/attendance
 * Returns subject-wise + overall attendance for the logged-in student.
 * Overall = total present / total lectures (NOT a simple average of percentages).
 */
exports.getMyAttendance = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId }).populate('classId', 'name code semester');
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // All subjects offered in the student's class.
    const subjects = await Subject.find({ classId: student.classId._id }).populate('teacherId', 'name');

    const records = await Attendance.find({ studentId: student._id });

    // Group records by subject.
    const bySubject = {};
    records.forEach((r) => {
      const key = String(r.subjectId);
      if (!bySubject[key]) bySubject[key] = { total: 0, present: 0 };
      bySubject[key].total += 1;
      if (r.status === 'Present') bySubject[key].present += 1;
    });

    let overallTotal = 0;
    let overallPresent = 0;

    const subjectWise = subjects.map((s) => {
      const agg = bySubject[String(s._id)] || { total: 0, present: 0 };
      overallTotal += agg.total;
      overallPresent += agg.present;
      const percentage = agg.total ? Math.round((agg.present / agg.total) * 10000) / 100 : 0;
      return {
        subjectId: s._id,
        subject: s.name,
        code: s.code,
        teacher: s.teacherId ? s.teacherId.name : '—',
        totalLectures: agg.total,
        present: agg.present,
        absent: agg.total - agg.present,
        percentage
      };
    });

    const overallPercentage = overallTotal ? Math.round((overallPresent / overallTotal) * 10000) / 100 : 0;

    return res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        class: student.classId
      },
      subjectWise,
      overall: {
        totalLectures: overallTotal,
        present: overallPresent,
        absent: overallTotal - overallPresent,
        percentage: overallPercentage
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/students?classId= — list students of a class (teacher/admin) */
exports.listStudents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.classId) filter.classId = req.query.classId;
    const students = await Student.find(filter).populate('classId', 'name code').sort({ rollNumber: 1 });
    return res.json({ success: true, students });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/students/:id — single student (teacher only) */
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate('classId', 'name code semester');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, student });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/classes — list classes (used by register + teacher) */
exports.listClasses = async (req, res, next) => {
  try {
    const classes = await Class.find().sort({ name: 1 });
    return res.json({ success: true, classes });
  } catch (err) {
    return next(err);
  }
};
