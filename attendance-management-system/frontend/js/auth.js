/* ============================================================
   Auth logic — Home page + Login page (OTP flow)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHomePage();
  initLoginPage();
  initRegisterPage();
});

/* ----------------------------- Home page ----------------------------- */
function initHomePage() {
  const cta = document.getElementById('navAuthCta');
  if (!cta) return;

  const user = Auth.getUser();
  if (Auth.isLoggedIn() && user) {
    cta.innerHTML = `
      <a class="btn btn-primary btn-sm" href="${user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html'}">
        Go to Dashboard →
      </a>`;
  }
}

/* ----------------------------- Login page ----------------------------- */
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  let role = 'teacher';
  let identifier = '';
  let resendTimer = null;

  const roleButtons = document.querySelectorAll('.role-toggle button');
  const identifierInput = document.getElementById('identifier');
  const identifierLabel = document.getElementById('identifierLabel');
  const identifierHint = document.getElementById('identifierHint');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const sendBtn = document.getElementById('sendOtpBtn');
  const verifyBtn = document.getElementById('verifyOtpBtn');
  const otpInputs = Array.from(document.querySelectorAll('.otp-inputs input'));
  const otpTarget = document.getElementById('otpTarget');
  const devNote = document.getElementById('devNote');
  const resendBtn = document.getElementById('resendBtn');
  const changeBtn = document.getElementById('changeBtn');

  // Pre-select role from ?role=teacher|student
  const params = new URLSearchParams(location.search);
  if (params.get('role') === 'student') setRole('student');

  roleButtons.forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)));

  function setRole(r) {
    role = r;
    roleButtons.forEach((b) => b.classList.toggle('active', b.dataset.role === r));
    if (r === 'teacher') {
      identifierLabel.textContent = 'Teacher ID or Mobile Number';
      identifierHint.textContent = 'e.g. TCH001 or 9000000001';
      identifierInput.placeholder = 'TCH001 / 9000000001';
    } else {
      identifierLabel.textContent = 'Mobile Number';
      identifierHint.textContent = 'Registered mobile number';
      identifierInput.placeholder = '9000000101';
    }
    resetToStep1();
  }

  function resetToStep1() {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    otpInputs.forEach((i) => (i.value = ''));
    if (resendTimer) clearInterval(resendTimer);
  }

  /* OTP box auto-advance */
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) otpInputs[idx - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length) {
        e.preventDefault();
        digits.forEach((d, i) => { if (otpInputs[i]) otpInputs[i].value = d; });
        otpInputs[Math.min(digits.length, otpInputs.length - 1)].focus();
      }
    });
  });

  /* Step 1 — send OTP */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!step2.classList.contains('hidden')) return; // handled by verify button

    identifier = identifierInput.value.trim();
    if (!identifier) return toast('Missing input', 'Please enter your ID / mobile number.', 'error');

    setLoading(sendBtn, true, 'Sending OTP…');
    try {
      const res = await api('/auth/send-otp', { method: 'POST', auth: false, body: { identifier, role } });
      otpTarget.textContent = identifier;
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      otpInputs[0].focus();
      toast('OTP sent', res.message, 'success');

      if (res.devOtp) {
        devNote.classList.remove('hidden');
        devNote.innerHTML = `🔐 <strong>Dev mode OTP:</strong> <span style="font-size:1.05rem;letter-spacing:2px">${res.devOtp}</span> <span style="opacity:.7">(auto-filled for testing)</span>`;
        // Auto-fill in dev for convenience
        res.devOtp.split('').forEach((d, i) => { if (otpInputs[i]) otpInputs[i].value = d; });
      } else {
        devNote.classList.add('hidden');
      }
      startResendCountdown(30);
    } catch (err) {
      toast('Login failed', err.message, 'error');
    } finally {
      setLoading(sendBtn, false, 'Send OTP');
    }
  });

  /* Step 2 — verify OTP */
  verifyBtn.addEventListener('click', async () => {
    const otp = otpInputs.map((i) => i.value).join('');
    if (otp.length !== 6) return toast('Invalid OTP', 'Please enter the complete 6-digit OTP.', 'error');

    setLoading(verifyBtn, true, 'Verifying…');
    try {
      const res = await api('/auth/verify-otp', { method: 'POST', auth: false, body: { identifier, role, otp } });
      Auth.setToken(res.token);
      Auth.setUser(res.user);
      toast('Welcome!', `Logged in as ${res.user.name}`, 'success');
      setTimeout(() => {
        window.location.href = res.user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
      }, 600);
    } catch (err) {
      toast('Verification failed', err.message, 'error');
      setLoading(verifyBtn, false, 'Verify & Login');
    }
  });

  changeBtn?.addEventListener('click', resetToStep1);

  resendBtn?.addEventListener('click', async () => {
    try {
      const res = await api('/auth/send-otp', { method: 'POST', auth: false, body: { identifier, role } });
      toast('OTP re-sent', res.message, 'success');
      if (res.devOtp) {
        devNote.classList.remove('hidden');
        devNote.innerHTML = `🔐 <strong>Dev mode OTP:</strong> <span style="font-size:1.05rem;letter-spacing:2px">${res.devOtp}</span>`;
        res.devOtp.split('').forEach((d, i) => { if (otpInputs[i]) otpInputs[i].value = d; });
      }
      startResendCountdown(30);
    } catch (err) {
      toast('Failed', err.message, 'error');
    }
  });

  function startResendCountdown(seconds) {
    if (resendTimer) clearInterval(resendTimer);
    let s = seconds;
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend in ${s}s`;
    resendTimer = setInterval(() => {
      s -= 1;
      if (s <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
      } else {
        resendBtn.textContent = `Resend in ${s}s`;
      }
    }, 1000);
  }
}

/* ----------------------------- Register page ----------------------------- */
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const classSelect = document.getElementById('classId');
  const registerBtn = document.getElementById('registerBtn');

  // Load classes for the dropdown.
  (async () => {
    try {
      const res = await api('/classes', { auth: false });
      classSelect.innerHTML = '<option value="">Select your class</option>' +
        res.classes.map((c) => `<option value="${c._id}">${escapeHtml(c.name)}${c.semester ? ' — Sem ' + escapeHtml(c.semester) : ''}</option>`).join('');
    } catch (err) {
      classSelect.innerHTML = '<option value="">Failed to load classes</option>';
      toast('Error', 'Could not load classes.', 'error');
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      role: 'student',
      name: document.getElementById('name').value.trim(),
      mobile: document.getElementById('mobile').value.trim(),
      email: document.getElementById('email').value.trim().toLowerCase(),
      rollNumber: document.getElementById('rollNumber').value.trim(),
      classId: classSelect.value,
      studentId: document.getElementById('studentId').value.trim() || undefined
    };
    if (!payload.name || !payload.mobile || !payload.email || !payload.rollNumber || !payload.classId) {
      return toast('Missing details', 'Please fill all required fields.', 'error');
    }

    setLoading(registerBtn, true, 'Creating account…');
    try {
      await api('/auth/register', { method: 'POST', auth: false, body: payload });
      toast('Account created', 'You can now log in with your mobile number.', 'success');
      setTimeout(() => (window.location.href = 'login.html?role=student'), 900);
    } catch (err) {
      toast('Registration failed', err.message, 'error');
      setLoading(registerBtn, false, 'Create Account');
    }
  });
}

/* Button loading helper */
function setLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.label = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${escapeHtml(label || 'Please wait…')}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = label || btn.dataset.label || 'Submit';
  }
}
