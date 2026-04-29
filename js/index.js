// ================================================================
// index.js — MyOrders | الصفحة الرئيسية
// ================================================================

const products = [
  {
    id:    "p6",
    name:  "كاميرا مراقبة ذكية",
    price: 20000,
    image: "/images/x6a.webp",
    link:  "/p/x6.html",
  },
  {
      id:    "p2",
    name:  "لمبة بعوض لون بنفسجي",
    price: 15000,
    image: "/images/x2a.webp",
    link:  "/p/x2.html"
  },
  {
      id:    "p3",
    name:  "قاصة",
    price: 50000,
    image: "/images/x3a.webp",
    link:  "/p/x3.html"
  },
  {
      id:    "p4",
    name:  "سماعات بلوتوث احترافية",
    price: 25000,
    image: "/images/x4a.webp",
    link:  "/p/x4.html"
  },
    {
    id:    "p1",
    name:  "مبردة شحن Embleme",
    price: 160000,
    image: "/images/x1a.webp",
    link:  "/p/x1.html",
    outOfStock: true // 👈 هذا هو السطر السحري للتحكم بالمنتج
    }
];

// ── Toast ──
function showToast(msg, type = "success") {
  let w = document.getElementById("toast-wrap");
  if (!w) { w = document.createElement("div"); w.id="toast-wrap"; document.body.appendChild(w); }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = ({success:"✅",error:"❌"}[type]||"") + " " + msg;
  w.appendChild(t);
  setTimeout(() => { t.classList.add("out"); t.addEventListener("animationend",()=>t.remove(),{once:true}); }, 2600);
}

// ── مودال تأكيد الإضافة (Bottom Sheet) ──
function showAddedModal(productName) {
  let modal = document.getElementById("added-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "added-modal";
    modal.style.cssText = `
      display:none; position:fixed; inset:0;
      background:rgba(0,0,0,.6); backdrop-filter:blur(8px);
      z-index:9000; align-items:flex-end; justify-content:center;`;
    modal.innerHTML = `
      <div style="
        background:#111a14; border:1px solid rgba(34,197,94,.15);
        border-radius:20px 20px 0 0; width:100%; max-width:520px;
        padding:24px 20px 32px; display:flex; flex-direction:column;
        align-items:center; gap:14px;
        animation:sheetUp .3s cubic-bezier(.34,1.56,.64,1) both;
        font-family:'Tajawal',sans-serif;">
        <style>
          @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        </style>
        <div style="font-size:2.2rem;">🛒</div>
        <div style="font-size:1.1rem;font-weight:800;color:#e6f4ec;text-align:center;">تمت الإضافة بنجاح!</div>
        <div id="added-sub" style="font-size:.87rem;color:#6b8c77;text-align:center;"></div>
        <div style="display:flex;gap:10px;width:100%;">
          <button onclick="window.location.href='/checkout.html'" style="
            flex:1;padding:13px;background:#22c55e;color:#000;
            border:none;border-radius:12px;font-family:'Tajawal',sans-serif;
            font-size:.95rem;font-weight:800;cursor:pointer;">
            انتقل للسلة ←
          </button>
          <button onclick="document.getElementById('added-modal').style.display='none';document.body.style.overflow='';" style="
            flex:1;padding:13px;background:#1a2820;color:#e6f4ec;
            border:1.5px solid rgba(255,255,255,.07);border-radius:12px;
            font-family:'Tajawal',sans-serif;font-size:.95rem;font-weight:700;cursor:pointer;">
            استمرار التسوق
          </button>
        </div>
      </div>`;
    modal.addEventListener("click", e => {
      if (e.target === modal) { modal.style.display="none"; document.body.style.overflow=""; }
    });
    document.body.appendChild(modal);
  }
  const sub = modal.querySelector("#added-sub");
  if (sub) sub.textContent = `"${productName}" أُضيف لسلتك`;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

// ── بناء البطاقات ──
function buildCards() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  products.forEach((p, i) => {
    const isOut = p.outOfStock === true;
    const card = document.createElement("div");
    card.className = "product-card scroll-reveal";
    card.style.animationDelay = `${i * 0.07}s`;
    
    // تغيير التنسيق بناءً على التوفر
    const imgStyle = isOut ? "opacity: 0.5; filter: grayscale(50%);" : "";
    const btnStyle = isOut ? "background: #333; color: #888; border: none; cursor: not-allowed;" : "";
    const btnText  = isOut ? "🚫 نفدت الكمية" : "🛒 أضف للسلة";
    const disabledAttr = isOut ? "disabled" : "";

    card.innerHTML = `
      <div class="product-image" style="${imgStyle}">
        <div class="img-placeholder"></div>
        <img class="product-img" data-src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-info">
        <div class="product-title">${p.name}</div>
        <div class="price">${p.price.toLocaleString("en-UK")} <span class="price-unit">د.ع</span></div>
        <div class="product-actions">
          <button class="add-to-cart-btn" ${disabledAttr} style="${btnStyle}"
            data-id="${p.id}" data-name="${p.name}" data-price="${p.price}">
            ${btnText}
          </button>
        </div>
      </div>`;

    // lazy load
    const img      = card.querySelector(".product-img");
    const shimmer = card.querySelector(".img-placeholder");
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      img.src = img.dataset.src;
      img.onload  = () => { img.classList.add("loaded"); shimmer.remove(); };
      img.onerror = () => shimmer.remove();
      io.disconnect();
    }, { rootMargin:"120px" });
    io.observe(img);

    // نقرة على البطاقة (يتم إيقافها إذا نفدت الكمية)
    card.addEventListener("click", e => {
      if (isOut) return; // يمنع فتح صفحة المنتج إذا نفدت الكمية
      if (e.target.closest(".add-to-cart-btn")) return;
      window.location.href = p.link;
    });

    // زر الإضافة
    const btnEl = card.querySelector(".add-to-cart-btn");
    if (!isOut) {
      btnEl.addEventListener("click", async function(e) {
        e.stopPropagation();
        await handleAdd(this, p);
      });
    } else {
      // منع أي تفعيل بالغلط للزر المعطل
      btnEl.addEventListener("click", e => e.stopPropagation());
    }

    grid.appendChild(card);
  });

  initScrollReveal();
}

