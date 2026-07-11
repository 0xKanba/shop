// ================================================================
// worker.js — MyOrders Auth & Cart API + Telegram Orders
// المسارات:
//   POST /login    — تسجيل الدخول (username + password)
//   POST /register — إنشاء حساب   (username + password)
//   GET|PUT|DELETE /cart  — السلة
//   POST /order    — إرسال طلب → تيليجرام
//   GET|PUT /user  — بيانات المستخدم
//   GET  /debug    — فحص الـ Secrets
// ================================================================

const JWT_SECRET = 'e5d7f3a2c1b09876543210fedcba9876543210abcdef1234567890abcdef12';

// ─────────────────────────────────────
// JWT
// ─────────────────────────────────────
async function createJWT(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const b64 = s => btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header  = b64(JSON.stringify({ alg:'HS256', typ:'JWT' }));
  const body    = b64(JSON.stringify(payload));
  const sig     = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  const b64sig  = b64(String.fromCharCode(...new Uint8Array(sig)));
  return `${header}.${body}.${b64sig}`;
}

async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(
      atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${h}.${p}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return payload;
  } catch { return null; }
}

// ─────────────────────────────────────
// كلمة المرور
// ─────────────────────────────────────
async function hashPassword(password) {
  const enc  = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, km, 256
  );
  const b64 = arr => btoa(String.fromCharCode(...arr));
  return { hash: b64(new Uint8Array(hash)), salt: b64(salt) };
}

async function verifyPassword(password, storedHash, storedSalt) {
  try {
    const enc  = new TextEncoder();
    const salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));
    const km   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits(
      { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, km, 256
    );
    const a = new Uint8Array(hash);
    const b = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch { return false; }
}

// ─────────────────────────────────────
// مساعد الاستجابة
// ─────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age':       '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

function corsOK() {
  return new Response(null, { status: 204, headers: CORS });
}

// ─────────────────────────────────────
// تسجيل الدخول — username + password
// ─────────────────────────────────────
async function handleLogin(req, env) {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const username = (body.username || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  if (!username || !password)
    return json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, 400);

  const raw = await env.users.get(`user_${username}`);
  if (!raw) return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);

  const user = JSON.parse(raw);
  const ok   = await verifyPassword(password, user.passwordHash, user.salt);
  if (!ok)   return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);

  const token = await createJWT(
    { sub: user.id, username: user.username, exp: Math.floor(Date.now()/1000) + 60*60*24*7 },
    JWT_SECRET
  );
  return json({ token, userId: user.id });
}

