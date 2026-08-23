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

  // 1. Instant Preview Hydration from sessionStorage / cache if available (0ms paint)
  try {
    const rawPreview = sessionStorage.getItem('preview_prod_' + productId);
    if (rawPreview) {
      const preview = JSON.parse(rawPreview);
      renderInitialPreview(preview);
    }
  } catch (e) {}

  function renderInitialPreview(p) {
    const prodName = document.getElementById("prodName");
    const prodPrice = document.getElementById("prodPrice");
    const mainImg = document.getElementById("mainImage");
    const mainImageWrap = document.getElementById("mainImageWrap");

    if (prodName && p.title) {
      prodName.textContent = p.title;
      prodName.classList.remove("skeleton-text");
    }
    if (prodPrice && p.price) {
      prodPrice.textContent = new Intl.NumberFormat("en-US").format(p.price);
      prodPrice.classList.remove("skeleton-text");
    }
    if (mainImg && p.image) {
      mainImg.src = p.image;
      mainImg.onload = () => {
        mainImg.classList.add("loaded");
        if (mainImageWrap) mainImageWrap.classList.remove("skeleton-loader");
      };
      if (mainImg.complete) {
        mainImg.classList.add("loaded");
        if (mainImageWrap) mainImageWrap.classList.remove("skeleton-loader");
      }
    }
  }

  // 2. Fetch Full Product Details (Stale-While-Revalidate with no cache buster)
  try {
    const res = await fetch(`/data/${productId}.json`);
    if (!res.ok) throw new Error("Product not found");
    currentProduct = await res.json();
    renderProduct(currentProduct);
  } catch (e) {
    if (!currentProduct) {
      document.querySelector('.page-wrap').innerHTML = `<h2 style="text-align:center; padding: 40px; color: var(--neu-title);">المنتج غير موجود</h2>`;
      document.body.classList.add('loaded');
    }
  }

  function renderProduct(p) {
    const prodName = document.getElementById("prodName");
    const prodPrice = document.getElementById("prodPrice");
    const prodDesc = document.getElementById("prodDesc");
    const mainImageWrap = document.getElementById("mainImageWrap");

    if (prodName) {
      prodName.textContent = p.title;
      prodName.classList.remove("skeleton-text");
    }
    if (prodPrice) {
      prodPrice.textContent = new Intl.NumberFormat("en-US").format(p.price);
      prodPrice.classList.remove("skeleton-text");
    }
    if (prodDesc) {
      prodDesc.textContent = p.description || "";
      prodDesc.classList.remove("skeleton-block");
    }
    
    // Delivery Badge
    const prodDelivery = document.getElementById("prodDelivery");
    if (prodDelivery) {
      prodDelivery.innerHTML = `<i class="fas fa-truck"></i> سعر التوصيل: 5,000 د.ع (لكافة المحافظات)`;
      prodDelivery.className = "delivery-badge paid";
      prodDelivery.style.display = "inline-flex";
    }
    
    // Specs
    const sg = document.getElementById("specsGrid");
    if (sg) {
      sg.innerHTML = "";
      if (p.features) {
        for (let [k, v] of Object.entries(p.features)) {
          const item = document.createElement("div");
          item.className = "spec-item";
          item.innerHTML = `<div class="spec-key">${k}</div><div class="spec-val">${v}</div>`;
          sg.appendChild(item);
        }
      }
    }

    // Images
    const mainImg = document.getElementById("mainImage");
    const tr = document.getElementById("thumbsRow");
    if (tr) tr.innerHTML = "";

    if (p.images && p.images.length > 0) {
      if (mainImg) {
        mainImg.src = p.images[0];
        mainImg.onload = () => {
          mainImg.classList.add("loaded");
          if (mainImageWrap) mainImageWrap.classList.remove("skeleton-loader");
        };
        if (mainImg.complete) {
          mainImg.classList.add("loaded");
          if (mainImageWrap) mainImageWrap.classList.remove("skeleton-loader");
        }
      }
      
      p.images.forEach((img, idx) => {
        const d = document.createElement("div");
        d.className = `thumb-card ${idx === 0 ? 'active' : ''}`;
        d.innerHTML = `<img src="${img}" alt="صورة مصغرة" loading="lazy" decoding="async">`;
        d.onclick = () => {
          changeImage(idx);
        };
        if (tr) tr.appendChild(d);
      });
    }

    // Out of stock check
    if (p.outOfStock) {
      window.location.replace('/');
      return;
    }

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
      requestAnimationFrame(() => {
        mainImg.classList.add("image-pop-anim");
      });
    }
    
    if (modalImg) {
      modalImg.src = targetImgUrl;
      modalImg.classList.remove("image-pop-anim");
      requestAnimationFrame(() => {
        modalImg.classList.add("image-pop-anim");
      });
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
      () => changeImage(currentImageIndex - 1),
      () => changeImage(currentImageIndex + 1),
      null,
      () => openFullscreen()
    );
  }

  // Enable swiping on the fullscreen modal
  if (modal) {
    enableSwipe(
      modal,
      () => changeImage(currentImageIndex - 1),
      () => changeImage(currentImageIndex + 1),
      () => closeModal(),
      (e) => {
        // Only close if we clicked outside the modalImg (e.g. background container modal itself)
        if (e && (e.target === modal || e.target.id === "gallery-modal" || e.target.classList.contains("modal-close") || e.target.closest("#modalClose"))) {
          closeModal();
        }
      }
    );
  }

  // Modal navigation click events
  document.getElementById("modalPrev")?.addEventListener("click", (e) => {
    e.stopPropagation();
    changeImage(currentImageIndex - 1);
  });
  document.getElementById("modalNext")?.addEventListener("click", (e) => {
    e.stopPropagation();
    changeImage(currentImageIndex + 1);
  });

  // Mobile scroll hint click event
  document.getElementById("mobileScrollHint")?.addEventListener("click", () => {
    document.getElementById("prodDesc")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Quantity controls & synchronization
  const stickyQtyVal = document.getElementById("stickyQtyVal");

  function setQuantity(newQty) {
    if (newQty < 1) newQty = 1;
    qty = newQty;
    if (stickyQtyVal) stickyQtyVal.textContent = qty;
  }

  document.getElementById("stickyBtnMinus")?.addEventListener("click", () => setQuantity(qty - 1));
  document.getElementById("stickyBtnPlus")?.addEventListener("click", () => setQuantity(qty + 1));

  // Add to cart handler
  function handleAddToCart() {
    if (!currentProduct) return;

    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const idx = cart.findIndex(i => i.id === currentProduct.id);
    if (idx >= 0) cart[idx].quantity += qty;
    else cart.push({ id: currentProduct.id, name: currentProduct.title, price: currentProduct.price, quantity: qty });

    localStorage.setItem("cart", JSON.stringify(cart));

    if (window.updateCartCount) window.updateCartCount();
    showToast(`تمت إضافة ${qty} × ${currentProduct.title}`);
    
    const stickyBtnAddCart = document.getElementById("stickyBtnAddCart");
    if (stickyBtnAddCart) {
      stickyBtnAddCart.innerHTML = '<i class="fas fa-check"></i> <span>تمت الإضافة</span>';
      stickyBtnAddCart.classList.add('success-anim');
    }
    
    if (window.confetti) {
      try {
        confetti({
          particleCount: 75,
          spread: 65,
          origin: { y: 0.8 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']
        });
      } catch (e) {}
    }
    
    setTimeout(() => { 
      if (stickyBtnAddCart) {
        stickyBtnAddCart.innerHTML = '<i class="fas fa-cart-arrow-down sticky-cart-icon"></i> <span>أضف للسلة</span>';
        stickyBtnAddCart.classList.remove('success-anim');
      }
      setQuantity(1);
    }, 1400);

    // Non-blocking background sync
    const token = localStorage.getItem("userToken");
    if (token) {
      fetch("https://login.kanba.pw/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ cart })
      }).catch(() => {});
    }
  }

  const stickyBtnAddCart = document.getElementById("stickyBtnAddCart");
  if (stickyBtnAddCart) {
    stickyBtnAddCart.addEventListener("click", handleAddToCart);
  }
});
