// ── Toast ──
function showToast(msg, type = "success") {
  let w = document.getElementById("toast-wrap");
  if (!w) {
    w = document.createElement("div");
    w.id = "toast-wrap";
    document.body.appendChild(w);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = type === "success" 
    ? `<i class="fas fa-check-circle" style="color:var(--primary); font-size:1.2rem;"></i> ${msg}`
    : `<i class="fas fa-exclamation-circle" style="color:#ef4444; font-size:1.2rem;"></i> ${msg}`;
  w.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ── App ──
async function init() {
  try {
    const res = await fetch('/data/products.json');
    if (!res.ok) throw new Error("Failed to load products");
    const products = await res.json();
    renderProducts(products);
  } catch (e) {
    console.error(e);
  }
}

function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  products.forEach((p, idx) => {
    const isOut = p.outOfStock === true;
    const btnText = isOut ? "نفدت الكمية" : "أضف للسلة";
    const disabledAttr = isOut ? "disabled" : "";
    const imgStyle = isOut ? "filter: grayscale(1) opacity(0.6);" : "";
    const btnStyle = isOut ? "background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.3);" : "";

    const card = document.createElement("div");
    card.className = isOut ? "card card-out-of-stock" : "card";
    card.style.animationDelay = `${idx * 0.05}s`;
    
    card.innerHTML = `
      <div class="card-img" style="${imgStyle}">
        <img class="img" src="${p.image}" alt="${p.title}" loading="lazy">
        ${isOut ? `<div class="out-of-stock-badge"><span class="out-of-stock-text">نفدت الكمية</span></div>` : ''}
      </div>
      <div class="card-title">${p.title}</div>
      <hr class="card-divider">
      <div class="card-footer">
        <div class="card-price">${p.price.toLocaleString("en-US")} <span>د.ع</span></div>
        <button class="card-btn add-to-cart-btn" ${disabledAttr} style="${btnStyle}"
          data-id="${p.id}" data-name="${p.title}" data-price="${p.price}">
          <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m397.78 316h-205.13a15 15 0 0 1 -14.65-11.67l-34.54-150.48a15 15 0 0 1 14.62-18.36h274.27a15 15 0 0 1 14.65 18.36l-34.6 150.48a15 15 0 0 1 -14.62 11.67zm-193.19-30h181.25l27.67-120.48h-236.6z"></path><path d="m222 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path><path d="m368.42 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path><path d="m158.08 165.49a15 15 0 0 1 -14.23-10.26l-25.71-77.23h-47.44a15 15 0 1 1 0-30h58.3a15 15 0 0 1 14.23 10.26l29.13 87.49a15 15 0 0 1 -14.23 19.74z"></path></svg>
        </button>
      </div>
    `;

    const triggerShake = () => {
      card.classList.remove("shake-out-of-stock");
      void card.offsetWidth; // trigger reflow
      card.classList.add("shake-out-of-stock");
      showToast(`عذراً، هذا المنتج (${p.title}) نفذت كميته من المخزون!`, "error");
      setTimeout(() => {
        card.classList.remove("shake-out-of-stock");
      }, 600);
    };

    card.addEventListener("click", e => {
      if (isOut) {
        e.preventDefault();
        e.stopPropagation();
        triggerShake();
        return;
      }
      if (e.target.closest(".add-to-cart-btn")) return;
      window.location.href = '/product?id=' + p.id;
    });

    const btn = card.querySelector(".add-to-cart-btn");
    if (btn) {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (isOut) {
          triggerShake();
          return;
        }
        addToCart(p, btn);
      });
    }

    grid.appendChild(card);
    setTimeout(() => card.classList.add("revealed"), 50);
  });

  document.body.classList.add("loaded");
}

function addToCart(p, btn) {
  const orig = btn.innerHTML;

  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const idx = cart.findIndex(i => i.id === p.id);
  idx >= 0 ? cart[idx].quantity++ : cart.push({ id: p.id, name: p.title, price: p.price, quantity: 1 });

  localStorage.setItem("cart", JSON.stringify(cart));
  if (window.updateCartCount) window.updateCartCount();
  showToast(`تمت إضافة "${p.title}" للسلة`);

  btn.innerHTML = '<i class="fas fa-check"></i>';
  btn.classList.add("dancing");

  if (window.confetti) {
    try {
      const rect = btn.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { x, y },
        colors: ['#10b981', '#2d8cf0', '#f59e0b']
      });
    } catch (e) {}
  }

  setTimeout(() => {
    btn.innerHTML = orig;
    btn.classList.remove("dancing");
  }, 1200);

  // Background Cloud Sync without blocking the user
  const token = localStorage.getItem("userToken");
  if (token) {
    fetch("https://login.kanba.pw/cart", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ cart })
    }).catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
