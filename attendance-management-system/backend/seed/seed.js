/**
 * Seed script — creates demo data so the system is immediately usable.
 *
 * Run manually:  npm run seed
 * Also invoked automatically on server start when the DB is empty.
 */
const mongoose = require('mongoose');
const Class = require('../models/Class');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance');

/** Deterministic-ish pseudo random in [0,1). */
function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function createTeacher({ teacherId, name, mobile, department, email }) {
  const user = await User.create({ name, mobile, email, role: 'teacher', teacherId });
  const teacher = await Teacher.create({ userId: user._id, teacherId, name, mobile, department, email });
  return teacher;
}

async function createStudent({ studentId, name, mobile, classId, rollNumber, semester }) {
  const user = await User.create({ name, mobile, role: 'student', studentId });
  const student = await Student.create({ userId: user._id, studentId, name, mobile, classId, rollNumber, semester });
  return student;
}

async function createSubject({ name, code, classId, teacherId }) {
  const subject = await Subject.create({ name, code, classId, teacherId });
  await Teacher.findByIdAndUpdate(teacherId, { $addToSet: { subjects: subject._id, classes: classId } });
  return subject;
}

/**
 * Create lectures + attendance for a subject.
 * Each student gets a "propensity" so percentages vary realistically.
 */
async function seedAttendance({ subject, students, lectureCount, baseSeed }) {
  // per-student attendance propensity between 0.55 and 0.97
  const propensity = {};
  students.forEach((s, i) => {
    propensity[String(s._id)] = 0.55 + rand(baseSeed + i * 7.13) * 0.42;
  });

  for (let l = 1; l <= lectureCount; l++) {
    const lecture = await Lecture.create({
      teacherId: subject.teacherId,
      subjectId: subject._id,
      classId: subject.classId,
      topic: `Lecture ${l}`,
      lectureNumber: l,
      date: new Date(Date.now() - (lectureCount - l) * 2 * 24 * 60 * 60 * 1000),
      totalStudents: students.length
    });

    const records = [];
    let present = 0;
    students.forEach((s, i) => {
      const p = propensity[String(s._id)];
      const r = rand(baseSeed + l * 3.7 + i * 1.3);
      const status = r < p ? 'Present' : 'Absent';
      if (status === 'Present') present += 1;
      records.push({
        studentId: s._id,
        teacherId: subject.teacherId,
        subjectId: subject._id,
        lectureId: lecture._id,
        classId: subject.classId,
        status
      });
    });

    await Attendance.insertMany(records);
    lecture.presentCount = present;
    lecture.absentCount = students.length - present;
    await lecture.save();
  }
}

