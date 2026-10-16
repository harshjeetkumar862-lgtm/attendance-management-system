const mongoose = require('mongoose');

/**
 * User — central identity record for both Teachers and Students.
 * Authentication is OTP based (mobile number / teacher id), so no password.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    role: { type: String, enum: ['teacher', 'student', 'organization'], required: true },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    teacherId: { type: String, default: null, index: true },
    studentId: { type: String, default: null, index: true },
    isVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