// ── إضافة للسلة ──
async function handleAdd(btn, p) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const token      = localStorage.getItem("userToken");

  if (!isLoggedIn || !token) {
    showToast("يجب تسجيل الدخول أولاً", "error");
    setTimeout(() => { window.location.href = "/enter.html"; }, 1600);
    return;
  }

  if (btn.disabled) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⏳ جارٍ...";

  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const idx = cart.findIndex(i => i.id === p.id);
  idx >= 0 ? cart[idx].quantity++ : cart.push({ id:p.id, name:p.name, price:p.price, quantity:1 });

  try {
    const res = await fetch("https://login.0xkanba.workers.dev/cart", {
      method: "PUT",
      headers: { "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ cart })
    });
    if (!res.ok) throw new Error();

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    showAddedModal(p.name);

    btn.textContent = "✓ تمت الإضافة";
    btn.style.cssText = "background:var(--green);color:#000;border-color:var(--green)";
    setTimeout(() => { btn.textContent=orig; btn.style.cssText=""; btn.disabled=false; }, 3000);

  } catch {
    showToast("حدث خطأ، حاول مجدداً", "error");
    btn.textContent = orig; btn.disabled = false;
  }
}

function updateCartCount() {
  const total = JSON.parse(localStorage.getItem("cart")||"[]").reduce((s,i)=>s+i.quantity,0);
  const el = document.querySelector(".cart-count");
  if (!el) return;
  el.textContent = total;
  total === 0 ? el.classList.add("no-items") : el.classList.remove("no-items");
}

function initScrollReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); } });
  }, { threshold:.1 });
  document.querySelectorAll(".scroll-reveal").forEach(el => io.observe(el));
}

window.auth = window.auth || {
  isLoggedIn: !!localStorage.getItem("isLoggedIn"),
  token: localStorage.getItem("userToken") || null,
};

document.addEventListener("DOMContentLoaded", () => {
  buildCards();
  updateCartCount();
  document.addEventListener("cart-updated", updateCartCount);
  window.addEventListener("load", () => {
    setTimeout(() => document.body.classList.add("loaded"), 400);
  });
});

window.updateCartCount = updateCartCount;