async function seed() {
  console.log('🌱 Seeding demo data...');

  // Clean slate
  await Promise.all([
    Class.deleteMany({}),
    User.deleteMany({}),
    Teacher.deleteMany({}),
    Student.deleteMany({}),
    Subject.deleteMany({}),
    Lecture.deleteMany({}),
    Attendance.deleteMany({})
  ]);

  /* --------------------------- Class 1: BCA 3rd Sem --------------------------- */
  const bca3 = await Class.create({
    name: 'BCA 3rd Semester',
    code: 'BCA-3',
    department: 'Computer Applications',
    semester: '3rd'
  });

  const teachersData = [
    { teacherId: 'TCH001', name: 'Mr. Rajesh Sharma', mobile: '9000000001', department: 'Computer Applications', email: 'rajesh.sharma@college.edu' },
    { teacherId: 'TCH002', name: 'Ms. Priya Verma', mobile: '9000000002', department: 'Computer Applications', email: 'priya.verma@college.edu' },
    { teacherId: 'TCH003', name: 'Mr. Anil Kumar', mobile: '9000000003', department: 'Computer Applications', email: 'anil.kumar@college.edu' },
    { teacherId: 'TCH004', name: 'Mrs. Sunita Rao', mobile: '9000000004', department: 'Computer Applications', email: 'sunita.rao@college.edu' },
    { teacherId: 'TCH005', name: 'Mr. Vikas Gupta', mobile: '9000000005', department: 'Computer Applications', email: 'vikas.gupta@college.edu' }
  ];
  const teachers = [];
  for (const t of teachersData) teachers.push(await createTeacher(t));

  const studentsData = [
    { studentId: 'STU001', name: 'Rahul Kumar', mobile: '9000000101', rollNumber: '101' },
    { studentId: 'STU002', name: 'Amit Kumar', mobile: '9000000102', rollNumber: '102' },
    { studentId: 'STU003', name: 'Rohit Kumar', mobile: '9000000103', rollNumber: '103' },
    { studentId: 'STU004', name: 'Ankit Kumar', mobile: '9000000104', rollNumber: '104' },
    { studentId: 'STU005', name: 'Suresh Kumar', mobile: '9000000105', rollNumber: '105' },
    { studentId: 'STU006', name: 'Neha Singh', mobile: '9000000106', rollNumber: '106' },
    { studentId: 'STU007', name: 'Pooja Yadav', mobile: '9000000107', rollNumber: '107' },
    { studentId: 'STU008', name: 'Sneha Mishra', mobile: '9000000108', rollNumber: '108' },
    { studentId: 'STU009', name: 'Deepak Verma', mobile: '9000000109', rollNumber: '109' },
    { studentId: 'STU010', name: 'Kavita Sharma', mobile: '9000000110', rollNumber: '110' }
  ];
  const students = [];
  for (const s of studentsData) {
    students.push(await createStudent({ ...s, classId: bca3._id, semester: '3rd' }));
  }

  const subjectsData = [
    { name: 'Java Programming', code: 'BCA301', teacher: teachers[0] },
    { name: 'DBMS', code: 'BCA302', teacher: teachers[1] },
    { name: 'Operating System', code: 'BCA303', teacher: teachers[2] },
    { name: 'Computer Network', code: 'BCA304', teacher: teachers[3] },
    { name: 'Web Development', code: 'BCA305', teacher: teachers[4] }
  ];
  const subjects = [];
  for (let i = 0; i < subjectsData.length; i++) {
    const sd = subjectsData[i];
    const subject = await createSubject({ name: sd.name, code: sd.code, classId: bca3._id, teacherId: sd.teacher._id });
    subjects.push(subject);
    await seedAttendance({ subject, students, lectureCount: 10, baseSeed: 11 + i * 5 });
  }

  /* --------------------------- Class 2: BCA 5th Sem --------------------------- */
  const bca5 = await Class.create({
    name: 'BCA 5th Semester',
    code: 'BCA-5',
    department: 'Computer Applications',
    semester: '5th'
  });

  const t6 = await createTeacher({ teacherId: 'TCH006', name: 'Dr. Meena Joshi', mobile: '9000000006', department: 'Computer Applications', email: 'meena.joshi@college.edu' });
  const t7 = await createTeacher({ teacherId: 'TCH007', name: 'Mr. Sanjay Patel', mobile: '9000000007', department: 'Computer Applications', email: 'sanjay.patel@college.edu' });

  const students5 = [];
  const s5Data = [
    { studentId: 'STU101', name: 'Arjun Nair', mobile: '9000000201', rollNumber: '501' },
    { studentId: 'STU102', name: 'Divya Menon', mobile: '9000000202', rollNumber: '502' },
    { studentId: 'STU103', name: 'Karan Malhotra', mobile: '9000000203', rollNumber: '503' },
    { studentId: 'STU104', name: 'Riya Kapoor', mobile: '9000000204', rollNumber: '504' },
    { studentId: 'STU105', name: 'Vivek Reddy', mobile: '9000000205', rollNumber: '505' }
  ];
  for (const s of s5Data) students5.push(await createStudent({ ...s, classId: bca5._id, semester: '5th' }));

  const sub5 = [
    { name: 'Software Engineering', code: 'BCA501', teacher: t6 },
    { name: 'Cloud Computing', code: 'BCA502', teacher: t7 }
  ];
  for (let i = 0; i < sub5.length; i++) {
    const subject = await createSubject({ name: sub5[i].name, code: sub5[i].code, classId: bca5._id, teacherId: sub5[i].teacher._id });
    await seedAttendance({ subject, students: students5, lectureCount: 8, baseSeed: 71 + i * 9 });
  }

  console.log('✅ Seed complete.');
  console.log('   Classes: BCA-3, BCA-5');
  console.log('   Teachers: TCH001..TCH007 (mobiles 9000000001..9000000007)');
  console.log('   Students: STU001..STU010 (BCA-3), STU101..STU105 (BCA-5)');
  console.log('   Demo login → Teacher: TCH001 / 9000000001  |  Student: 9000000101');
}

/** Called on server boot — only seeds when the DB has no classes yet. */
async function autoSeedIfEmpty() {
  const count = await Class.countDocuments();
  if (count === 0) {
    await seed();
  } else {
    console.log('ℹ️  Data already present — skipping auto-seed.');
  }
}

module.exports = { seed, autoSeedIfEmpty };

// Run directly
if (require.main === module) {
  require('dotenv').config();
  const { connectDB, disconnectDB } = require('../config/db');
  (async () => {
    await connectDB();
    await seed();
    await disconnectDB();
    process.exit(0);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
