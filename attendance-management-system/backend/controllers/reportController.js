const ExcelJS = require('exceljs');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance');

/** Build per-student rows for a given subject. */
async function buildSubjectRows(subject) {
  const students = await Student.find({ classId: subject.classId }).sort({ rollNumber: 1 });
  const records = await Attendance.find({ subjectId: subject._id });

  const agg = {};
  records.forEach((r) => {
    const k = String(r.studentId);
    if (!agg[k]) agg[k] = { present: 0, absent: 0 };
    if (r.status === 'Present') agg[k].present += 1;
    else agg[k].absent += 1;
  });

  return students.map((s) => {
    const a = agg[String(s._id)] || { present: 0, absent: 0 };
    const total = a.present + a.absent;
    return {
      studentId: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      total,
      present: a.present,
      absent: a.absent,
      percentage: total ? Math.round((a.present / total) * 10000) / 100 : 0
    };
  });
}

/**
 * GET /api/reports/class?subjectId=
 * Teacher-only. Full class report for one of their own subjects.
 */
exports.classReport = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId is required.' });

    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subject = await Subject.findById(subjectId).populate('classId', 'name code');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    if (String(subject.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: 'Access denied. Not your subject.' });
    }

    const totalLectures = await Lecture.countDocuments({ subjectId: subject._id });
    const rows = await buildSubjectRows(subject);

    return res.json({
      success: true,
      subject: { id: subject._id, name: subject.name, code: subject.code, class: subject.classId },
      totalLectures,
      rows
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/reports/student/:studentId?subjectId=
 * - Teacher: view a student's attendance (optionally scoped to their subject).
 * - Student: may only view their own report.
 */
exports.studentReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { subjectId } = req.query;

    const student = await Student.findById(studentId).populate('classId', 'name code');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (req.user.role === 'student') {
      const self = await Student.findOne({ userId: req.user.userId });
      if (!self || String(self._id) !== String(student._id)) {
        return res.status(403).json({ success: false, message: 'You can only view your own attendance.' });
      }
    }

    const subjects = subjectId
      ? await Subject.find({ _id: subjectId, classId: student.classId })
      : await Subject.find({ classId: student.classId });

    const records = await Attendance.find({ studentId: student._id });

    const bySubject = {};
    records.forEach((r) => {
      const k = String(r.subjectId);
      if (!bySubject[k]) bySubject[k] = { total: 0, present: 0 };
      bySubject[k].total += 1;
      if (r.status === 'Present') bySubject[k].present += 1;
    });

    let overallTotal = 0;
    let overallPresent = 0;
    const subjectWise = subjects.map((s) => {
      const a = bySubject[String(s._id)] || { total: 0, present: 0 };
      overallTotal += a.total;
      overallPresent += a.present;
      return {
        subjectId: s._id,
        subject: s.name,
        code: s.code,
        totalLectures: a.total,
        present: a.present,
        absent: a.total - a.present,
        percentage: a.total ? Math.round((a.present / a.total) * 10000) / 100 : 0
      };
    });

    return res.json({
      success: true,
      student: { id: student._id, name: student.name, rollNumber: student.rollNumber, class: student.classId },
      subjectWise,
      overall: {
        totalLectures: overallTotal,
        present: overallPresent,
        absent: overallTotal - overallPresent,
        percentage: overallTotal ? Math.round((overallPresent / overallTotal) * 10000) / 100 : 0
      }
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/reports/overall
 * - Student: their own overall attendance across all subjects.
 * - Teacher: ?studentId= to view any student's overall.
 */
exports.overallReport = async (req, res, next) => {
  try {
    let student;
    if (req.user.role === 'student') {
      student = await Student.findOne({ userId: req.user.userId }).populate('classId', 'name code');
    } else {
      if (!req.query.studentId) {
        return res.status(400).json({ success: false, message: 'studentId is required for teachers.' });
      }
      student = await Student.findById(req.query.studentId).populate('classId', 'name code');
    }
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const subjects = await Subject.find({ classId: student.classId });
    const records = await Attendance.find({ studentId: student._id });

    const bySubject = {};
    records.forEach((r) => {
      const k = String(r.subjectId);
      if (!bySubject[k]) bySubject[k] = { total: 0, present: 0 };
      bySubject[k].total += 1;
      if (r.status === 'Present') bySubject[k].present += 1;
    });

    let overallTotal = 0;
    let overallPresent = 0;
    const subjectWise = subjects.map((s) => {
      const a = bySubject[String(s._id)] || { total: 0, present: 0 };
      overallTotal += a.total;
      overallPresent += a.present;
      return {
        subject: s.name,
        code: s.code,
        totalLectures: a.total,
        present: a.present,
        percentage: a.total ? Math.round((a.present / a.total) * 10000) / 100 : 0
      };
    });

    return res.json({
      success: true,
      student: { id: student._id, name: student.name, rollNumber: student.rollNumber, class: student.classId },
      subjectWise,
      overall: {
        totalLectures: overallTotal,
        present: overallPresent,
        absent: overallTotal - overallPresent,
        percentage: overallTotal ? Math.round((overallPresent / overallTotal) * 10000) / 100 : 0
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** Style helper for Excel headers. */
function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF999999' } } };
  });
}

/**
 * GET /api/reports/excel?type=class&subjectId=   (teacher)
 * GET /api/reports/excel?type=personal           (student)
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const type = req.query.type || (req.user.role === 'student' ? 'personal' : 'class');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attendance Management System';
    workbook.created = new Date();

    if (req.user.role === 'student' || type === 'personal') {
      // ----- Personal report -----
      const student = await Student.findOne({ userId: req.user.userId }).populate('classId', 'name code');
      if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

      const subjects = await Subject.find({ classId: student.classId });
      const records = await Attendance.find({ studentId: student._id });
      const bySubject = {};
      records.forEach((r) => {
        const k = String(r.subjectId);
        if (!bySubject[k]) bySubject[k] = { total: 0, present: 0 };
        bySubject[k].total += 1;
        if (r.status === 'Present') bySubject[k].present += 1;
      });

      const sheet = workbook.addWorksheet('My Attendance');
      sheet.mergeCells('A1:E1');
      sheet.getCell('A1').value = `My Attendance Report — ${student.name} (${student.rollNumber})`;
      sheet.getCell('A1').font = { bold: true, size: 14 };
      sheet.getCell('A1').alignment = { horizontal: 'center' };
      sheet.mergeCells('A2:E2');
      sheet.getCell('A2').value = `Class: ${student.classId?.name || ''}`;
      sheet.getCell('A2').alignment = { horizontal: 'center' };

      sheet.addRow([]);
      const header = sheet.addRow(['Subject', 'Code', 'Total Lectures', 'Present', 'Percentage (%)']);
      styleHeader(header);

      let overallTotal = 0;
      let overallPresent = 0;
      subjects.forEach((s) => {
        const a = bySubject[String(s._id)] || { total: 0, present: 0 };
        overallTotal += a.total;
        overallPresent += a.present;
        sheet.addRow([
          s.name,
          s.code,
          a.total,
          a.present,
          a.total ? Math.round((a.present / a.total) * 10000) / 100 : 0
        ]);
      });

      const overallRow = sheet.addRow([
        'OVERALL',
        '',
        overallTotal,
        overallPresent,
        overallTotal ? Math.round((overallPresent / overallTotal) * 10000) / 100 : 0
      ]);
      overallRow.font = { bold: true };

      sheet.columns.forEach((c) => (c.width = 20));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="My_Attendance_Report.xlsx"');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // ----- Teacher class report -----
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId is required for class reports.' });

    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found.' });

    const subject = await Subject.findById(subjectId).populate('classId', 'name code');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    if (String(subject.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: 'Access denied. Not your subject.' });
    }

    const rows = await buildSubjectRows(subject);

    const sheet = workbook.addWorksheet('Attendance Report');
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `Attendance Report — ${subject.name} (${subject.code})`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Class: ${subject.classId?.name || ''}  |  Teacher: ${teacher.name}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    const header = sheet.addRow(['Roll No', 'Student', 'Total Lectures', 'Present', 'Absent', 'Percentage (%)']);
    styleHeader(header);

    rows.forEach((r) => {
      sheet.addRow([r.rollNumber, r.name, r.total, r.present, r.absent, r.percentage]);
    });

    sheet.columns.forEach((c, i) => (c.width = i === 1 ? 24 : 16));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Attendance_Report.xlsx"');
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    return next(err);
  }
};
