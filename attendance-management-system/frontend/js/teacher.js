/* ============================================================
   Teacher Dashboard logic
   ============================================================ */

const Teacher = {
  user: null,
  profile: null,
  subjects: [],
  classes: [],
  lectures: [],
  roster: [],          // [{studentId, name, rollNumber, status}]
  activeLecture: null,
  reportSubjectId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  Teacher.user = requireAuth('teacher');
  if (!Teacher.user) return;

  renderUserChip();
  wireNav();
  wireForms();

  await Promise.all([loadStats(), loadSubjects(), loadClasses(), loadLectures()]);
  loadRecentLectures();
});

/* ----------------------------- Chrome ----------------------------- */
function renderUserChip() {
  const u = Teacher.user;
  document.getElementById('sideName').textContent = u.name;
  document.getElementById('sideRole').textContent = 'teacher';
  document.getElementById('sideAvatar').textContent = initials(u.name);
  document.getElementById('sideAvatar').style.background = avatarColor(u.name);
  document.getElementById('topTeacherId').textContent = u.teacherId || '—';
  document.getElementById('pageCrumb').textContent = `Welcome back, ${u.name}`;
}

function wireNav() {
  document.querySelectorAll('.side-nav button').forEach((btn) => {
    btn.addEventListener('click', () => goTo(btn.dataset.view));
  });
}

const VIEW_META = {
  overview: ['Dashboard', 'Overview of your teaching activity'],
  profile: ['My Profile', 'Your faculty account details'],
  subjects: ['My Subjects', 'Subjects assigned to you'],
  classes: ['My Classes', 'Classes you teach in'],
  lectures: ['Lectures', 'Create and manage your lectures'],
  attendance: ['Mark Attendance', 'Mark or update attendance for a lecture'],
  reports: ['Reports & Excel', 'Class reports and Excel export']
};

function goTo(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  document.getElementById('view-' + view)?.classList.remove('hidden');
  document.querySelectorAll('.side-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  const [title, crumb] = VIEW_META[view] || ['Dashboard', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageCrumb').textContent = crumb;
  toggleSidebar(false);

  if (view === 'profile' && !Teacher.profile) loadProfile();
  if (view === 'attendance') populateLectureSelect();
  if (view === 'reports') populateReportSelect();
}

/* ----------------------------- Data loaders ----------------------------- */
async function loadStats() {
  try {
    const { stats } = await api('/teachers/me/stats');
    document.getElementById('statSubjects').textContent = stats.subjects;
    document.getElementById('statClasses').textContent = stats.classes;
    document.getElementById('statLectures').textContent = stats.lectures;
    document.getElementById('statStudents').textContent = stats.students;
  } catch (e) { /* ignore */ }
}

