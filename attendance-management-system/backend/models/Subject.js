const mongoose = require('mongoose');

/**
 * Subject taught in a class by a specific teacher.
 * This is the key relation that keeps each teacher's attendance isolated.
 */
const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true }
  },
  { timestamps: true }
);

// A subject code is unique within a class.
subjectSchema.index({ code: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
