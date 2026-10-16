const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

exports.listPendingTeachers = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'teacher', approvalStatus: 'pending' }).sort({ createdAt: 1 });
    const teachers = await Teacher.find({ userId: { $in: users.map((user) => user._id) } });
    const requests = teachers.map((teacher) => ({ ...teacher.toObject(), approvalStatus: 'pending' }));
    return res.json({ success: true, requests });
  } catch (err) {
    return next(err);
  }
};

exports.reviewTeacher = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, role: 'teacher', approvalStatus: 'pending' });
    if (!user) return res.status(404).json({ success: false, message: 'Pending teacher registration not found.' });
    const result = await updateApproval(user, req.user.userId, req.body.decision);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    return res.json({ success: true, message: `Teacher registration ${result.status}.`, approvalStatus: result.status });
  } catch (err) {
    return next(err);
  }
};

exports.listPendingStudents = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    const subjects = await Subject.find({ teacherId: teacher._id }).select('classId');
    const classIds = [...new Set(subjects.map((subject) => String(subject.classId)))];
    const students = await Student.find({ classId: { $in: classIds } })
      .populate('classId', 'name code semester')
      .sort({ createdAt: 1 });
    const users = await User.find({
      _id: { $in: students.map((student) => student.userId) },
      role: 'student',
      approvalStatus: 'pending'
    }).select('name mobile createdAt');
    const userById = new Map(users.map((user) => [String(user._id), user]));
    const requests = students.filter((student) => userById.has(String(student.userId))).map((student) => ({
      ...student.toObject(), user: userById.get(String(student.userId))
    }));
    return res.json({ success: true, requests });
  } catch (err) {
    return next(err);
  }
};

exports.reviewStudent = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    const student = await Student.findOne({ userId: req.params.userId });
    if (!student) return res.status(404).json({ success: false, message: 'Student registration not found.' });
    const teachesClass = await Subject.exists({ teacherId: teacher._id, classId: student.classId });
    if (!teachesClass) return res.status(403).json({ success: false, message: 'You cannot review students outside your classes.' });
    const user = await User.findOne({ _id: student.userId, role: 'student', approvalStatus: 'pending' });
    if (!user) return res.status(404).json({ success: false, message: 'Pending student registration not found.' });
    const result = await updateApproval(user, req.user.userId, req.body.decision);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    return res.json({ success: true, message: `Student registration ${result.status}.`, approvalStatus: result.status });
  } catch (err) {
    return next(err);
  }
};

async function updateApproval(user, reviewerId, decision) {
  if (!['approve', 'reject'].includes(decision)) return { error: 'decision must be approve or reject.' };
  user.approvalStatus = decision === 'approve' ? 'approved' : 'rejected';
  user.approvedBy = reviewerId;
  user.approvedAt = new Date();
  await user.save();
  return { status: user.approvalStatus };
}