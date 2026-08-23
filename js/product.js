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

    // Images Preloading & Gallery
    const mainImg = document.getElementById("mainImage");
    const tr = document.getElementById("thumbsRow");
    if (tr) tr.innerHTML = "";

    if (p.images && p.images.length > 0) {
      // 1. Instant RAM & Browser Preloading of all gallery images
      p.images.forEach((imgUrl) => {
        const preloader = new Image();
        preloader.decoding = "async";
        preloader.src = imgUrl;
      });

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
        d.innerHTML = `<img src="${img}" alt="صورة مصغرة" loading="eager" decoding="async">`;
        d.addEventListener("click", (e) => {
          e.stopPropagation();
          changeImage(idx);
        });
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
      // Snappy microtask animation without layout recalculations
      requestAnimationFrame(() => {
        mainImg.classList.add("image-pop-anim");
      });
    }
    
    if (modalImg && modal && modal.classList.contains("active")) {
      modalImg.src = targetImgUrl;
      modalImg.classList.remove("image-pop-anim");
      requestAnimationFrame(() => {
        modalImg.classList.add("image-pop-anim");
      });
    }
    
    // Update active thumbnail
    const thumbs = document.querySelectorAll('.thumb-card');
    thumbs.forEach((c, idx) => {
      if (idx === currentImageIndex) {
        c.classList.add('active');
        // Scroll thumbnail into view smoothly if overflowed
        c.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      } else {
        c.classList.remove('active');
      }
    });
  }

  function openFullscreen() {
    if (currentProduct && currentProduct.images) {
      const currentSrc = document.getElementById("mainImage")?.src || "";
      currentImageIndex = currentProduct.images.findIndex(img => currentSrc.includes(img));
      if (currentImageIndex === -1) currentImageIndex = 0;
      if (modalImg) modalImg.src = currentProduct.images[currentImageIndex];
      modal.style.display = "flex";
      lastModalOpenTime = Date.now();
      requestAnimationFrame(() => {
        modal.classList.add("active");
      });
    }
  }

  const closeModal = () => {
    if (Date.now() - lastModalOpenTime < 250) return;
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 200);
  };

  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  
  modalImg?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // High-Performance Touch & Swipe Gesture Controller (Zero Lag)
  function enableSwipe(elem, onSwipeLeft, onSwipeRight, onSwipeUpOrDown, onTap) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isTouching = false;
    let isSwiping = false;

    function onTouchStart(e) {
      if (e.target.closest('button')) return;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = touch.clientX;
      currentY = touch.clientY;
      isTouching = true;
      isSwiping = false;
    }

    function onTouchMove(e) {
      if (!isTouching) return;
      const touch = e.touches ? e.touches[0] : e;
      currentX = touch.clientX;
      currentY = touch.clientY;

      const diffX = currentX - startX;
      const diffY = currentY - startY;

      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isSwiping = true;
        // If horizontal swipe is dominant, prevent vertical pull
        if (Math.abs(diffX) > Math.abs(diffY) && e.cancelable) {
          e.preventDefault();
        }
      }
    }

    function onTouchEnd() {
      if (!isTouching) return;
      isTouching = false;

      const diffX = currentX - startX;
      const diffY = currentY - startY;
      const threshold = 35;

      if (!isSwiping || (Math.abs(diffX) < 10 && Math.abs(diffY) < 10)) {
        if (onTap) onTap();
        return;
      }

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
          if (diffX < 0) {
            // Swiped Left -> Next Image
            if (onSwipeLeft) onSwipeLeft();
          } else {
            // Swiped Right -> Previous Image
            if (onSwipeRight) onSwipeRight();
          }
        }
      } else {
        if (Math.abs(diffY) > threshold && onSwipeUpOrDown) {
          onSwipeUpOrDown();
        }
      }
    }

    elem.addEventListener("touchstart", onTouchStart, { passive: true });
    elem.addEventListener("touchmove", onTouchMove, { passive: false });
    elem.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  // Enable swiping on the main product image (Left -> Next, Right -> Prev)
  const mainImageWrap = document.getElementById("mainImageWrap");
  if (mainImageWrap) {
    enableSwipe(
      mainImageWrap,
      () => changeImage(currentImageIndex + 1), // Swipe left -> Next image
      () => changeImage(currentImageIndex - 1), // Swipe right -> Previous image
      null,
      () => openFullscreen()
    );
  }

  // Enable swiping on the fullscreen modal
  if (modal) {
    enableSwipe(
      modal,
      () => changeImage(currentImageIndex + 1), // Swipe left -> Next image
      () => changeImage(currentImageIndex - 1), // Swipe right -> Previous image
      () => closeModal(),
      () => closeModal()
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
