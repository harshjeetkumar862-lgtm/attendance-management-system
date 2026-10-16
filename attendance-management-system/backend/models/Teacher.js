const mongoose = require('mongoose');

/**
 * Teacher profile. A teacher is linked to one User account and can be
 * assigned to multiple subjects (and therefore multiple classes).
 */
const teacherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    teacherId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    department: { type: String, default: null, trim: true },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);
