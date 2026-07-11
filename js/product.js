// ── Toast ──
function showToast(msg) {
  let w = document.getElementById("toast-wrap");
  if (!w) { w = document.createElement("div"); w.id = "toast-wrap"; document.body.appendChild(w); }
  const t = document.createElement("div"); t.className = "toast success";
  t.innerHTML = `<i class="fas fa-check-circle" style="color:var(--primary); font-size:1.2rem;"></i> ${msg}`;
  w.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 3000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (!productId) { window.location.href = '/'; return; }

  let currentProduct = null;
  let qty = 1;

  try {
    const res = await fetch(`/data/${productId}.json?v=${new Date().getTime()}`);
    if (!res.ok) throw new Error("Product not found");
    currentProduct = await res.json();
    renderProduct(currentProduct);
  } catch (e) {
    document.querySelector('.page-wrap').innerHTML = `<h2 style="text-align:center; padding: 40px;">المنتج غير موجود</h2>`;
    document.querySelector('.page-wrap').style.display = "block";
    document.body.classList.add('loaded');
  }

  function renderProduct(p) {
    document.getElementById("prodName").textContent = p.title;
    document.getElementById("prodPrice").textContent = new Intl.NumberFormat("en-US").format(p.price);
    document.getElementById("prodDesc").textContent = p.description || "";
    
    // Specs
    const sg = document.getElementById("specsGrid");
    sg.innerHTML = "";
    if (p.features) {
      for (let [k, v] of Object.entries(p.features)) {
        sg.innerHTML += `<div class="spec-item"><div class="spec-key">${k}</div><div class="spec-val">${v}</div></div>`;
      }
    }

    // Images
    const mainImg = document.getElementById("mainImage");
    const tr = document.getElementById("thumbsRow");
    tr.innerHTML = "";
    if (p.images && p.images.length > 0) {
      mainImg.src = p.images[0];
      p.images.forEach((img, idx) => {
        const d = document.createElement("div");
        d.className = `thumb-card ${idx === 0 ? 'active' : ''}`;
        d.innerHTML = `<img src="${img}">`;
        d.onclick = () => {
          mainImg.src = img;
          document.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('active'));
          d.classList.add('active');
        };
        tr.appendChild(d);
      });
    }

    // Out of stock
    const actionsBar = document.getElementById("actionsBar");
    if (p.outOfStock) {
      actionsBar.innerHTML = `<div style="width:100%; text-align:center; padding:12px; color:#ef4444; font-weight:800;">نفدت الكمية</div>`;
    }

    document.getElementById("productContainer").style.display = "block";
    document.body.classList.add("loaded");
  }

  // Gallery Modal
  const modal = document.getElementById("gallery-modal");
  const modalImg = document.getElementById("modalImg");
  let currentImageIndex = 0;

  function updateModalImage() {
    if(currentProduct && currentProduct.images) {
      modalImg.src = currentProduct.images[currentImageIndex];
    }
  }

  document.getElementById("mainImageWrap").onclick = () => {
    if(currentProduct && currentProduct.images) {
      const currentSrc = document.getElementById("mainImage").src;
      currentImageIndex = currentProduct.images.findIndex(img => currentSrc.includes(img));
      if(currentImageIndex === -1) currentImageIndex = 0;
      updateModalImage();
      modal.style.display = "flex";
      setTimeout(() => modal.classList.add("active"), 10);
    }
  };

  const closeModal = () => {
    modal.classList.remove("active");
    setTimeout(() => modal.style.display = "none", 300);
  };

  document.getElementById("modalClose").onclick = closeModal;
    modalImg.onclick = () => {
    // Also update the main image to the one currently viewed in modal
    if(currentProduct && currentProduct.images) {
      const mainImg = document.getElementById("mainImage");
      mainImg.src = currentProduct.images[currentImageIndex];
      // Update active thumbnail
      document.querySelectorAll('.thumb-card').forEach((c, idx) => {
        if(idx === currentImageIndex) c.classList.add('active');
        else c.classList.remove('active');
      });
    }
    closeModal();
  };

  document.getElementById("modalPrev")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if(currentProduct && currentProduct.images) {
      currentImageIndex = (currentImageIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
      updateModalImage();
    }
  });

  document.getElementById("modalNext")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if(currentProduct && currentProduct.images) {
      currentImageIndex = (currentImageIndex + 1) % currentProduct.images.length;
      updateModalImage();
    }
  });

  // Quantity controls
  const qtyVal = document.getElementById("qtyVal");
  document.getElementById("btnMinus")?.addEventListener("click", () => {
    if (qty > 1) { qty--; qtyVal.textContent = qty; }
  });
  document.getElementById("btnPlus")?.addEventListener("click", () => {
    qty++; qtyVal.textContent = qty;
  });

  // Add to cart
  const btnAddCart = document.getElementById("btnAddCart");
  if (btnAddCart) {
    btnAddCart.addEventListener("click", async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        const pendingCartItem = { id: currentProduct.id, name: currentProduct.title, price: currentProduct.price, quantity: qty };
        localStorage.setItem("pendingCartAdd", JSON.stringify(pendingCartItem));
        localStorage.setItem("redirectAfterLogin", window.location.href);
        window.location.href = '/enter.html';
        return;
      }

      btnAddCart.disabled = true;
      const orig = btnAddCart.innerHTML;
      btnAddCart.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      let cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const idx = cart.findIndex(i => i.id === currentProduct.id);
      if (idx >= 0) cart[idx].quantity += qty;
      else cart.push({ id: currentProduct.id, name: currentProduct.title, price: currentProduct.price, quantity: qty });

      try {
        const res = await fetch("https://login.kanba.pw/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("userToken")}` },
          body: JSON.stringify({ cart })
        });
        if (!res.ok) throw new Error();
        localStorage.setItem("cart", JSON.stringify(cart));
      } catch (e) {
        localStorage.setItem("cart", JSON.stringify(cart));
      }

      if (window.updateCartCount) window.updateCartCount();
      showToast(`تمت إضافة ${qty} × ${currentProduct.title}`);
      
      btnAddCart.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';
      btnAddCart.classList.add('success-anim');
      
      if (window.confetti) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']
        });
      }
      
      setTimeout(() => { 
        btnAddCart.innerHTML = orig; 
        btnAddCart.classList.remove('success-anim');
        btnAddCart.disabled = false; 
        qty = 1; 
        qtyVal.textContent = 1; 
      }, 2000);
    });
  }
});
