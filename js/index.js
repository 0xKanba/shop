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
    card.className = "product-card";
    card.style.animationDelay = `${idx * 0.05}s`;
    
    card.innerHTML = `
      <div class="product-image" style="${imgStyle}">
        <img class="product-img" src="${p.image}" alt="${p.title}" loading="lazy">
      </div>
      <div class="product-info">
        <div class="product-title">${p.title}</div>
        <div class="price">${p.price.toLocaleString("en-US")} <span class="price-unit">د.ع</span></div>
        <div class="product-actions">
          <button class="add-to-cart-btn" ${disabledAttr} style="${btnStyle}"
            data-id="${p.id}" data-name="${p.title}" data-price="${p.price}">
            <i class="fas fa-cart-plus"></i> ${btnText}
          </button>
        </div>
      </div>
    `;

    card.addEventListener("click", e => {
      if (isOut) return;
      if (e.target.closest(".add-to-cart-btn")) return;
      window.location.href = '/product.html?id=' + p.id;
    });

    const btn = card.querySelector(".add-to-cart-btn");
    if (btn) {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (isOut) return;
        addToCart(p, btn);
      });
    }

    grid.appendChild(card);
    setTimeout(() => card.classList.add("revealed"), 50);
  });

  document.body.classList.add("loaded");
}

async function addToCart(p, btn) {
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const idx = cart.findIndex(i => i.id === p.id);
  idx >= 0 ? cart[idx].quantity++ : cart.push({ id:p.id, name:p.title, price:p.price, quantity:1 });

  try {
    const res = await fetch("https://login.kanba.pw/cart", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("userToken")}`
      },
      body: JSON.stringify({ cart })
    });
    if (!res.ok) throw new Error();
    localStorage.setItem("cart", JSON.stringify(cart));
    if (window.updateCartCount) window.updateCartCount();
    showToast(`تمت إضافة "${p.title}" للسلة`);
    
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.style.cssText = "background:var(--primary);color:#000;border-color:var(--primary)";
    setTimeout(() => { btn.innerHTML = orig; btn.style.cssText = ""; btn.disabled = false; }, 2000);
  } catch (e) {
    localStorage.setItem("cart", JSON.stringify(cart));
    if (window.updateCartCount) window.updateCartCount();
    showToast(`تمت إضافة "${p.title}" (محلياً)`);
    
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
  }
}

document.addEventListener("DOMContentLoaded", init);
