document.addEventListener("DOMContentLoaded", function () {
  let t = document.getElementById("productsList"),
      e = document.getElementById("cartTotal"),
      n = document.getElementById("totalItems"),
      a = document.getElementById("orderTotal"),
      i = document.getElementById("orderQuantity"),
      r = document.getElementById("orderForm"),
      s = document.getElementById("submitBtn"),
      o = document.getElementById("authStatus"),
      l = document.getElementById("orderFormContainer");

  if (!document.getElementById("loadingIndicator")) {
    (function () {
      let e = document.createElement("div");
      e.id = "loadingIndicator";
      e.className = "loading-indicator";
      e.style.display = "none";
      e.innerHTML = '<div class="spinner"></div><span>جاري التحديث...</span>';
      document.body.appendChild(e);
    })();
  }

  let c = document.getElementById("confirmationModal"),
      d = document.getElementById("confirmationDetails"),
      u = document.getElementById("confirmOrder"),
      y = document.getElementById("cancelOrder"),
      m = document.getElementById("successModal"),
      p = document.getElementById("successDetails"),
      f = document.getElementById("closeSuccessBtn"),
      v = [],
      h = null,
      g = !1;

  function E(t = "جاري التحديث...") {
    let e = document.getElementById("loadingIndicator");
    if (e) { e.querySelector("span").textContent = t; e.style.display = "flex"; }
  }

  function I() {
    let t = document.getElementById("loadingIndicator");
    if (t) t.style.display = "none";
  }

  async function w() {
    try {
      let t = !!localStorage.getItem("isLoggedIn");
      t ? (o.style.display = "none", l.style.display = "block", await b()) : x();
    } catch (e) { console.error("Error:", e); x(); }
  }

  function x() {
    let t = document.querySelector(".auth-message");
    t.textContent = "يرجى تسجيل الدخول لاستكمال الطلب";
    let e = document.createElement("a");
    e.href = "/enter.html"; e.className = "login-link"; e.textContent = "الانتقال إلى صفحة تسجيل الدخول";
    while (o.firstChild) o.removeChild(o.firstChild);
    o.appendChild(t); o.appendChild(e); l.style.display = "none";
  }

  async function b() {
    try {
      let t = localStorage.getItem("userToken");
      if (!t) { v = JSON.parse(localStorage.getItem("cart") || "[]"); q(); C(); return; }
      E("جاري جلب السلة...");
      let n = await fetch("https://login.0xkanba.workers.dev/cart", {
        method: "GET", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
      });
      if (n.ok) {
        let a = await n.json(); v = a.cart || [];
        localStorage.setItem("cart", JSON.stringify(v));
      } else { v = JSON.parse(localStorage.getItem("cart") || "[]"); }
      q(); C(); I();
    } catch (r) { v = JSON.parse(localStorage.getItem("cart") || "[]"); q(); C(); I(); }
  }

  function q() {
    t.innerHTML = "";
    if (0 === v.length) {
      t.innerHTML = '<div class="empty-cart"><p>سلة التسوق فارغة</p><a href="/index.html" style="color: var(--primary-color); display: block; margin-top: 10px;">العودة للتسوق</a></div>';
      return;
    }
    v.forEach((e, n) => {
      let a = document.createElement("div"); a.className = "product-item";
      a.innerHTML = `<div class="product-info"><div class="product-name">${e.name}</div><div class="product-price">${_(e.price * e.quantity)}</div></div><div class="quantity-controls"><div class="qty-controls"><button class="qty-btn decrease" data-index="${n}">-</button><span class="qty-num">${e.quantity}</span><button class="qty-btn increase" data-index="${n}">+</button></div><button class="remove-product" data-index="${n}">🗑️</button></div>`;
      t.appendChild(a);
    });
    document.querySelectorAll(".decrease").forEach(t => { t.addEventListener("click", function () { B(parseInt(this.dataset.index)); }); });
    document.querySelectorAll(".increase").forEach(t => { t.addEventListener("click", function () { $(parseInt(this.dataset.index)); }); });
    document.querySelectorAll(".remove-product").forEach(t => { t.addEventListener("click", function () { k(parseInt(this.dataset.index)); }); });
  }

  async function B(t) { if (!g && !(v[t].quantity <= 1)) { g = !0; try { E(); v[t].quantity--; await L(); } finally { g = !1; I(); } } }
  async function $(t) { if (!g) { g = !0; try { E(); v[t].quantity++; await L(); } finally { g = !1; I(); } } }
  async function k(t) { if (!g) { g = !0; try { E(); v.splice(t, 1); await L(); } finally { g = !1; I(); } } }

  async function L() {
    localStorage.setItem("cart", JSON.stringify(v));
    q(); C(); await T();
  }

  async function T() {
    try {
      let t = localStorage.getItem("userToken"); if (!t) return;
      await fetch("https://login.0xkanba.workers.dev/cart", {
        method: "PUT", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cart: v })
      });
      document.dispatchEvent(new Event("cart-updated"));
    } catch (a) { console.error("Sync Error:", a); }
  }

  function C() {
    let total = v.reduce((s, i) => s + i.price * i.quantity, 0),
        count = v.reduce((s, i) => s + i.quantity, 0);
    e.textContent = _(total) + " د.ع"; n.textContent = count + " منتج" + (count > 1 ? "ات" : "");
    a.textContent = _(total) + " د.ع"; i.textContent = count; s.disabled = 0 === v.length;
  }

  function _(t) { return new Intl.NumberFormat("en-UK").format(t); }

  // ── تنفيذ الطلب وحذف السلة ──
  async function S() {
    if (g) return; g = !0;
    try {
      c.style.display = "none";
      E("جاري إرسال الطلب ومسح السلة...");
      
      // 1. إرسال الإيميل
      await M();

      // 2. تصفير البيانات محلياً (هنا الإصلاح)
      v = []; 
      localStorage.setItem("cart", JSON.stringify(v)); 
      
      // 3. تصفير السحابة
      await N();

      // 4. تحديث الواجهة فوراً
      q();
      C();
      document.dispatchEvent(new Event("cart-updated"));

      // 5. إظهار رسالة النجاح
      I();
      m.style.display = "flex";
      
      setTimeout(() => { window.location.href = "/index.html"; }, 4000);

    } catch (e) {
      I(); console.error("Order Failed:", e);
      alert("فشل إرسال الطلب، حاول مجدداً.");
      c.style.display = "flex";
    } finally { g = !1; }
  }

  async function N() {
    try {
      let t = localStorage.getItem("userToken"); if (!t) return;
      await fetch("https://login.0xkanba.workers.dev/cart", {
        method: "DELETE", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
      });
    } catch (n) { console.error("Cloud Clear Error:", n); }
  }

  async function M() {
    let email = "order@shop.Kanba.pw";
    let n = `تفاصيل الطلب:\\nالاسم: ${h.customerName}\\nالهاتف: ${h.phoneNumber}\\nالعنوان: ${h.address}\\nالمنتجات:\\n`;
    h.items.forEach(t => { n += `- ${t.name} (${t.quantity} قطعة)\\n`; });
    n += `\\nالمجموع: ${_(h.total)} د.ع`;

    // إرسال إلى FormSubmit (للإيميل)
    await fetch(`https://formsubmit.co/ajax/${email}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ _subject: `طلب جديد: ${h.customerName}`, الرسالة: n })
    });

    // إرسال إلى Telegram عبر Cloudflare Worker
    try {
      await fetch("https://login.0xkanba.workers.dev/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(h)
      });
    } catch (e) {
      console.error("Failed to send to Telegram:", e);
      // لا توقف العملية إذا فشل إرسال Telegram
    }
  }

  r.addEventListener("submit", function (t) {
    t.preventDefault();
    if (v.length > 0) {
      h = {
        customerName: document.getElementById("customerName").value,
        phoneNumber: document.getElementById("phoneNumber").value,
        address: document.getElementById("address").value,
        items: [...v], total: v.reduce((s, i) => s + i.price * i.quantity, 0),
        date: new Date().toISOString()
      };
      let html = "";
      h.items.forEach(t => { html += `<div class="confirmation-row"><span>${t.name}</span> <span>${t.quantity} × ${_(t.price)}</span></div>`; });
      d.innerHTML = html + `<hr><div class="confirmation-row"><b>المجموع:</b> <b>${_(h.total)} د.ع</b></div>`;
      c.style.display = "flex";
    }
  });

  u.addEventListener("click", S);
  y.addEventListener("click", () => { c.style.display = "none"; });
  f.addEventListener("click", () => { window.location.href = "/index.html"; });

  w();
});
