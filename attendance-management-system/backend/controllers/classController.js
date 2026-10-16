const Class = require('../models/Class');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

/** GET /api/classes */
exports.listClasses = async (req, res, next) => {
  try {
    const classes = await Class.find().sort({ name: 1 });
    return res.json({ success: true, classes });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/classes */
exports.createClass = async (req, res, next) => {
  try {
    const { name, code, department, semester } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'name and code are required.' });
    }
    const cls = await Class.create({ name, code, department, semester });
    return res.status(201).json({ success: true, message: 'Class created.', class: cls });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/classes/:id/students */
exports.getClassStudents = async (req, res, next) => {
  try {
    const students = await Student.find({ classId: req.params.id }).sort({ rollNumber: 1 });
    return res.json({ success: true, students });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/classes/:id/subjects */
exports.getClassSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ classId: req.params.id }).populate('teacherId', 'name teacherId');
    return res.json({ success: true, subjects });
  } catch (err) {
    return next(err);
  }
};
