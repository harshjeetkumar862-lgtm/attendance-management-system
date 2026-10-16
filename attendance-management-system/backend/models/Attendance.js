const mongoose = require('mongoose');

/**
 * Attendance record — the heart of the system.
 * Relation: Student + Teacher + Subject + Lecture.
 * status is intentionally limited to Present / Absent only.
 */
const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    status: { type: String, enum: ['Present', 'Absent'], required: true }
  },
  { timestamps: true }
);

// One attendance record per student per lecture.
attendanceSchema.index({ studentId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
