const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { generateOtp, saveOtp, verifyOtp, sendOtp } = require('../utils/otp');
const { signToken } = require('../middleware/auth');
const { verifyFirebaseIdToken } = require('../services/firebaseAuth');

const IS_DEV = (process.env.NODE_ENV || 'development') !== 'production';

/** Find a user by mobile / teacherId / studentId + role. */
const findUser = async (identifier, role) => {
  const id = String(identifier || '').trim();
  const query = { role, $or: [{ mobile: id }, { teacherId: id }, { studentId: id }] };
  return User.findOne(query);
};

const findUserByEmail = async (email, role) => {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail, role });
  if (user) return user;

  const profile = role === 'teacher'
    ? await Teacher.findOne({ email: normalizedEmail })
    : await Student.findOne({ email: normalizedEmail });
  if (!profile) return null;

  user = await User.findOne({ _id: profile.userId, role });
  return user;
};

/**
 * POST /api/auth/send-otp
 * body: { identifier, role }
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { identifier, role } = req.body;
    if (!identifier || !role) {
      return res.status(400).json({ success: false, message: 'identifier and role are required.' });
    }
    if (!['teacher', 'student', 'organization'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role must be teacher, student or organization.' });
    }

    const user = await findUser(identifier, role);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No ${role} account found for "${identifier}". Please check the ID/mobile or register.`
      });
    }
    if (user.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: user.approvalStatus === 'rejected'
          ? 'Your registration was not approved. Please contact your institution.'
          : 'Your account is awaiting approval. You can log in after it is approved.'
      });
    }

    const otp = generateOtp();
    saveOtp(`${role}:${identifier}`, otp);
    await sendOtp(user.mobile, otp);

    const payload = { success: true, message: `OTP sent to registered mobile ${maskMobile(user.mobile)}.` };
    if (IS_DEV) payload.devOtp = otp; // handy for local testing
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/verify-otp
 * body: { identifier, role, otp }
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { identifier, role, otp } = req.body;
    if (!identifier || !role || !otp) {
      return res.status(400).json({ success: false, message: 'identifier, role and otp are required.' });
    }

    const user = await findUser(identifier, role);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    if (user.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: user.approvalStatus === 'rejected'
          ? 'Your registration was not approved. Please contact your institution.'
          : 'Your account is awaiting approval. You can log in after it is approved.'
      });
    }

    const result = verifyOtp(`${role}:${identifier}`, otp);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    user.isVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const tokenPayload = {
      userId: user._id,
      role: user.role,
      approvalStatus: user.approvalStatus,
      name: user.name,
      teacherId: user.teacherId,
      studentId: user.studentId
    };
    const token = signToken(tokenPayload);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: tokenPayload
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/firebase-login
 * body: { idToken, role }
 */
exports.firebaseLogin = async (req, res, next) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken || !['teacher', 'student'].includes(role)) {
      return res.status(400).json({ success: false, message: 'idToken and a valid role are required.' });
    }

    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseIdToken(idToken);
    } catch (err) {
      if (['auth/argument-error', 'auth/id-token-expired', 'auth/invalid-id-token', 'auth/user-disabled'].includes(err.code)) {
        return res.status(401).json({ success: false, message: 'Email sign-in link is invalid or expired.' });
      }
      throw err;
    }

    if (!firebaseUser.email_verified || !firebaseUser.email) {
      return res.status(401).json({ success: false, message: 'Email sign-in link is invalid or expired.' });
    }

    const email = firebaseUser.email.trim().toLowerCase();
    const user = await findUserByEmail(email, role);
    if (!user) {
      return res.status(404).json({ success: false, message: `No ${role} account is registered with this email.` });
    }
    if (user.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: user.approvalStatus === 'rejected'
          ? 'Your registration was not approved. Please contact your institution.'
          : 'Your account is awaiting approval. You can log in after it is approved.'
      });
    }

    const emailOwner = await User.findOne({ email, _id: { $ne: user._id } });
    if (emailOwner) {
      return res.status(409).json({ success: false, message: 'This email is linked to another account.' });
    }

    user.email = email;
    user.isVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const tokenPayload = {
      userId: user._id,
      role: user.role,
      approvalStatus: user.approvalStatus,
      name: user.name,
      teacherId: user.teacherId,
      studentId: user.studentId
    };

    return res.json({
      success: true,
      message: 'Login successful.',
      token: signToken(tokenPayload),
      user: tokenPayload
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/auth/me  (protected)
 * Returns the full profile (teacher or student).
 */
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let profile = null;
    if (user.role === 'teacher') {
      profile = await Teacher.findOne({ userId: user._id })
        .populate('subjects', 'name code classId')
        .populate('classes', 'name code semester');
    } else {
      profile = await Student.findOne({ userId: user._id }).populate('classId', 'name code semester');
    }

    return res.json({ success: true, user, profile });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/register
 * Student or teacher self-registration; all registrations require approval.
 * body: { role, name, mobile, studentId, teacherId, classId, rollNumber, department, email }
 */
exports.register = async (req, res, next) => {
  try {
    const { role = 'student', name, mobile, studentId, teacherId, classId, rollNumber, semester, department, email } = req.body;
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role must be student or teacher.' });
    }
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!name || !mobile || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || (role === 'student' && (!classId || !rollNumber))) {
      return res.status(400).json({ success: false, message: 'Please provide all required registration details.' });
    }
    if (role === 'teacher' && !department) {
      return res.status(400).json({ success: false, message: 'department is required for teacher registration.' });
    }

    const existing = await User.findOne({ mobile });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this mobile already exists. Please login.' });
    }
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists. Please login.' });
    }
    const matchingProfile = await Promise.all([
      Teacher.findOne({ email: normalizedEmail }),
      Student.findOne({ email: normalizedEmail })
    ]);
    if (matchingProfile.some(Boolean)) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists. Please login.' });
    }

    const accountId = role === 'student'
      ? studentId || `STU${Date.now().toString().slice(-6)}`
      : teacherId || `TCH${Date.now().toString().slice(-6)}`;
    const idField = role === 'student' ? 'studentId' : 'teacherId';
    if (await User.findOne({ [idField]: accountId })) {
      return res.status(409).json({ success: false, message: `${idField} is already in use.` });
    }

    let cls = null;
    if (role === 'student') {
      cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ success: false, message: 'Selected class not found.' });
    }

    const user = await User.create({ name, mobile, email: normalizedEmail, role, approvalStatus: 'pending', [idField]: accountId });
    const profile = role === 'student'
      ? await Student.create({
        userId: user._id,
        studentId: accountId,
        name,
        mobile,
        email: normalizedEmail,
        classId,
        rollNumber,
        semester: semester || cls.semester
      })
      : await Teacher.create({ userId: user._id, teacherId: accountId, name, mobile, email: normalizedEmail, department });

    return res.status(201).json({
      success: true,
      message: role === 'student'
        ? 'Registration submitted. A teacher must approve your account before login.'
        : 'Registration submitted. The organization must approve your account before login.',
      approvalStatus: user.approvalStatus,
      [role]: profile
    });
  } catch (err) {
    return next(err);
  }
};

function maskMobile(m) {
  const s = String(m || '');
  if (s.length < 4) return '****';
  return s.slice(0, 2) + '****' + s.slice(-2);
}
