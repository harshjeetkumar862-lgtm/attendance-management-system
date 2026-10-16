const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Student = require('../models/Student');

/** Helper: load lecture and assert the teacher owns it. */
async function loadOwnedLecture(req, res) {
  const teacher = await Teacher.findOne({ userId: req.user.userId });
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    return null;
  }
  const lecture = await Lecture.findById(req.params.lectureId || req.body.lectureId);
  if (!lecture) {
    res.status(404).json({ success: false, message: 'Lecture not found.' });
    return null;
  }
  if (String(lecture.teacherId) !== String(teacher._id)) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only manage attendance for your own subject/lecture.'
    });
    return null;
  }
  return { teacher, lecture };
}

/** Recompute cached present/absent counters on the lecture. */
async function refreshLectureCounts(lecture) {
  const records = await Attendance.find({ lectureId: lecture._id });
  lecture.presentCount = records.filter((r) => r.status === 'Present').length;
  lecture.absentCount = records.filter((r) => r.status === 'Absent').length;
  lecture.totalStudents = records.length;
  await lecture.save();
}

/**
 * POST /api/attendance   (create) and PUT /api/attendance (update)
 * body: { lectureId, records: [{ studentId, status }] }
 * status ∈ { Present, Absent }
 */
async function saveAttendance(req, res, next) {
  try {
    const owned = await loadOwnedLecture(req, res);
    if (!owned) return;
    const { teacher, lecture } = owned;

    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'records array is required.' });
    }

    // Validate statuses and that students belong to the lecture's class.
    const classStudents = await Student.find({ classId: lecture.classId }).select('_id');
    const validStudentIds = new Set(classStudents.map((s) => String(s._id)));

    for (const r of records) {
      if (!r.studentId || !['Present', 'Absent'].includes(r.status)) {
        return res.status(400).json({ success: false, message: 'Each record needs a valid studentId and status (Present/Absent).' });
      }
      if (!validStudentIds.has(String(r.studentId))) {
        return res.status(400).json({ success: false, message: `Student ${r.studentId} is not part of this class.` });
      }
    }

    // Upsert each record (idempotent — works for both create and update).
    await Promise.all(
      records.map((r) =>
        Attendance.findOneAndUpdate(
          { studentId: r.studentId, lectureId: lecture._id },
          {
            studentId: r.studentId,
            lectureId: lecture._id,
            teacherId: teacher._id,
            subjectId: lecture.subjectId,
            classId: lecture.classId,
            status: r.status
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    await refreshLectureCounts(lecture);

    return res.json({ success: true, message: 'Attendance saved successfully.', lecture });
  } catch (err) {
    return next(err);
  }
}

exports.markAttendance = saveAttendance;
exports.updateAttendance = saveAttendance;

/** GET /api/attendance/lecture/:lectureId */
exports.getAttendanceByLecture = async (req, res, next) => {
  try {
    const owned = await loadOwnedLecture(req, res);
    if (!owned) return;
    const { lecture } = owned;

    const students = await Student.find({ classId: lecture.classId }).sort({ rollNumber: 1 });
    const attendance = await Attendance.find({ lectureId: lecture._id });
    const map = {};
    attendance.forEach((a) => (map[String(a.studentId)] = a.status));

    const roster = students.map((s) => ({
      studentId: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      status: map[String(s._id)] || null
    }));

    return res.json({ success: true, lecture, roster });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/attendance/subject/:subjectId
 * Per-student totals for one subject (teacher's own subject only).
 */
exports.getAttendanceBySubject = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subject = await Subject.findById(req.params.subjectId).populate('classId', 'name code');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    if (String(subject.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: 'Access denied. Not your subject.' });
    }

    const totalLectures = await Lecture.countDocuments({ subjectId: subject._id });
    const students = await Student.find({ classId: subject.classId }).sort({ rollNumber: 1 });
    const records = await Attendance.find({ subjectId: subject._id });

    const agg = {};
    records.forEach((r) => {
      const k = String(r.studentId);
      if (!agg[k]) agg[k] = { present: 0, absent: 0 };
      if (r.status === 'Present') agg[k].present += 1;
      else agg[k].absent += 1;
    });

    const rows = students.map((s) => {
      const a = agg[String(s._id)] || { present: 0, absent: 0 };
      const total = a.present + a.absent;
      return {
        studentId: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        total,
        present: a.present,
        absent: a.absent,
        percentage: total ? Math.round((a.present / total) * 10000) / 100 : 0
      };
    });

    return res.json({ success: true, subject, totalLectures, rows });
  } catch (err) {
    return next(err);
  }
};
