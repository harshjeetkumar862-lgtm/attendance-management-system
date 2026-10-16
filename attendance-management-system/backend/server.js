require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const lectureRoutes = require('./routes/lectureRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const timetableRoutes = require('./routes/timetableRoutes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

/* ----------------------------- Middleware ------------------------------ */
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin) || (!isProduction && allowedOrigins.size === 0));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if ((process.env.NODE_ENV || 'development') !== 'test') {
  app.use(morgan('dev'));
}

/* ------------------------------- API ----------------------------------- */
app.get('/api/health', (req, res) =>
  res.json({ success: true, status: 'ok', service: 'Attendance Management System API', time: new Date() })
);

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/timetable', timetableRoutes);

/* --------------------------- Frontend (static) -------------------------- */
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Fallback: serve home page for unknown non-API routes.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

/* ---------------------------- Error handling ---------------------------- */
app.use('/api', notFound);
app.use(errorHandler);

/* ------------------------------- Boot ----------------------------------- */
const PORT = process.env.PORT || 5000;

function validateProductionConfig() {
  if (!isProduction) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured in production.');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production.');
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be configured in production.');
  }
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('missing service-account fields');
    }
  } catch (err) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is invalid: ${err.message}`);
  }
}

async function start() {
  validateProductionConfig();
  await connectDB();

  // Auto-seed demo data on first run (only if DB is empty).
  try {
    const { autoSeedIfEmpty } = require('./seed/seed');
    await autoSeedIfEmpty();
    const User = require('./models/User');
    const organizationMobile = process.env.ORG_ADMIN_MOBILE || (process.env.NODE_ENV === 'production' ? null : '9000000999');
    if (organizationMobile) {
      const organization = await User.findOne({ mobile: organizationMobile });
      if (!organization) {
        await User.create({
          name: process.env.ORG_ADMIN_NAME || 'Organization Admin',
          mobile: organizationMobile,
          role: 'organization',
          approvalStatus: 'approved'
        });
      } else if (organization.role !== 'organization') {
        console.warn('⚠️  ORG_ADMIN_MOBILE already belongs to a non-organization account.');
      }
    } else {
      console.warn('⚠️  Set ORG_ADMIN_MOBILE to enable organization approvals in production.');
    }
  } catch (e) {
    console.warn('⚠️  Auto-seed skipped:', e.message);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Attendance Management System running`);
    console.log(`   → App:  http://localhost:${PORT}`);
    console.log(`   → API:  http://localhost:${PORT}/api/health\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
