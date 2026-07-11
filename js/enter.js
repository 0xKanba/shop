// ================================================================
// enter.js — تسجيل الدخول وإنشاء الحساب | username + password
// ================================================================

const API = 'https://login.kanba.pw';

const panel  = document.getElementById('panel');
const forms  = [...panel.querySelectorAll('.form')];
const errBox = document.getElementById('error');

// ── نجوم الخلفية ──
(function stars() {
  const el = document.getElementById('stars');
  if (!el) return;
  for (let i = 0; i < 160; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left   = Math.random() * 100 + '%';
    s.style.top    = Math.random() * 100 + '%';
    const sz = Math.random() * 2.5;
    s.style.width  = sz + 'px';
    s.style.height = sz + 'px';
    s.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
    el.appendChild(s);
  }
})();

// ── التبديل بين النماذج ──
function showForm(id) {
  forms.forEach(f => f.classList.toggle('active', f.id === id));
  hideError();
}

panel.addEventListener('click', e => {
  if (e.target.classList.contains('flip'))
    showForm(e.target.dataset.to + 'Form');
});

// ── عرض الخطأ ──
function showError(msg) {
  errBox.textContent = msg;
  errBox.classList.remove('hidden');
}
function hideError() {
  errBox.textContent = '';
  errBox.classList.add('hidden');
}

// ── تحقق من اسم المستخدم ──
function validateUsername(u) {
  if (u.length < 3) return 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
  if (!/^[a-z0-9_]+$/.test(u)) return 'يُسمح فقط بـ: أحرف إنجليزية، أرقام، شرطة سفلية';
  return null;
}

// ── تسجيل الدخول ──
async function doLogin(username, password, btn) {
  btn.disabled = true; btn.textContent = 'جارٍ...';
  try {
    const res  = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userToken',  data.token);
    localStorage.setItem('userId',     data.userId);
    localStorage.setItem('username',   username);

    await handlePendingCart(data.token);
  } catch (e) {
    showError(e.message);
    btn.disabled = false; btn.textContent = 'تسجيل الدخول';
  }
}

// ── إنشاء الحساب ──
async function doRegister(username, password, btn) {
  btn.disabled = true; btn.textContent = 'جارٍ...';
  try {
    const res  = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل إنشاء الحساب');

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userToken',  data.token);
    localStorage.setItem('userId',     data.userId);
    localStorage.setItem('username',   username);

    await handlePendingCart(data.token);
  } catch (e) {
    showError(e.message);
    btn.disabled = false; btn.textContent = 'إنشاء حساب';
  }
}

// ── Submit ──
panel.addEventListener('submit', async e => {
  e.preventDefault();
  hideError();
  const form = e.target;
  const btn  = form.querySelector('button[type=submit]');

  if (form.id === 'loginForm') {
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    if (!username || !password) return showError('يرجى تعبئة جميع الحقول');
    await doLogin(username, password, btn);
  }

  if (form.id === 'signupForm') {
    const username = document.getElementById('signup-username').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;
    if (!username || !password) return showError('يرجى تعبئة جميع الحقول');
    const err = validateUsername(username);
    if (err) return showError(err);
    if (password.length < 6) return showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    await doRegister(username, password, btn);
  }
});


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
      console.error(e);
    }
    localStorage.removeItem('pendingCartAdd');
  }
  const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/';
  localStorage.removeItem('redirectAfterLogin');
  location.replace(redirectUrl);
}
