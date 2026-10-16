/* ============================================================
   Student Dashboard logic
   ============================================================ */

const Student = {
  user: null,
  profile: null,
  data: null // { student, subjectWise, overall }
};

document.addEventListener('DOMContentLoaded', async () => {
  Student.user = requireAuth('student');
  if (!Student.user) return;

  renderUserChip();
  wireNav();
  await loadAttendance();
});

function renderUserChip() {
  const u = Student.user;
  document.getElementById('sideName').textContent = u.name;
  document.getElementById('sideRole').textContent = 'student';
  document.getElementById('sideAvatar').textContent = initials(u.name);
  document.getElementById('sideAvatar').style.background = avatarColor(u.name);
}

function wireNav() {
  document.querySelectorAll('.side-nav button').forEach((btn) => {
    btn.addEventListener('click', () => goTo(btn.dataset.view));
  });
}

const VIEW_META = {
  overview: ['Dashboard', 'Your attendance at a glance'],
  profile: ['My Profile', 'Your student account details'],
  attendance: ['My Attendance', 'Detailed subject-wise attendance'],
  overall: ['Overall Attendance', 'Combined across all subjects'],
  report: ['My Report', 'Download your personal report']
};

function goTo(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  document.getElementById('view-' + view)?.classList.remove('hidden');
  document.querySelectorAll('.side-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  const [title, crumb] = VIEW_META[view] || ['Dashboard', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageCrumb').textContent = crumb;
  toggleSidebar(false);
  if (view === 'profile' && !Student.profile) loadProfile();
}

async function loadAttendance() {
  try {
    const data = await api('/students/me/attendance');
    Student.data = data;
    renderStats();
    renderOverviewSubjects();
    renderAttendanceTable();
    renderOverall();
    renderReport();
    document.getElementById('topClass').textContent = data.student.class?.name || '—';
  } catch (e) {
    toast('Error', e.message, 'error');
  }
}

function renderStats() {
  const { overall } = Student.data;
  document.getElementById('statOverall').textContent = overall.percentage + '%';
  document.getElementById('statTotal').textContent = overall.totalLectures;
  document.getElementById('statPresent').textContent = overall.present;
  document.getElementById('statAbsent').textContent = overall.absent;
}

function subjectRowsHtml() {
  return Student.data.subjectWise.map((s) => `
    <tr>
      <td><strong>${escapeHtml(s.subject)}</strong><div style="color:var(--muted);font-size:.8rem">${escapeHtml(s.code)} · ${escapeHtml(s.teacher)}</div></td>
      <td>${s.totalLectures}</td>
      <td><span class="badge present">${s.present}</span></td>
      <td><span class="badge absent">${s.absent}</span></td>
      <td>${progressHtml(s.percentage)}</td>
    </tr>`).join('');
}

function renderOverviewSubjects() {
  const box = document.getElementById('overviewSubjects');
  if (!Student.data.subjectWise.length) {
    box.innerHTML = `<div class="empty"><div class="e-icon">📚</div>No subjects found for your class.</div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead>
        <tbody>${subjectRowsHtml()}</tbody>
      </table>
    </div>`;
}

function renderAttendanceTable() {
  const box = document.getElementById('attendanceBody');
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead>
        <tbody>${subjectRowsHtml()}</tbody>
      </table>
    </div>`;
}

function renderOverall() {
  const box = document.getElementById('overallBody');
  const { overall, student } = Student.data;
  box.innerHTML = `
    <div class="panel" style="margin:0 0 20px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border:none">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
        <div>
          <div style="opacity:.85;font-size:.9rem">Overall Attendance Percentage</div>
          <div style="font-size:3rem;font-weight:800;line-height:1.1">${overall.percentage}%</div>
          <div style="opacity:.9;font-size:.9rem">${overall.present} present out of ${overall.totalLectures} total lectures</div>
        </div>
        <div style="text-align:right">
          <div style="opacity:.85;font-size:.85rem">${escapeHtml(student.name)}</div>
          <div style="font-weight:700">${escapeHtml(student.class?.name || '')}</div>
          <div style="opacity:.85;font-size:.85rem">Roll No: ${escapeHtml(student.rollNumber)}</div>
        </div>
      </div>
    </div>
    <p style="color:var(--muted);font-size:.88rem;margin-bottom:14px">
      Overall attendance is calculated as <strong>total present ÷ total lectures</strong> across all subjects — not a simple average of subject percentages.
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead>
        <tbody>${subjectRowsHtml()}</tbody>
      </table>
    </div>`;
}

function renderReport() {
  const box = document.getElementById('reportBody');
  const { overall, student } = Student.data;
  box.innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="sc-icon indigo">📈</div><div><div class="sc-value">${overall.percentage}%</div><div class="sc-label">Overall</div></div></div>
      <div class="stat-card"><div class="sc-icon green">✅</div><div><div class="sc-value">${overall.present}</div><div class="sc-label">Present</div></div></div>
      <div class="stat-card"><div class="sc-icon amber">❌</div><div><div class="sc-value">${overall.absent}</div><div class="sc-label">Absent</div></div></div>
    </div>
    <p style="color:var(--muted);font-size:.9rem">
      Your report includes subject-wise attendance and your overall percentage. Click
      <strong>Download Excel</strong> to save <em>My_Attendance_Report.xlsx</em>.
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead>
        <tbody>${subjectRowsHtml()}</tbody>
      </table>
    </div>`;
}

async function loadProfile() {
  const box = document.getElementById('profileBody');
  try {
    const { student } = await api('/students/me');
    Student.profile = student;
    box.innerHTML = `
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:22px">
        <span class="avatar" style="width:72px;height:72px;font-size:1.6rem;background:${avatarColor(student.name)}">${escapeHtml(initials(student.name))}</span>
        <div>
          <h2 style="font-size:1.4rem">${escapeHtml(student.name)}</h2>
          <div style="color:var(--muted)">${escapeHtml(student.classId?.name || '')}</div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="panel" style="margin:0;box-shadow:none"><div class="sc-label">Student ID</div><div style="font-weight:700;font-size:1.05rem">${escapeHtml(student.studentId)}</div></div>
        <div class="panel" style="margin:0;box-shadow:none"><div class="sc-label">Roll Number</div><div style="font-weight:700;font-size:1.05rem">${escapeHtml(student.rollNumber)}</div></div>
        <div class="panel" style="margin:0;box-shadow:none"><div class="sc-label">Mobile</div><div style="font-weight:700;font-size:1.05rem">${escapeHtml(student.mobile)}</div></div>
      </div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function downloadReport() {
  try {
    const res = await api('/reports/excel?type=personal', { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'My_Attendance_Report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Downloaded', 'My_Attendance_Report.xlsx saved.', 'success');
  } catch (e) {
    toast('Download failed', e.message, 'error');
  }
}