async function loadProfile() {
  const box = document.getElementById('profileBody');
  try {
    const { teacher } = await api('/teachers/me');
    Teacher.profile = teacher;
    box.innerHTML = `
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:22px">
        <span class="avatar" style="width:72px;height:72px;font-size:1.6rem;background:${avatarColor(teacher.name)}">${escapeHtml(initials(teacher.name))}</span>
        <div>
          <h2 style="font-size:1.4rem">${escapeHtml(teacher.name)}</h2>
          <div style="color:var(--muted)">${escapeHtml(teacher.department || 'Faculty')}</div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="panel" style="margin:0;box-shadow:none;border-color:var(--border)"><div class="sc-label">Teacher ID</div><div style="font-weight:700;font-size:1.05rem">${escapeHtml(teacher.teacherId)}</div></div>
        <div class="panel" style="margin:0;box-shadow:none"><div class="sc-label">Mobile</div><div style="font-weight:700;font-size:1.05rem">${escapeHtml(teacher.mobile)}</div></div>
        <div class="panel" style="margin:0;box-shadow:none"><div class="sc-label">Email</div><div style="font-weight:700;font-size:1.05rem">${escapeHtml(teacher.email || '—')}</div></div>
      </div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function loadSubjects() {
  const box = document.getElementById('subjectsBody');
  try {
    const { subjects } = await api('/teachers/me/subjects');
    Teacher.subjects = subjects;
    populateSubjectSelects();

    if (!subjects.length) {
      box.innerHTML = `<div class="empty"><div class="e-icon">📚</div>No subjects assigned yet.</div>`;
      return;
    }
    box.innerHTML = `<div class="list-grid">${subjects.map((s) => `
      <div class="list-card">
        <div class="lc-top">
          <h4>${escapeHtml(s.name)}</h4>
          <span class="lc-code">${escapeHtml(s.code)}</span>
        </div>
        <div class="lc-sub">🏫 ${escapeHtml(s.classId?.name || '—')}</div>
      </div>`).join('')}</div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function loadClasses() {
  const box = document.getElementById('classesBody');
  try {
    const { classes } = await api('/teachers/me/classes');
    Teacher.classes = classes;
    if (!classes.length) {
      box.innerHTML = `<div class="empty"><div class="e-icon">🏫</div>No classes yet.</div>`;
      return;
    }
    box.innerHTML = `<div class="list-grid">${classes.map((c) => `
      <div class="list-card">
        <div class="lc-top"><h4>${escapeHtml(c.name)}</h4><span class="lc-code">${escapeHtml(c.code)}</span></div>
        <div class="lc-sub">Semester: ${escapeHtml(c.semester || '—')}</div>
      </div>`).join('')}</div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function loadLectures() {
  const box = document.getElementById('lecturesBody');
  try {
    const { lectures } = await api('/lectures');
    Teacher.lectures = lectures;
    renderLecturesTable(box);
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

function renderLecturesTable(box) {
  if (!Teacher.lectures.length) {
    box.innerHTML = `<div class="empty"><div class="e-icon">🗓️</div>No lectures yet. Create your first lecture above.</div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Subject</th><th>Class</th><th>Topic</th><th>Date</th><th>Present</th><th>Absent</th><th>Actions</th></tr></thead>
        <tbody>
          ${Teacher.lectures.map((l) => `
            <tr>
              <td>${l.lectureNumber ?? '—'}</td>
              <td><strong>${escapeHtml(l.subjectId?.name || '—')}</strong></td>
              <td>${escapeHtml(l.classId?.name || '—')}</td>
              <td>${escapeHtml(l.topic || '—')}</td>
              <td>${formatDate(l.date)}</td>
              <td><span class="badge present">${l.presentCount || 0}</span></td>
              <td><span class="badge absent">${l.absentCount || 0}</span></td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="markFromLecture('${l._id}')">Mark</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLecture('${l._id}')">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function loadRecentLectures() {
  const box = document.getElementById('recentLectures');
  const recent = Teacher.lectures.slice(0, 5);
  if (!recent.length) {
    box.innerHTML = `<div class="empty"><div class="e-icon">🗓️</div>No lectures yet.</div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Subject</th><th>Class</th><th>Topic</th><th>Date</th><th>Present / Absent</th></tr></thead>
        <tbody>
          ${recent.map((l) => `
            <tr>
              <td><strong>${escapeHtml(l.subjectId?.name || '—')}</strong></td>
              <td>${escapeHtml(l.classId?.name || '—')}</td>
              <td>${escapeHtml(l.topic || '—')}</td>
              <td>${formatDate(l.date)}</td>
              <td><span class="badge present">${l.presentCount || 0}P</span> <span class="badge absent">${l.absentCount || 0}A</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ----------------------------- Selects ----------------------------- */
function populateSubjectSelects() {
  const opts = '<option value="">Select subject</option>' +
    Teacher.subjects.map((s) => `<option value="${s._id}">${escapeHtml(s.name)} — ${escapeHtml(s.classId?.name || '')}</option>`).join('');
  const lec = document.getElementById('lecSubject');
  const rep = document.getElementById('repSubject');
  if (lec) lec.innerHTML = opts;
  if (rep) rep.innerHTML = opts;
}

function populateLectureSelect() {
  const sel = document.getElementById('attLecture');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a lecture</option>' +
    Teacher.lectures.map((l) => `<option value="${l._id}">#${l.lectureNumber} · ${escapeHtml(l.subjectId?.name || '')} · ${escapeHtml(l.topic || formatDate(l.date))}</option>`).join('');
}

function populateReportSelect() {
  populateSubjectSelects();
}

/* ----------------------------- Wire forms ----------------------------- */
function wireForms() {
  document.getElementById('createLectureBtn').addEventListener('click', createLecture);

  document.getElementById('attLecture').addEventListener('change', (e) => {
    if (e.target.value) loadRoster(e.target.value);
    else document.getElementById('attendanceBody').innerHTML = `<div class="empty"><div class="e-icon">🗒️</div>Select a lecture to load the student list.</div>`;
  });

  document.getElementById('loadReportBtn').addEventListener('click', () => {
    const sid = document.getElementById('repSubject').value;
    if (!sid) return toast('Select subject', 'Please choose a subject first.', 'error');
    loadReport(sid);
  });

  document.getElementById('repSubject').addEventListener('change', (e) => {
    document.getElementById('exportExcelBtn').disabled = !e.target.value;
  });

  document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);
}

/* ----------------------------- Create / delete ----------------------------- */
async function createLecture() {
  const subjectId = document.getElementById('lecSubject').value;
  const topic = document.getElementById('lecTopic').value.trim();
  if (!subjectId) return toast('Select subject', 'Please choose a subject.', 'error');

  const btn = document.getElementById('createLectureBtn');
  setLoading(btn, true, 'Creating…');
  try {
    const res = await api('/lectures', { method: 'POST', body: { subjectId, topic } });
    toast('Lecture created', `Lecture #${res.lecture.lectureNumber} is ready.`, 'success');
    document.getElementById('lecTopic').value = '';
    await loadLectures();
    loadRecentLectures();
    loadStats();
    // Jump straight to marking attendance for the new lecture.
    goTo('attendance');
    setTimeout(() => {
      populateLectureSelect();
      const sel = document.getElementById('attLecture');
      sel.value = res.lecture._id;
      loadRoster(res.lecture._id);
    }, 50);
  } catch (e) {
    toast('Error', e.message, 'error');
  } finally {
    setLoading(btn, false, '＋ Create Lecture');
  }
}

async function deleteLecture(id) {
  if (!confirm('Delete this lecture and its attendance? This cannot be undone.')) return;
  try {
    await api('/lectures/' + id, { method: 'DELETE' });
    toast('Deleted', 'Lecture removed.', 'success');
    await loadLectures();
    loadRecentLectures();
    loadStats();
  } catch (e) {
    toast('Error', e.message, 'error');
  }
}

function markFromLecture(id) {
  goTo('attendance');
  setTimeout(() => {
    populateLectureSelect();
    document.getElementById('attLecture').value = id;
    loadRoster(id);
  }, 50);
}

/* ----------------------------- Attendance ----------------------------- */
async function loadRoster(lectureId) {
  const box = document.getElementById('attendanceBody');
  box.innerHTML = `<div class="loading-block"><span class="spinner dark"></span> Loading student list…</div>`;
  try {
    const { lecture, roster } = await api('/lectures/' + lectureId);
    Teacher.activeLecture = lecture;
    Teacher.roster = roster.map((r) => ({ ...r, status: r.status || 'Present' }));
    renderRoster();
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

function renderRoster() {
  const box = document.getElementById('attendanceBody');
  const l = Teacher.activeLecture;
  if (!Teacher.roster.length) {
    box.innerHTML = `<div class="empty"><div class="e-icon">👨‍🎓</div>No students in this class.</div>`;
    return;
  }
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin:18px 0 8px">
      <div style="color:var(--muted);font-size:.9rem">
        <strong>${escapeHtml(l.subjectId?.name || '')}</strong> · ${escapeHtml(l.classId?.name || '')} · ${formatDate(l.date)}
        <span id="rosterSummary"></span>
      </div>
      <div class="roster-actions">
        <button class="btn btn-ghost btn-sm" onclick="setAll('Present')">✅ All Present</button>
        <button class="btn btn-ghost btn-sm" onclick="setAll('Absent')">❌ All Absent</button>
      </div>
    </div>
    <div id="rosterList">
      ${Teacher.roster.map((r, i) => `
        <div class="roster-row">
          <div class="rname">${avatarHtml(r.name, r.studentId)} <div>${escapeHtml(r.name)} <span class="roll">· Roll ${escapeHtml(r.rollNumber)}</span></div></div>
          <div class="seg" data-student="${r.studentId}">
            <button type="button" class="p ${r.status === 'Present' ? 'active' : ''}" onclick="setStatus(${i}, 'Present')">Present</button>
            <button type="button" class="a ${r.status === 'Absent' ? 'active' : ''}" onclick="setStatus(${i}, 'Absent')">Absent</button>
          </div>
        </div>`).join('')}
    </div>
    <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-primary" id="saveAttBtn" onclick="saveAttendance()">💾 Save Attendance</button>
      <button class="btn btn-ghost" onclick="loadRoster('${l._id}')">↺ Reset</button>
    </div>`;
  updateRosterSummary();
}

function setStatus(index, status) {
  Teacher.roster[index].status = status;
  const row = document.querySelectorAll('#rosterList .roster-row')[index];
  const seg = row.querySelector('.seg');
  seg.querySelector('.p').classList.toggle('active', status === 'Present');
  seg.querySelector('.a').classList.toggle('active', status === 'Absent');
  updateRosterSummary();
}

function setAll(status) {
  Teacher.roster.forEach((r, i) => setStatus(i, status));
}

function updateRosterSummary() {
  const present = Teacher.roster.filter((r) => r.status === 'Present').length;
  const absent = Teacher.roster.length - present;
  const el = document.getElementById('rosterSummary');
  if (el) el.innerHTML = ` &nbsp;|&nbsp; <span class="badge present">${present} Present</span> <span class="badge absent">${absent} Absent</span>`;
}

async function saveAttendance() {
  const btn = document.getElementById('saveAttBtn');
  setLoading(btn, true, 'Saving…');
  try {
    const records = Teacher.roster.map((r) => ({ studentId: r.studentId, status: r.status }));
    await api('/attendance', { method: 'POST', body: { lectureId: Teacher.activeLecture._id, records } });
    toast('Saved', 'Attendance saved successfully.', 'success');
    await loadLectures();
    loadRecentLectures();
  } catch (e) {
    toast('Error', e.message, 'error');
  } finally {
    setLoading(btn, false, '💾 Save Attendance');
  }
}

/* ----------------------------- Reports ----------------------------- */
async function loadReport(subjectId) {
  const box = document.getElementById('reportBody');
  box.innerHTML = `<div class="loading-block"><span class="spinner dark"></span> Generating report…</div>`;
  Teacher.reportSubjectId = subjectId;
  try {
    const data = await api('/reports/class?subjectId=' + subjectId);
    const rows = data.rows;
    if (!rows.length) {
      box.innerHTML = `<div class="empty"><div class="e-icon">📈</div>No students in this class yet.</div>`;
      return;
    }
    const avg = rows.length ? Math.round((rows.reduce((a, r) => a + r.percentage, 0) / rows.length) * 100) / 100 : 0;
    box.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-top:6px">
        <div class="stat-card"><div class="sc-icon indigo">📚</div><div><div class="sc-value">${escapeHtml(data.subject.name)}</div><div class="sc-label">${escapeHtml(data.subject.class?.name || '')}</div></div></div>
        <div class="stat-card"><div class="sc-icon green">🗓️</div><div><div class="sc-value">${data.totalLectures}</div><div class="sc-label">Total Lectures</div></div></div>
        <div class="stat-card"><div class="sc-icon amber">📊</div><div><div class="sc-value">${avg}%</div><div class="sc-label">Class Average</div></div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Roll No</th><th>Student</th><th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th><th></th></tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${escapeHtml(r.rollNumber)}</td>
                <td><div class="cell-name">${avatarHtml(r.name, r.studentId)} ${escapeHtml(r.name)}</div></td>
                <td>${r.total}</td>
                <td><span class="badge present">${r.present}</span></td>
                <td><span class="badge absent">${r.absent}</span></td>
                <td>${progressHtml(r.percentage)}</td>
                <td><button class="btn btn-ghost btn-sm" onclick="viewStudentReport('${r.studentId}', '${escapeHtml(r.name)}')">View</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    document.getElementById('exportExcelBtn').disabled = false;
  } catch (e) {
    box.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function viewStudentReport(studentId, name) {
  document.getElementById('modalTitle').textContent = name;
  document.getElementById('modalSub').textContent = 'Overall attendance across all subjects';
  document.getElementById('modalBody').innerHTML = `<div class="loading-block"><span class="spinner dark"></span> Loading…</div>`;
  openModal('modal');
  try {
    const data = await api('/reports/student/' + studentId);
    document.getElementById('modalBody').innerHTML = `
      <div class="table-wrap">
        <table style="min-width:auto">
          <thead><tr><th>Subject</th><th>Total</th><th>Present</th><th>Percentage</th></tr></thead>
          <tbody>
            ${data.subjectWise.map((s) => `<tr><td>${escapeHtml(s.subject)}</td><td>${s.totalLectures}</td><td>${s.present}</td><td>${progressHtml(s.percentage)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="panel" style="margin-top:16px;background:var(--primary-light);border-color:#c7d2fe">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Overall Attendance</strong>
          <span style="font-size:1.3rem;font-weight:800;color:var(--primary-dark)">${data.overall.percentage}%</span>
        </div>
        <div style="color:var(--muted);font-size:.86rem">${data.overall.present} present out of ${data.overall.totalLectures} lectures</div>
      </div>`;
  } catch (e) {
    document.getElementById('modalBody').innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function exportExcel() {
  const subjectId = Teacher.reportSubjectId || document.getElementById('repSubject').value;
  if (!subjectId) return toast('Select subject', 'Please generate a report first.', 'error');
  const btn = document.getElementById('exportExcelBtn');
  setLoading(btn, true, 'Preparing…');
  try {
    const res = await api(`/reports/excel?type=class&subjectId=${subjectId}`, { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Attendance_Report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Exported', 'Attendance_Report.xlsx downloaded.', 'success');
  } catch (e) {
    toast('Export failed', e.message, 'error');
  } finally {
    setLoading(btn, false, '📤 Export Excel');
  }
}
