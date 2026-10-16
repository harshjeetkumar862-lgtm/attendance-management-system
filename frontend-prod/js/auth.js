/* ============================================================
   Auth logic — Home page + Firebase email-link login
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

  let role = new URLSearchParams(location.search).get('role') === 'student' ? 'student' : 'teacher';
  const roleButtons = document.querySelectorAll('.role-toggle button');
  const emailInput = document.getElementById('identifier');
  const emailLabel = document.getElementById('identifierLabel');
  const emailHint = document.getElementById('identifierHint');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const sendLinkBtn = document.getElementById('sendLinkBtn');
  const emailTarget = document.getElementById('emailTarget');
  const resendLinkBtn = document.getElementById('resendLinkBtn');
  const changeBtn = document.getElementById('changeBtn');

  function setRole(nextRole) {
    role = nextRole;
    roleButtons.forEach((button) => button.classList.toggle('active', button.dataset.role === role));
    emailLabel.textContent = `${role === 'teacher' ? 'Teacher' : 'Student'} email address`;
    emailHint.textContent = 'Use the email address registered with your account.';
    emailInput.placeholder = 'you@example.com';
    resetToStep1();
  }

  function resetToStep1() {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    emailTarget.textContent = '—';
    if (window.FirebaseEmailAuth?.isSignInWithEmailLink()) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = `?role=${encodeURIComponent(role)}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  async function finishEmailSignIn(email) {
    setLoading(sendLinkBtn, true, 'Verifying email link…');
    try {
      const idToken = await window.FirebaseEmailAuth.completeSignIn(email);
      const result = await api('/auth/firebase-login', {
        method: 'POST',
        auth: false,
        body: { idToken, role }
      });
      localStorage.removeItem('ams_email_for_signin');
      Auth.setToken(result.token);
      Auth.setUser(result.user);
      toast('Welcome!', `Logged in as ${result.user.name}`, 'success');
      setTimeout(() => {
        window.location.href = result.user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
      }, 600);
    } catch (err) {
      toast('Sign-in failed', err.message, 'error');
      setLoading(sendLinkBtn, false, 'Send sign-in link');
    }
  }

  roleButtons.forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));
  roleButtons.forEach((button) => button.classList.toggle('active', button.dataset.role === role));
  emailLabel.textContent = `${role === 'teacher' ? 'Teacher' : 'Student'} email address`;
  emailHint.textContent = 'Use the email address registered with your account.';
  emailInput.placeholder = 'you@example.com';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return toast('Missing email', 'Please enter your registered email address.', 'error');
    if (!window.FirebaseEmailAuth) {
      return toast('Sign-in unavailable', 'Firebase authentication did not load. Please refresh and try again.', 'error');
    }

    if (window.FirebaseEmailAuth.isSignInWithEmailLink()) {
      return finishEmailSignIn(email);
    }

    setLoading(sendLinkBtn, true, 'Sending sign-in link…');
    try {
      await window.FirebaseEmailAuth.sendSignInLink(email, role);
      localStorage.setItem('ams_email_for_signin', email);
      emailTarget.textContent = email;
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      toast('Check your email', 'Open the sign-in link to continue.', 'success');
    } catch (err) {
      toast('Could not send link', err.message, 'error');
    } finally {
      setLoading(sendLinkBtn, false, 'Send sign-in link');
    }
  });

  resendLinkBtn?.addEventListener('click', async () => {
    const email = localStorage.getItem('ams_email_for_signin');
    if (!email) {
      resetToStep1();
      return toast('Enter your email', 'Please enter your registered email address again.', 'info');
    }

    setLoading(resendLinkBtn, true, 'Sending…');
    try {
      await window.FirebaseEmailAuth.sendSignInLink(email, role);
      toast('Link sent', 'Check your inbox for a new sign-in link.', 'success');
    } catch (err) {
      toast('Could not resend link', err.message, 'error');
    } finally {
      setLoading(resendLinkBtn, false, 'Resend link');
    }
  });

  changeBtn?.addEventListener('click', resetToStep1);

  if (window.FirebaseEmailAuth?.isSignInWithEmailLink()) {
    const savedEmail = localStorage.getItem('ams_email_for_signin') || '';
    emailInput.value = savedEmail;
    if (savedEmail) {
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      emailTarget.textContent = savedEmail;
      finishEmailSignIn(savedEmail);
    } else {
      step2.classList.add('hidden');
      toast('Confirm your email', 'Enter the email address that received the sign-in link.', 'info');
      emailInput.focus();
      sendLinkBtn.textContent = 'Complete sign-in';
    }
  }
}

/* ----------------------------- Register page ----------------------------- */
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const classSelect = document.getElementById('classId');
  const registerBtn = document.getElementById('registerBtn');

  (async () => {
    try {
      const result = await api('/classes', { auth: false });
      classSelect.innerHTML = '<option value="">Select your class</option>' +
        result.classes.map((item) => `<option value="${item._id}">${escapeHtml(item.name)}${item.semester ? ' — Sem ' + escapeHtml(item.semester) : ''}</option>`).join('');
    } catch (err) {
      classSelect.innerHTML = '<option value="">Failed to load classes</option>';
      toast('Error', 'Could not load classes.', 'error');
    }
  })();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
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
      toast('Account created', 'A teacher must approve your account before you can sign in with email.', 'success');
      setTimeout(() => (window.location.href = 'login.html?role=student'), 1200);
    } catch (err) {
      toast('Registration failed', err.message, 'error');
      setLoading(registerBtn, false, 'Create Account');
    }
  });
}

/* Button loading helper */
function setLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.dataset.label = button.innerHTML;
    button.innerHTML = `<span class="spinner"></span> ${escapeHtml(label || 'Please wait…')}`;
  } else {
    button.disabled = false;
    button.innerHTML = label || button.dataset.label || 'Submit';
  }
}
