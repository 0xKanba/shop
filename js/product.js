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
          changeImage(idx);
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
  let lastModalOpenTime = 0;

  function changeImage(newIndex) {
    if (!currentProduct || !currentProduct.images || currentProduct.images.length === 0) return;
    
    currentImageIndex = (newIndex + currentProduct.images.length) % currentProduct.images.length;
    const targetImgUrl = currentProduct.images[currentImageIndex];
    
    const mainImg = document.getElementById("mainImage");
    if (mainImg) {
      mainImg.src = targetImgUrl;
      mainImg.classList.remove("image-pop-anim");
      void mainImg.offsetWidth; // trigger reflow
      mainImg.classList.add("image-pop-anim");
    }
    
    if (modalImg) {
      modalImg.src = targetImgUrl;
      modalImg.classList.remove("image-pop-anim");
      void modalImg.offsetWidth; // trigger reflow
      modalImg.classList.add("image-pop-anim");
    }
    
    // Update active thumbnail
    document.querySelectorAll('.thumb-card').forEach((c, idx) => {
      if (idx === currentImageIndex) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  function openFullscreen() {
    if (currentProduct && currentProduct.images) {
      const currentSrc = document.getElementById("mainImage").src;
      currentImageIndex = currentProduct.images.findIndex(img => currentSrc.includes(img));
      if (currentImageIndex === -1) currentImageIndex = 0;
      changeImage(currentImageIndex);
      modal.style.display = "flex";
      lastModalOpenTime = Date.now();
      setTimeout(() => modal.classList.add("active"), 10);
    }
  }

  const closeModal = () => {
    // Only allow closing if at least 400ms passed since opening, to prevent ghost clicks
    if (Date.now() - lastModalOpenTime < 400) {
      return;
    }
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
      // Ensure state is synced to the main image
      changeImage(currentImageIndex);
    }, 300);
  };

  document.getElementById("modalClose").onclick = closeModal;
  
  // Clicking the modal image itself can also close or stay
  modalImg.onclick = (e) => {
    e.stopPropagation();
  };
  
  // Close modal when clicking outside the image
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  // Google Photos style smooth touch/mouse drag & swipe implementation
  function enableSwipe(elem, onSwipeLeft, onSwipeRight, onSwipeUpOrDown, onTap) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let hasMoved = false;
    
    const img = elem.querySelector("img") || elem;

    function getEventXY(e) {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function onStart(e) {
      if (e.target.closest('button')) return;
      
      const coords = getEventXY(e);
      startX = coords.x;
      startY = coords.y;
      currentX = coords.x;
      currentY = coords.y;
      isDragging = true;
      hasMoved = false;
      
      if (img) {
        img.style.transition = 'none';
      }
    }

    function onMove(e) {
      if (!isDragging) return;
      const coords = getEventXY(e);
      currentX = coords.x;
      currentY = coords.y;

      const diffX = currentX - startX;
      const diffY = currentY - startY;

      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        hasMoved = true;
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        return;
      }

      if (img) {
        if (!onSwipeUpOrDown && Math.abs(diffY) > Math.abs(diffX) + 15) {
          // If no vertical action is enabled and dragging vertically, cancel horizontal transition and allow default page scrolling
          img.style.transform = '';
          isDragging = false;
          return;
        }
        
        // Translate image dynamically
        if (onSwipeUpOrDown) {
          img.style.transform = `translate(${diffX}px, ${diffY}px) scale(0.98)`;
        } else {
          img.style.transform = `translateX(${diffX}px) scale(0.98)`;
        }
      }
    }

    function onEnd(e) {
      if (!isDragging) return;
      isDragging = false;

      const diffX = currentX - startX;
      const diffY = currentY - startY;
      const thresholdX = 40;
      const thresholdY = 50;

      if (img) {
        img.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        img.style.transform = '';
      }

      // If they didn't drag/move, trigger a tap
      if (!hasMoved || (Math.abs(diffX) < 10 && Math.abs(diffY) < 10)) {
        if (onTap) {
          onTap(e);
        }
        return;
      }

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > thresholdX) {
          if (diffX < 0) {
            if (onSwipeLeft) onSwipeLeft();
          } else {
            if (onSwipeRight) onSwipeRight();
          }
        }
      } else {
        if (Math.abs(diffY) > thresholdY) {
          if (onSwipeUpOrDown) onSwipeUpOrDown();
        }
      }
    }

    elem.addEventListener("touchstart", onStart, { passive: true });
    elem.addEventListener("touchmove", onMove, { passive: false });
    elem.addEventListener("touchend", onEnd);

    elem.addEventListener("mousedown", onStart);
    
    const onGlobalMove = (e) => {
      if (isDragging) onMove(e);
    };
    const onGlobalEnd = (e) => {
      if (isDragging) onEnd(e);
    };

    window.addEventListener("mousemove", onGlobalMove);
    window.addEventListener("mouseup", onGlobalEnd);
  }

  // Enable swiping on the main product card/image
  const mainImageWrap = document.getElementById("mainImageWrap");
  if (mainImageWrap) {
    enableSwipe(
      mainImageWrap,
      () => changeImage(currentImageIndex + 1),
      () => changeImage(currentImageIndex - 1),
      null,
      () => openFullscreen()
    );
  }

  // Enable swiping on the fullscreen modal
  if (modal) {
    enableSwipe(
      modal,
      () => changeImage(currentImageIndex + 1),
      () => changeImage(currentImageIndex - 1),
      () => closeModal(),
      (e) => {
        // Only close if we clicked outside the modalImg (e.g. background container modal itself)
        if (e && (e.target === modal || e.target.id === "gallery-modal" || e.target.classList.contains("modal-close") || e.target.closest("#modalClose"))) {
          closeModal();
        }
      }
    );
  }

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
