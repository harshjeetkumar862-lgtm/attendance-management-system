# 🎓 Attendance Management System

A full-stack, multi-teacher **Attendance Management System** built with **Node.js + Express.js + MongoDB (Mongoose)** on the backend and **HTML5 / CSS3 / Vanilla JavaScript** on the frontend. It supports **Firebase email-link login in production**, **development OTP login**, **role-based access control** (Teacher / Student), **subject-wise attendance**, **overall attendance percentage**, and **Excel report export**.

> Designed for colleges where one class has **multiple subject teachers**. Each teacher manages attendance **only for their own assigned subjects**, and each student can view **only their own attendance**.

---

## 📌 Table of Contents

1. [Key Features](#-key-features)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [Getting Started](#-getting-started)
5. [Environment Variables](#-environment-variables)
6. [Demo Credentials](#-demo-credentials)
7. [How It Works](#-how-it-works)
8. [Overall Attendance Logic](#-overall-attendance-logic)
9. [Access Control Rules](#-access-control-rules)
10. [REST API Reference](#-rest-api-reference)
11. [Database Schema](#-database-schema)
12. [Excel Reports](#-excel-reports)
13. [What Is Intentionally NOT Included](#-what-is-intentionally-not-included)
14. [Troubleshooting](#-troubleshooting)

---

## ✨ Key Features

### 👩‍🏫 Teacher (Faculty) Portal
- Production login via a **Firebase email sign-in link**.
- View **only their own assigned subjects and classes**.
- **Create a lecture** for a subject (topic + date + auto lecture number).
- **Mark attendance** for that lecture — only **Present / Absent**.
- **Update** previously marked attendance.
- View **class-wise / subject-wise reports** with attendance percentages.
- **Export Excel** report for their own class/subject.

### 🎓 Student Portal
- Production login via a **Firebase email sign-in link**.
- Self-registration (one-time) with class details.
- View **only their own attendance**.
- **Subject-wise attendance** breakdown.
- **Overall attendance percentage** (total attended ÷ total lectures).
- **Download personal Excel report**.

### 🔐 System-Wide
- **Firebase email-link authentication** in production and local OTP authentication in development.
- **JWT** session tokens with **role-based authorization**.
- Strict **ownership checks** — teachers can't touch other teachers' data; students can't view other students' data.
- **Responsive** UI that works on desktop, tablet and mobile.
- **Zero-config development database** — uses `mongodb-memory-server` locally when no external MongoDB is configured. Production requires a persistent MongoDB connection.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3 (custom design system), Vanilla JavaScript (SPA-style view switching) |
| **Backend** | Node.js, Express.js 4.x, REST API |
| **Database** | MongoDB with Mongoose 8.x (`mongodb-memory-server` for zero-config dev) |
| **Auth** | Firebase email-link login + JWT + Role-based access control |
| **Excel** | ExcelJS (`^4.4.0`) |
| **Other** | CORS, Morgan (logging), dotenv |

**Runtime used during development:** Node.js `v22.23.2`, npm `12.0.2`.

---

## 📁 Project Structure

```
attendance-management-system/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection (in-memory fallback)
│   ├── controllers/
│   │   ├── authController.js     # Firebase login, dev OTP, me, register
│   │   ├── teacherController.js  # profile, subjects, classes, stats
│   │   ├── studentController.js  # profile, my-attendance, lists
│   │   ├── classController.js    # classes + class students/subjects
│   │   ├── subjectController.js  # subjects list/create
│   │   ├── lectureController.js  # create/list/get/delete lectures
│   │   ├── attendanceController.js # mark/update/get attendance
│   │   └── reportController.js   # class/student/overall + Excel export
│   ├── middleware/
│   │   ├── auth.js               # authenticate, authorize, signToken
│   │   └── errorHandler.js       # notFound + global error handler
│   ├── models/
│   │   ├── User.js               # base account (role: teacher|student)
│   │   ├── Teacher.js
│   │   ├── Student.js
│   │   ├── Class.js
│   │   ├── Subject.js
│   │   ├── Lecture.js
│   │   └── Attendance.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── teacherRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── classRoutes.js
│   │   ├── subjectRoutes.js
│   │   ├── lectureRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── reportRoutes.js
│   ├── seed/
│   │   └── seed.js               # demo data + autoSeedIfEmpty()
│   ├── services/
│   │   └── firebaseAuth.js       # Firebase ID-token verification
│   ├── utils/
│   │   └── otp.js                # in-memory OTP for local development
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js                 # Express app entry point
└── frontend/
    ├── css/
    │   ├── style.css             # global design system (home page)
    │   ├── login.css             # auth / OTP screens
    │   └── dashboard.css         # teacher & student dashboards
    ├── js/
    │   ├── script.js             # API wrapper, Auth, helpers
    │   ├── auth.js               # home, login, register logic
    │   ├── teacher.js            # teacher dashboard logic
    │   └── student.js            # student dashboard logic
    ├── index.html                # landing / home page
    ├── login.html                # OTP login (teacher/student)
    ├── register.html             # student self-registration
    ├── teacher-dashboard.html
    └── student-dashboard.html
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (developed on v22)
- **npm**
- *(Optional)* MongoDB — not required, the app runs with an in-memory DB by default.

### 2. Install dependencies
```bash
cd attendance-management-system/backend
npm install
```

> `mongodb-memory-server` downloads a MongoDB binary on first use. If your
> environment blocks install scripts, run once:
> ```bash
> node -e "require('mongodb-memory-server').MongoMemoryServer.create().then(()=>console.log('mongo ready'))"
> ```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` if you want to point to a real MongoDB (see below).

### 4. Run the server
```bash
# development (auto-restart with nodemon)
npm run dev

# or production-style
npm start
```
The server starts on **http://localhost:5001** and serves **both** the REST API (`/api/*`) and the frontend static files.

### 5. Open the app
Navigate to **http://localhost:5001/** in your browser.

On first boot, demo data is **auto-seeded** (classes, teachers, students, subjects, lectures and attendance) so you can log in immediately.

To re-seed manually:
```bash
npm run seed
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `MONGODB_URI` | MongoDB connection string. Empty uses in-memory MongoDB in development; required in production. | *(empty in development)* |
| `DB_NAME` | Database name | `attendance_db` |
| `JWT_SECRET` | Secret used to sign JWTs. Use a random value of at least 32 characters in production. | Development fallback |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `OTP_PROVIDER` | `dev` is for local development only; production email login uses Firebase. | `dev` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service-account JSON for verifying email-link tokens in production. Keep it private. | *(unset locally)* |
| `CORS_ORIGINS` | Comma-separated exact frontend origins allowed to call the API. | *(empty)* |

Example `.env`:
```env
PORT=5001
MONGODB_URI=
DB_NAME=attendance_db
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
JWT_EXPIRES_IN=7d
OTP_PROVIDER=dev
FIREBASE_SERVICE_ACCOUNT_JSON=
CORS_ORIGINS=
```

---

## ☁️ Deploy on Render + MongoDB Atlas (free tiers)

The backend can be deployed as a Render web service and use MongoDB Atlas for
persistent data. Render's free web service may sleep when idle; the first
request after sleeping can take longer. The in-memory database is deliberately
disabled in production so a missing Atlas URI cannot silently lose data.

1. Push this repository to a Git repository you control. The GitHub repository
   includes `attendance-management-system/backend` and `frontend-prod`. Do not
   commit `.env` or any credentials.
2. Create a free MongoDB Atlas cluster and database user. Since Render free
   services do not provide fixed outbound IP addresses, allow Atlas network
   access from `0.0.0.0/0` and use a strong database-user password. Add the
   Atlas connection string as a Render secret; never put it in frontend code.
3. In Render, create a **Blueprint** using the repository-root `render.yaml`, or
   create a Web Service manually with:
   - Root Directory: `attendance-management-system/backend`
   - Build Command: `npm ci --omit=dev`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
4. Set these Render environment variables:
   - `MONGODB_URI`: Atlas connection string
   - `DB_NAME`: `attendance_db` (or your chosen database name)
   - `JWT_SECRET`: a unique random secret of at least 32 characters
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase service-account JSON (minified into one line); store it only as a Render secret
   - `ORG_ADMIN_MOBILE`: mobile number for the organization admin account
   - `CORS_ORIGINS`: exact deployed frontend origin (for example,
     `https://your-frontend.onrender.com`; do not include a path or trailing slash)
   Render supplies `PORT` and sets `NODE_ENV=production` from the Blueprint.
5. In Firebase Console, enable **Authentication → Email/Password → Email link
   (passwordless sign-in)** and add the static frontend hostname under
   **Authorized domains**. Create a Firebase Web App and copy its `apiKey`,
   `authDomain`, `projectId`, and `appId` into `frontend-prod/js/config.js`.
   Create a Firebase service account and add its JSON to Render as
   `FIREBASE_SERVICE_ACCOUNT_JSON`.
6. In GitHub repository settings, enable **Pages → Build and deployment →
   GitHub Actions**. Add the repository variable `API_BASE` with value
   `https://<your-render-service>.onrender.com/api`; the included workflow will
   publish `frontend-prod` automatically. Add the GitHub Pages site's exact
   origin (for example `https://<owner>.github.io`) to `CORS_ORIGINS` and
   redeploy the backend. The Firebase Web App config in
   `frontend-prod/js/config.js` is public client configuration; never put the
   service-account JSON there.
7. Confirm `https://<your-render-service>.onrender.com/api/health` returns
   JSON with `"status":"ok"`.

Firebase Spark supports email-link sign-in at no cost within its quotas; the
current documented limit is 5 sign-in emails per day. See [Firebase Auth
limits](https://firebase.google.com/docs/auth/limits). Production accounts
must have their real email addresses stored in the matching teacher/student
profile. The seeded teacher emails are examples and seeded students have no
email, so replace/add real addresses in Atlas before those accounts can sign
in. New student registrations collect an email address.

---

## 🔑 Demo Credentials

The seed script creates the following accounts. The original local frontend uses
development OTP, which is returned in the API response and auto-filled. The
production `frontend-prod` login uses Firebase email links instead.

### Teachers
| Teacher ID | Name | Mobile | Subject |
|-----------|------|--------|---------|
| `TCH001` | Mr. Rajesh Sharma | `9000000001` | Java Programming (BCA301) |
| `TCH002` | Ms. Priya Verma | `9000000002` | DBMS (BCA302) |
| `TCH003` | Mr. Anil Kumar | `9000000003` | Operating System (BCA303) |
| `TCH004` | Mrs. Sunita Rao | `9000000004` | Computer Network (BCA304) |
| `TCH005` | Mr. Vikas Gupta | `9000000005` | Web Development (BCA305) |
| `TCH006` | Dr. Meena Joshi | `9000000006` | Software Engineering (BCA501) |
| `TCH007` | Mr. Sanjay Patel | `9000000007` | Cloud Computing (BCA502) |

### Students
| Student ID | Name | Mobile | Class |
|-----------|------|--------|-------|
| `STU001` | Rahul Kumar | `9000000101` | BCA 3rd Semester |
| `STU002` | Amit Kumar | `9000000102` | BCA 3rd Semester |
| … | … | … | … |
| `STU010` | Kavita Sharma | `9000000110` | BCA 3rd Semester |
| `STU101` | Arjun Nair | `9000000201` | BCA 5th Semester |
| … | … | … | … |

> **Quick demo login:**
> - Teacher → ID `TCH001` (or mobile `9000000001`)
> - Student → mobile `9000000101` (Rahul Kumar)

---

## 🔄 How It Works

### Teacher flow
1. Open **login.html**, choose **Teacher**, enter the registered email address.
2. Open the Firebase sign-in link from that email to reach **teacher-dashboard.html**.
3. Dashboard shows stats (subjects, classes, lectures, students).
4. **Create Lecture** for one of *their own* subjects.
5. **Mark Attendance** — the roster loads, toggle each student Present/Absent, save.
6. **Reports** — view class report and **Export Excel**.

### Student flow
1. Open **login.html**, choose **Student**, enter the registered email address.
2. Open the Firebase sign-in link from that email to reach **student-dashboard.html**.
3. View **My Attendance** (subject-wise), **Overall Attendance**, and **My Report**.
4. **Download Excel** for a personal report.

---

## 📊 Overall Attendance Logic

Overall attendance is **NOT** a simple average of subject percentages. It is calculated as:

```
Overall % = (Total lectures attended across ALL subjects)
            ÷ (Total lectures conducted across ALL subjects) × 100
```

**Example:** A student attends 38 of 51 total lectures → **38 / 51 = 74.51%**, even if individual subject percentages differ. This is the correct, lecture-weighted method.

---

## 🔐 Access Control Rules

| Rule | Enforcement |
|------|-------------|
| Teacher A **cannot** view/modify Teacher B's attendance | `loadOwnedLecture()` ownership check → `403` |
| Teacher can create lectures **only** for their own subjects | subject→teacher ownership check |
| Student A **cannot** view Student B's attendance/report | controller checks `req.user` against requested student → `403` |
| Students **cannot** access teacher-only routes | `authorize('teacher')` middleware → `403` |
| Teachers **cannot** access student-only routes | `authorize('student')` middleware → `403` |
| All protected routes require a valid JWT | `authenticate` middleware → `401` |

These were verified end-to-end (teacher isolation, student privacy, cross-role blocking).

---

## 🌐 REST API Reference

Base URL: `/api`

### Auth — `/api/auth`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/send-otp` | Public | Development-only OTP delivery |
| `POST` | `/verify-otp` | Public | Verify development OTP → returns JWT + user |
| `POST` | `/firebase-login` | Public | Verify a Firebase email-link ID token and return the app JWT |
| `GET` | `/me` | Auth | Current logged-in user |
| `POST` | `/register` | Public | Student self-registration with email |

### Teachers — `/api/teachers` *(teacher-only)*
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/` | Teacher | List teachers |
| `GET` | `/me` | Teacher | Own profile |
| `GET` | `/me/subjects` | Teacher | Own subjects |
| `GET` | `/me/classes` | Teacher | Own classes |
| `GET` | `/me/stats` | Teacher | Dashboard statistics |

### Students — `/api/students`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/me` | Student | Own profile |
| `GET` | `/me/attendance` | Student | Subject-wise + overall attendance |
| `GET` | `/` | Teacher | List students |
| `GET` | `/:id` | Teacher | Student by id |

### Classes — `/api/classes`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/` | Auth | List classes |
| `POST` | `/` | Teacher | Create class |
| `GET` | `/:id/students` | Teacher | Students in a class |
| `GET` | `/:id/subjects` | Teacher | Subjects in a class |

### Subjects — `/api/subjects`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/` | Auth | List subjects (filter by class/teacher) |
| `POST` | `/` | Teacher | Create subject |

### Lectures — `/api/lectures` *(teacher-only)*
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Teacher | Create a lecture (own subject only) |
| `GET` | `/` | Teacher | List lectures |
| `GET` | `/:id` | Teacher | Lecture + roster with attendance |
| `DELETE` | `/:id` | Teacher | Delete own lecture |

### Attendance — `/api/attendance` *(teacher-only)*
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Teacher | Mark attendance for a lecture |
| `PUT` | `/` | Teacher | Update attendance for a lecture |
| `GET` | `/lecture/:lectureId` | Teacher | Attendance by lecture |
| `GET` | `/subject/:subjectId` | Teacher | Attendance by subject |

### Reports — `/api/reports`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/class` | Teacher | Class/subject report |
| `GET` | `/student/:studentId` | Auth | Student report (own for students) |
| `GET` | `/overall` | Auth | Overall summary |
| `GET` | `/excel` | Auth | Download Excel (role-aware) |

---

## 🗄 Database Schema

| Collection | Key Fields |
|-----------|-----------|
| **users** | `name`, `mobile` (unique), `email` (unique when present), `role` (`teacher`\|`student`), `teacherId`, `studentId`, `isVerified`, `lastLoginAt` |
| **teachers** | `userId`→User, `teacherId` (unique), `name`, `mobile`, `email`, `department`, `subjects[]`, `classes[]` |
| **students** | `userId`→User, `studentId` (unique), `name`, `mobile`, `email`, `classId`→Class, `semester`, `rollNumber` |
| **classes** | `name`, `code` (unique), `department`, `semester` |
| **subjects** | `name`, `code`, `classId`→Class, `teacherId`→Teacher *(unique: code+classId)* |
| **lectures** | `teacherId`, `subjectId`, `classId`, `topic`, `lectureNumber`, `date`, `totalStudents`, `presentCount`, `absentCount` |
| **attendance** | `studentId`, `teacherId`, `subjectId`, `lectureId`, `classId`, `status` (`Present`\|`Absent`) *(unique: studentId+lectureId)* |

---

## 📥 Excel Reports

Generated with **ExcelJS**, styled headers, and correct MIME type
(`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

| Role | Endpoint | Filename | Contents |
|------|----------|----------|----------|
| Teacher | `GET /api/reports/excel?type=class&subjectId=...` | `Attendance_Report.xlsx` | Class roster with present/absent + percentage |
| Student | `GET /api/reports/excel?type=student` | `My_Attendance_Report.xlsx` | Subject-wise + overall personal attendance |

---

## 🚫 What Is Intentionally NOT Included

Per requirements, the following were deliberately **excluded** to keep the system simple and focused:

- ❌ Biometric / fingerprint attendance
- ❌ Face recognition
- ❌ GPS / location tracking
- ❌ Complex date-wise report builders
- ❌ Extra attendance statuses (e.g. Late, Leave, Half-day)

**Only `Present` and `Absent`** statuses are supported.

---

## 🧰 Troubleshooting

| Problem | Solution |
|---------|----------|
| `EADDRINUSE` on port 5000/5001 | Change `PORT` in `.env`. (Port 5000 is often taken by system services.) |
| `mongodb-memory-server` binary not downloaded | Run `node -e "require('mongodb-memory-server').MongoMemoryServer.create()"` once. |
| Email link not received | Check Firebase email-link sign-in is enabled, the Firebase authorized domain is correct, and the address matches an approved user profile. |
| Empty data | Run `npm run seed` or restart the server (auto-seeds when empty). |
| Want a real DB | Set `MONGODB_URI` in `.env` to your MongoDB connection string. |

---

## 📝 License

Built as a demonstration/college project. Free to use and adapt.

---

**Built with ❤️ using Node.js, Express, MongoDB and vanilla JavaScript.**
