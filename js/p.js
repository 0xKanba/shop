// ================================================================
// p.js — صفحة المنتج | MyOrders
// ================================================================

// ── Toast ──
function showToast(msg, type = "success") {
  let w = document.getElementById("toast-wrap");
  if (!w) { w = document.createElement("div"); w.id = "toast-wrap"; document.body.appendChild(w); }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = ({ success:"✅", error:"❌" }[type]||"") + " " + msg;
  w.appendChild(t);
  setTimeout(() => { t.classList.add("out"); t.addEventListener("animationend",()=>t.remove(),{once:true}); }, 2800);
}

// ── مودال تأكيد (sheet من الأسفل) ──
function showConfirmSheet(productName) {
  let modal = document.getElementById("confirm-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.innerHTML = `
      <div class="confirm-sheet">
        <div class="confirm-icon">🛒</div>
        <div class="confirm-title">تمت الإضافة بنجاح!</div>
        <div class="confirm-sub" id="confirm-sub-text"></div>
        <div class="confirm-btns">
          <button class="c-btn go"   onclick="goToCart()">انتقل للسلة ←</button>
          <button class="c-btn stay" onclick="closeConfirm()">استمرار التسوق</button>
        </div>
      </div>`;
    modal.addEventListener("click", e => { if (e.target === modal) closeConfirm(); });
    document.body.appendChild(modal);
  }
  const sub = modal.querySelector("#confirm-sub-text");
  if (sub) sub.textContent = `"${productName}" في سلتك`;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeConfirm() {
  const m = document.getElementById("confirm-modal");
  if (m) { m.style.display = "none"; document.body.style.overflow = ""; }
}
function goToCart() {
  window.location.href = "/checkout.html";
}

// ── مودال صورة كاملة ──
function openModal(src) {
  const m = document.getElementById("img-modal");
  const i = document.getElementById("modal-img");
  if (!m || !i) return;
  i.src = src;
  m.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeModal() {
  const m = document.getElementById("img-modal");
  if (m) m.style.display = "none";
  document.body.style.overflow = "";
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(); closeConfirm(); }
});

// ── عداد الكمية ──
function changeQty(d) {
  const el = document.getElementById("qty");
  if (el) el.textContent = Math.max(1, (parseInt(el.textContent)||1) + d);
}

// ── إضافة للسلة ──
async function addToCart() {
  const btn  = document.getElementById("add-to-cart-btn");
  const qty  = parseInt(document.getElementById("qty")?.textContent || "1");

  // التحقق من تسجيل الدخول
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const token      = localStorage.getItem("userToken");

  if (!isLoggedIn || !token) {
    showToast("يجب تسجيل الدخول أولاً", "error");
    setTimeout(() => { window.location.href = "/enter.html"; }, 1600);
    return;
  }

  if (btn?.disabled) return;
  const origHTML = btn?.innerHTML || "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
  }

  const id    = btn?.dataset.productId    || "p1";
  const name  = btn?.dataset.productName  || "المنتج";
  const price = parseFloat(btn?.dataset.productPrice || "0");

  try {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const idx = cart.findIndex(i => i.id === id);
    idx >= 0 ? cart[idx].quantity += qty : cart.push({ id, name, price, quantity: qty });

    const res = await fetch("https://login.0xkanba.workers.dev/cart", {
      method: "PUT",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ cart })
    });
    if (!res.ok) throw new Error(`${res.status}`);

    localStorage.setItem("cart", JSON.stringify(cart));
    document.dispatchEvent(new Event("cart-updated"));

    // إعادة الزر وإظهار مودال التأكيد
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i><span>تمت الإضافة</span>';
      btn.style.background = "#16a34a";
    }
    showConfirmSheet(name);

    // إعادة الزر بعد 3 ثواني
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHTML;
        btn.style.background = "";
      }
    }, 3000);

  } catch (err) {
    console.error(err);
    showToast("حدث خطأ، حاول مجدداً", "error");
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; btn.style.background = ""; }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // تحديث عداد السلة إن وجد في الصفحة
  const cart  = JSON.parse(localStorage.getItem("cart") || "[]");
  const total = cart.reduce((s, i) => s + i.quantity, 0);
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = total;
    total === 0 ? el.classList.add("no-items") : el.classList.remove("no-items");
  });
});
