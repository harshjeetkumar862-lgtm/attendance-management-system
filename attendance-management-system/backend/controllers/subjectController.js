const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');

/**
 * GET /api/subjects?classId=&teacherId=
 * Teachers only ever see their own subjects via /teachers/me/subjects,
 * but this generic endpoint supports filters for admin/class views.
 */
exports.listSubjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    const subjects = await Subject.find(filter)
      .populate('classId', 'name code')
      .populate('teacherId', 'name teacherId')
      .sort({ name: 1 });
    return res.json({ success: true, subjects });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/subjects */
exports.createSubject = async (req, res, next) => {
  try {
    const { name, code, classId, teacherId } = req.body;
    if (!name || !code || !classId || !teacherId) {
      return res.status(400).json({ success: false, message: 'name, code, classId and teacherId are required.' });
    }
    const subject = await Subject.create({ name, code, classId, teacherId });

    // Keep the teacher's assigned lists in sync.
    await Teacher.findByIdAndUpdate(teacherId, {
      $addToSet: { subjects: subject._id, classes: classId }
    });

    return res.status(201).json({ success: true, message: 'Subject created.', subject });
  } catch (err) {
    return next(err);
  }
};