// ─────────────────────────────────────
// إنشاء حساب — username + password
// ─────────────────────────────────────
async function handleRegister(req, env) {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const username = (body.username || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  if (!username || !password)
    return json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, 400);

  if (username.length < 3)
    return json({ error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' }, 400);

  if (password.length < 6)
    return json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, 400);

  // لا يسمح إلا بحروف وأرقام وشرطة سفلية
  if (!/^[a-z0-9_]+$/.test(username))
    return json({ error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' }, 400);

  const key = `user_${username}`;
  if (await env.users.get(key))
    return json({ error: 'اسم المستخدم مستخدم بالفعل' }, 409);

  const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  const { hash: passwordHash, salt } = await hashPassword(password);

  await env.users.put(key, JSON.stringify({
    id: userId, username,
    passwordHash, salt,
    createdAt: new Date().toISOString()
  }));

  const token = await createJWT(
    { sub: userId, username, exp: Math.floor(Date.now()/1000) + 60*60*24*7 },
    JWT_SECRET
  );
  return json({ token, userId }, 201);
}

// ─────────────────────────────────────
// السلة
// ─────────────────────────────────────
async function handleCart(req, env) {
  const payload = await authGuard(req);
  if (!payload) return json({ error: 'غير مصرح' }, 401);

  const cartKey = `cart_${payload.sub}`;

  if (req.method === 'GET') {
    const raw  = await env.carts.get(cartKey);
    return json({ cart: raw ? JSON.parse(raw) : [] });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!Array.isArray(body.cart)) return json({ error: 'بيانات السلة غير صالحة' }, 400);
    await env.carts.put(cartKey, JSON.stringify(body.cart));
    return json({ success: true });
  }

  if (req.method === 'DELETE') {
    await env.carts.delete(cartKey);
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────
// الطلب → تيليجرام
// ─────────────────────────────────────
async function handleOrder(req, env) {
  const payload = await authGuard(req);
  if (!payload) return json({ error: 'غير مصرح' }, 401);
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // التحقق من وجود الـ Secrets
  if (!env.BOT_TOKEN || !env.CHAT_ID) {
    return json({ 
      error: 'غير مصرح',
      details: 'Missing BOT_TOKEN or CHAT_ID secrets. Please add them in Cloudflare Dashboard.',
      hasBotToken: !!env.BOT_TOKEN,
      hasChatId: !!env.CHAT_ID
    }, 401);
  }

  let order;
  try { order = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  if (!order.customerName || !order.phoneNumber || !order.address || !order.items?.length)
    return json({ error: 'بيانات الطلب ناقصة' }, 400);

  const lines = [
    `🛒 *طلب جديد — MyOrders*`,
    `👤 الاسم: ${order.customerName}`,
    `📞 الهاتف: ${order.phoneNumber}`,
    `📍 العنوان: ${order.address}`,
    order.notes ? `📝 ملاحظات: ${order.notes}` : null,
    `\n🧾 *المنتجات:*`,
    ...order.items.map(i => `• ${i.name}  ×${i.quantity}  — ${Number(i.price*i.quantity).toLocaleString()} د.ع`),
    `\n💰 *المجموع: ${Number(order.total).toLocaleString()} د.ع*`,
    `📦 الكمية الإجمالية: ${order.quantity}`,
    `🕐 ${new Date().toLocaleString('ar-IQ')}`,
  ].filter(Boolean).join('\n');

  // دعم Chat ID واحد أو متعددة
  const chatIds = Array.isArray(env.CHAT_ID) 
    ? env.CHAT_ID 
    : [env.CHAT_ID];

  const results = await Promise.allSettled(
    chatIds.map(id =>
      fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text: lines, parse_mode: 'Markdown' })
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  if (sent === 0) return json({ error: 'فشل إرسال الطلب' }, 500);

  await env.carts.delete(`cart_${payload.sub}`);
  return json({ success: true });
}

// ─────────────────────────────────────
// المستخدم
// ─────────────────────────────────────
async function handleUser(req, env) {
  const payload = await authGuard(req);
  if (!payload) return json({ error: 'غير مصرح' }, 401);

  const key = `user_${payload.username}`;

  if (req.method === 'GET') {
    const raw = await env.users.get(key);
    if (!raw) return json({ error: 'المستخدم غير موجود' }, 404);
    const { passwordHash, salt, ...safe } = JSON.parse(raw);
    return json({ user: safe });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const raw = await env.users.get(key);
    if (!raw) return json({ error: 'المستخدم غير موجود' }, 404);
    const user = JSON.parse(raw);
    if (body.name)    user.name    = body.name;
    if (body.phone)   user.phone   = body.phone;
    if (body.address) user.address = body.address;
    await env.users.put(key, JSON.stringify(user));
    const { passwordHash, salt, ...safe } = user;
    return json({ user: safe });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────
// نقطة التصحيح — لفحص الـ Secrets
// ─────────────────────────────────────
async function handleDebug(req, env) {
  return json({
    hasBotToken: !!env.BOT_TOKEN,
    hasChatId: !!env.CHAT_ID,
    botTokenLength: env.BOT_TOKEN ? env.BOT_TOKEN.length : 0,
    chatId: env.CHAT_ID || 'not set',
    chatIdType: typeof env.CHAT_ID,
    message: env.BOT_TOKEN && env.CHAT_ID 
      ? '✅ Secrets are configured correctly' 
      : '❌ Missing BOT_TOKEN or CHAT_ID. Add them as Secrets in Cloudflare Dashboard.'
  });
}

// ─────────────────────────────────────
// مساعد Auth
// ─────────────────────────────────────
async function authGuard(req) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7), JWT_SECRET);
}

// ─────────────────────────────────────
// الموجّه الرئيسي
// ─────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsOK();
    const path = new URL(request.url).pathname;
    try {
      switch (path) {
        case '/login':    return handleLogin(request, env);
        case '/register': return handleRegister(request, env);
        case '/cart':     return handleCart(request, env);
        case '/order':    return handleOrder(request, env);
        case '/user':     return handleUser(request, env);
        case '/debug':    return handleDebug(request, env);
        default:          return json({ error: 'Not found' }, 404);
      }
    } catch (e) {
      console.error(e);
      return json({ error: 'Internal server error' }, 500);
    }
  }
};
