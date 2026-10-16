const mongoose = require('mongoose');

/**
 * A single lecture (a class session) created by a teacher for one subject.
 * Attendance is marked against a lecture.
 */
const lectureSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    topic: { type: String, default: '', trim: true },
    lectureNumber: { type: Number, default: null },
    date: { type: Date, default: Date.now },
    totalStudents: { type: Number, default: 0 },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lecture', lectureSchema);
