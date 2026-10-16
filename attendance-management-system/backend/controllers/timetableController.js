const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');

exports.listMine = async (req, res, next) => {
  try {
    let filter;
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.userId });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
      filter = { teacherId: teacher._id };
    } else {
      const student = await Student.findOne({ userId: req.user.userId });
      if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });
      filter = { classId: student.classId };
    }
    const entries = await Timetable.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name code semester')
      .populate('teacherId', 'name teacherId')
      .sort({ dayOfWeek: 1, startTime: 1 });
    return res.json({ success: true, entries });
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { subjectId, dayOfWeek, startTime, endTime, room } = req.body;
    if (!subjectId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'subjectId, dayOfWeek, startTime and endTime are required.' });
    }
    if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'Enter valid times and ensure end time is after start time.' });
    }
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    const subject = await Subject.findOne({ _id: subjectId, teacherId: teacher._id });
    if (!subject) return res.status(403).json({ success: false, message: 'Choose one of your assigned subjects.' });
    const conflict = await Timetable.findOne({
      teacherId: teacher._id,
      dayOfWeek: Number(dayOfWeek),
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });
    if (conflict) return res.status(409).json({ success: false, message: 'This time overlaps another timetable entry.' });
    const entry = await Timetable.create({
      teacherId: teacher._id,
      subjectId: subject._id,
      classId: subject.classId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      room
    });
    await entry.populate([
      { path: 'subjectId', select: 'name code' },
      { path: 'classId', select: 'name code semester' },
      { path: 'teacherId', select: 'name teacherId' }
    ]);
    return res.status(201).json({ success: true, entry });
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    const entry = await Timetable.findOneAndDelete({ _id: req.params.id, teacherId: teacher._id });
    if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });
    return res.json({ success: true, message: 'Timetable entry deleted.' });
  } catch (err) {
    return next(err);
  }
};

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}