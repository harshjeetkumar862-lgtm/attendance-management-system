const mongoose = require('mongoose');

/**
 * Student profile. Linked to one User account and belongs to a single class.
 */
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    semester: { type: String, default: null, trim: true },
    rollNumber: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
