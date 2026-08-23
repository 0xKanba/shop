// ================================================================
// enter.js — 3D Neumorphic Auth Engine | المحل العراقي
// ================================================================

const API = 'https://login.kanba.pw';

// Elements
const authCard          = document.getElementById('authCard');
const neuTabSwitch      = document.getElementById('neuTabSwitch');
const tabLogin          = document.getElementById('tabLogin');
const tabSignup         = document.getElementById('tabSignup');
const loginForm         = document.getElementById('loginForm');
const signupForm        = document.getElementById('signupForm');
const authTitle         = document.getElementById('authTitle');
const authSubtitle      = document.getElementById('authSubtitle');
const errBox            = document.getElementById('error');
const alertMsg          = errBox ? errBox.querySelector('.alert-msg') : null;

// ── Switch between Login & Signup seamlessly ──
function switchMode(targetMode) {
  hideError();
  const isSignup = targetMode === 'signup';

  if (isSignup) {
    if (neuTabSwitch) neuTabSwitch.classList.add('signup-mode');
    if (tabLogin) {
      tabLogin.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'false');
    }
    if (tabSignup) {
      tabSignup.classList.add('active');
      tabSignup.setAttribute('aria-selected', 'true');
    }

    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.add('active');

    if (authTitle) authTitle.textContent = 'إنشاء حساب جديد';
    if (authSubtitle) authSubtitle.textContent = 'أدخل بياناتك لإنشاء حساب والبدء بالتسوق';
  } else {
    if (neuTabSwitch) neuTabSwitch.classList.remove('signup-mode');
    if (tabSignup) {
      tabSignup.classList.remove('active');
      tabSignup.setAttribute('aria-selected', 'false');
    }
    if (tabLogin) {
      tabLogin.classList.add('active');
      tabLogin.setAttribute('aria-selected', 'true');
    }

    if (signupForm) signupForm.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');

    if (authTitle) authTitle.textContent = 'أهلاً بك مجدداً';
    if (authSubtitle) authSubtitle.textContent = 'يرجى تسجيل الدخول للمتابعة';
  }
}

if (tabLogin) {
  tabLogin.addEventListener('click', (e) => {
    e.preventDefault();
    switchMode('login');
  });
}

if (tabSignup) {
  tabSignup.addEventListener('click', (e) => {
    e.preventDefault();
    switchMode('signup');
  });
}

// ── Password Visibility Toggles ──
document.querySelectorAll('.toggle-password-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('.password-field');
    const icon = btn.querySelector('i');
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'far fa-eye-slash';
      btn.setAttribute('aria-label', 'إخفاء كلمة المرور');
    } else {
      input.type = 'password';
      icon.className = 'far fa-eye';
      btn.setAttribute('aria-label', 'إظهار كلمة المرور');
    }
  });
});

// ── Validation: Username (3+ chars/numbers) & Password (6+ chars/numbers) ──
function validateUsername(u) {
  if (!u || u.length < 3) return 'اسم المستخدم 3 خانات على الأقل';
  if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(u)) {
    return 'أحرف وأرقام فقط';
  }
  return null;
}

function validatePassword(p) {
  if (!p || p.length < 6) return 'كلمة المرور 6 خانات على الأقل';
  return null;
}

// ── Live Username Validation in Signup ──
const signupUsernameInput = document.getElementById('signup-username');
const usernameStatus      = document.getElementById('usernameStatus');

if (signupUsernameInput && usernameStatus) {
  signupUsernameInput.addEventListener('input', () => {
    const val = signupUsernameInput.value.trim();
    if (!val) {
      usernameStatus.innerHTML = '';
      usernameStatus.className = 'neu-val-status';
      return;
    }
    const err = validateUsername(val);
    if (!err) {
      usernameStatus.innerHTML = '<i class="fas fa-check-circle"></i>';
      usernameStatus.className = 'neu-val-status valid';
    } else {
      usernameStatus.innerHTML = '<i class="fas fa-times-circle"></i>';
      usernameStatus.className = 'neu-val-status invalid';
    }
  });
}

// ── Forgot Password Helper ──
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', () => {
    showError('تواصل مع الدعم الفني لاستعادة كلمة المرور.');
  });
}

// ── Error Alert Helper ──
function showError(msg) {
  if (!errBox) return;
  if (alertMsg) alertMsg.textContent = msg;
  else errBox.textContent = msg;
  errBox.classList.remove('hidden');
}

function hideError() {
  if (!errBox) return;
  if (alertMsg) alertMsg.textContent = '';
  else errBox.textContent = '';
  errBox.classList.add('hidden');
}

// ── Button Loading State ──
function setButtonLoading(btn, isLoading, defaultText) {
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span>جارٍ المعالجة...</span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-text">${defaultText}</span>`;
  }
}

// ── Perform Login ──
async function doLogin(username, password, btn) {
  setButtonLoading(btn, true, 'تسجيل الدخول');
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      let errText = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      if (data.error && data.error.includes('not found')) errText = 'الحساب غير موجود';
      else if (data.error && data.error.includes('password')) errText = 'كلمة المرور غير صحيحة';
      throw new Error(errText);
    }

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userToken',  data.token);
    localStorage.setItem('userId',     data.userId);
    localStorage.setItem('username',   username);
    localStorage.setItem('justLoggedIn', 'true');

    await handlePendingCart(data.token);
  } catch (e) {
    showError(e.message);
    setButtonLoading(btn, false, 'تسجيل الدخول');
  }
}

// ── Perform Register ──
async function doRegister(username, password, btn) {
  setButtonLoading(btn, true, 'إنشاء الحساب');
  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      let errText = 'تعذر إنشاء الحساب، يرجى المحاولة ثانية';
      if (data.error && (data.error.includes('exists') || data.error.includes('already'))) {
        errText = 'اسم المستخدم مسجل مسبقاً، اختر اسماً آخر';
      }
      throw new Error(errText);
    }

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userToken',  data.token);
    localStorage.setItem('userId',     data.userId);
    localStorage.setItem('username',   username);
    localStorage.setItem('justLoggedIn', 'true');

    await handlePendingCart(data.token);
  } catch (e) {
    showError(e.message);
    setButtonLoading(btn, false, 'إنشاء الحساب');
  }
}

// ── Form Submit Event Listeners ──
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('loginSubmitBtn');

    const uErr = validateUsername(username);
    if (uErr) return showError(uErr);

    const pErr = validatePassword(password);
    if (pErr) return showError(pErr);

    await doLogin(username, password, btn);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const btn      = document.getElementById('signupSubmitBtn');

    const uErr = validateUsername(username);
    if (uErr) return showError(uErr);

    const pErr = validatePassword(password);
    if (pErr) return showError(pErr);

    await doRegister(username, password, btn);
  });
}

// ── Handle Pending Cart Additions ──
async function handlePendingCart(token) {
  const pending = localStorage.getItem('pendingCartAdd');
  if (pending) {
    try {
      let pendingItem = JSON.parse(pending);
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const idx = cart.findIndex(i => i.id === pendingItem.id);
      if (idx >= 0) cart[idx].quantity += pendingItem.quantity;
      else cart.push(pendingItem);
      
      const res = await fetch(`${API}/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cart })
      });
      if (res.ok) {
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    } catch (e) {
      console.error('Pending cart error:', e);
    }
    localStorage.removeItem('pendingCartAdd');
  }
  const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/';
  localStorage.removeItem('redirectAfterLogin');
  location.replace(redirectUrl);
}
