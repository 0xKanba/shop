document.addEventListener("DOMContentLoaded", function () {
  const productsList = document.getElementById("productsList");
  const cartTotal = document.getElementById("orderTotal");
  const totalItems = document.getElementById("totalItems");
  const orderForm = document.getElementById("orderForm");
  const submitBtn = document.getElementById("submitBtn");
  const authStatus = document.getElementById("authStatus");
  const checkoutContent = document.getElementById("checkoutContent");

  const confirmationModal = document.getElementById("confirmationModal");
  const confirmationDetails = document.getElementById("confirmationDetails");
  const confirmOrderBtn = document.getElementById("confirmOrder");
  const cancelOrderBtn = document.getElementById("cancelOrder");

  const successModal = document.getElementById("successModal");
  const closeSuccessBtn = document.getElementById("closeSuccessBtn");

  let cart = [];
  let currentOrder = null;
  let isProcessing = false;

  // Simple, eloquent Toast Notification
  function showToastMsg(msg, isError = false) {
    let t = document.getElementById("checkout-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "checkout-toast";
      t.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: var(--neu-surface, #1e222d);
        color: var(--neu-title, #fff);
        padding: 10px 20px;
        border-radius: 14px;
        border: 1px solid var(--neu-glass-border, rgba(255,255,255,0.1));
        box-shadow: 0 10px 25px rgba(0,0,0,0.35);
        font-size: 0.88rem;
        font-weight: 800;
        z-index: 100000;
        opacity: 0;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        gap: 8px;
        direction: rtl;
        pointer-events: none;
      `;
      document.body.appendChild(t);
    }
    const icon = isError ? '<i class="fas fa-triangle-exclamation" style="color:#ef4444;"></i>' : '<i class="fas fa-check" style="color:#10b981;"></i>';
    t.innerHTML = `${icon} <span>${msg}</span>`;
    t.style.borderColor = isError ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)";
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";

    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(20px)";
    }, 2800);
  }

  function showLoading(msg = "جارٍ التحديث...") {
    submitBtn.textContent = msg;
    submitBtn.disabled = true;
  }
  function hideLoading() {
    submitBtn.innerHTML = 'تأكيد وإرسال <i class="fas fa-check"></i>';
    submitBtn.disabled = cart.length === 0;
  }

  async function init() {
    authStatus.style.display = "none";
    checkoutContent.style.display = "block";
    await fetchCart();
    goToStep(1);
    document.body.classList.add("loaded");
  }

  async function fetchCart() {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        cart = JSON.parse(localStorage.getItem("cart") || "[]");
        renderCart();
        return;
      }
      
      const res = await fetch("https://login.kanba.pw/cart", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        cart = data.cart || [];
        localStorage.setItem("cart", JSON.stringify(cart));
      } else {
        cart = JSON.parse(localStorage.getItem("cart") || "[]");
      }
    } catch (e) {
      cart = JSON.parse(localStorage.getItem("cart") || "[]");
    }
    renderCart();
  }

  function renderCart() {
    productsList.innerHTML = "";
    if (cart.length === 0) {
      productsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-shopping-basket"></i>
          <p>السلة فارغة</p>
          <a href="/" style="display:inline-block; margin-top:10px; color:var(--neu-accent); font-weight:800; font-size:0.85rem;">تصفح المنتجات</a>
        </div>
      `;
      updateTotals();
      return;
    }

    cart.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <div class="item-info">
          <div class="item-name">${item.name}</div>
        </div>
        <div class="item-actions">
          <div class="qty-control">
            <button class="qty-btn minus-btn" data-index="${index}" title="تقليل"><i class="fas fa-minus"></i></button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn plus-btn" data-index="${index}" title="زيادة"><i class="fas fa-plus"></i></button>
          </div>
          <div class="item-price">${fmt(item.price * item.quantity)} د.ع</div>
          <button class="del-btn" data-index="${index}" title="حذف"><i class="fas fa-trash"></i></button>
        </div>
      `;
      productsList.appendChild(div);
    });

    document.querySelectorAll(".minus-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        decrementItem(parseInt(this.dataset.index));
      });
    });

    document.querySelectorAll(".plus-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        incrementItem(parseInt(this.dataset.index));
      });
    });

    document.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        removeItem(parseInt(this.dataset.index));
      });
    });

    updateTotals();
  }

  let syncTimeout = null;

  function removeItem(index) {
    cart.splice(index, 1);
    renderCart();
    debouncedSyncCart();
  }

  function decrementItem(index) {
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
    renderCart();
    debouncedSyncCart();
  }

  function incrementItem(index) {
    cart[index].quantity += 1;
    renderCart();
    debouncedSyncCart();
  }

  function debouncedSyncCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    if (window.updateCartCount) window.updateCartCount();
    document.dispatchEvent(new Event("cart-updated"));

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      fetch("https://login.kanba.pw/cart", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cart })
      }).catch(() => {});
    }, 400);
  }

  function updateTotals() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const deliveryFee = subtotal > 0 ? 5000 : 0;
    const grandTotal = subtotal + deliveryFee;
    
    const subtotalPriceEl = document.getElementById("subtotalPrice");
    if (subtotalPriceEl) {
      subtotalPriceEl.textContent = fmt(subtotal) + " د.ع";
    }
    
    cartTotal.textContent = fmt(grandTotal) + " د.ع";
    
    const orderTotalCompact = document.getElementById("orderTotalCompact");
    if (orderTotalCompact) {
      orderTotalCompact.textContent = fmt(grandTotal) + " د.ع";
    }
    
    totalItems.textContent = count;
    submitBtn.disabled = cart.length === 0;
  }

  function fmt(num) {
    return new Intl.NumberFormat("en-US").format(num);
  }

  // Wizard Elements
  const wizardStep1 = document.getElementById("wizardStep1");
  const wizardStep2 = document.getElementById("wizardStep2");
  const wizardStep3 = document.getElementById("wizardStep3");
  const stepperProgress = document.getElementById("stepperProgress");
  const topProgressBar = document.getElementById("topProgressBar");
  const stepIndicators = document.querySelectorAll(".step-indicator");

  const toStep2 = document.getElementById("toStep2");
  const backToStep1 = document.getElementById("backToStep1");
  const toStep3 = document.getElementById("toStep3");
  const backToStep2 = document.getElementById("backToStep2");

  const customerName = document.getElementById("customerName");
  const phoneNumber = document.getElementById("phoneNumber");
  const address = document.getElementById("address");
  const notes = document.getElementById("notes");

  const customerNameErr = document.getElementById("customerNameErr");
  const phoneNumberErr = document.getElementById("phoneNumberErr");
  const addressErr = document.getElementById("addressErr");

  function setFieldError(field, errEl, msg) {
    if (msg) {
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = "block";
      }
      field.classList.add("input-invalid");
    } else {
      if (errEl) {
        errEl.textContent = "";
        errEl.style.display = "none";
      }
      field.classList.remove("input-invalid");
    }
  }

  function validateStep1() {
    let valid = true;
    const nameVal = customerName.value.trim();
    const phoneVal = phoneNumber.value.trim();

    if (!nameVal || nameVal.length < 3) {
      setFieldError(customerName, customerNameErr, "يرجى كتابة الاسم الكامل");
      valid = false;
    } else {
      setFieldError(customerName, customerNameErr, null);
    }

    if (!phoneVal) {
      setFieldError(phoneNumber, phoneNumberErr, "يرجى إدخال رقم الهاتف");
      valid = false;
    } else if (!phoneVal.startsWith("07")) {
      setFieldError(phoneNumber, phoneNumberErr, "يجب أن يبدأ الرقم بـ 07");
      valid = false;
    } else if (phoneVal.length !== 11) {
      setFieldError(phoneNumber, phoneNumberErr, "الرقم يجب أن يكون 11 رقماً");
      valid = false;
    } else {
      setFieldError(phoneNumber, phoneNumberErr, null);
    }

    return valid;
  }

  function validateStep2() {
    let valid = true;
    const addrVal = address.value.trim();
    if (!addrVal || addrVal.length < 5) {
      setFieldError(address, addressErr, "يرجى إدخال عنوان التوصيل بالتفصيل");
      valid = false;
    } else {
      setFieldError(address, addressErr, null);
    }
    return valid;
  }

  if (customerName) {
    customerName.addEventListener("input", () => {
      if (customerName.value.trim().length >= 3) {
        setFieldError(customerName, customerNameErr, null);
      }
    });
  }

  if (phoneNumber) {
    phoneNumber.addEventListener("input", () => {
      let val = phoneNumber.value.replace(/\D/g, "");
      if (val.length > 11) val = val.substring(0, 11);
      phoneNumber.value = val;

      if (val.length === 11 && val.startsWith("07")) {
        setFieldError(phoneNumber, phoneNumberErr, null);
      }
    });
  }

  if (address) {
    address.addEventListener("input", () => {
      if (address.value.trim().length >= 5) {
        setFieldError(address, addressErr, null);
      }
    });
  }

  const reviewName = document.getElementById("reviewName");
  const reviewPhone = document.getElementById("reviewPhone");
  const reviewAddress = document.getElementById("reviewAddress");
  const reviewNotes = document.getElementById("reviewNotes");

  const summaryAccordion = document.getElementById("summaryAccordion");
  const accordionTrigger = document.getElementById("accordionTrigger");

  if (accordionTrigger && summaryAccordion) {
    accordionTrigger.addEventListener("click", () => {
      summaryAccordion.classList.toggle("collapsed");
    });
  }

  function goToStep(step) {
    if (!wizardStep1 || !wizardStep2 || !wizardStep3) return;
    
    wizardStep1.classList.remove("active");
    wizardStep2.classList.remove("active");
    wizardStep3.classList.remove("active");

    if (stepIndicators && stepIndicators.length > 0) {
      stepIndicators.forEach(ind => ind.classList.remove("active"));
    }

    if (step === 1) {
      wizardStep1.classList.add("active");
      if (stepIndicators && stepIndicators[0]) {
        stepIndicators[0].classList.add("active");
      }
      if (stepperProgress) stepperProgress.style.width = "0%";
      if (topProgressBar) {
        topProgressBar.style.width = "33.33%";
        topProgressBar.style.background = "#ef4444";
      }
    } else if (step === 2) {
      wizardStep2.classList.add("active");
      if (stepIndicators && stepIndicators[0]) stepIndicators[0].classList.add("active");
      if (stepIndicators && stepIndicators[1]) stepIndicators[1].classList.add("active");
      if (stepperProgress) stepperProgress.style.width = "50%";
      if (topProgressBar) {
        topProgressBar.style.width = "66.66%";
        topProgressBar.style.background = "#f59e0b";
      }
    } else if (step === 3) {
      reviewName.textContent = customerName.value.trim() || "—";
      reviewPhone.textContent = phoneNumber.value.trim() || "—";
      reviewAddress.textContent = address.value.trim() || "—";
      reviewNotes.textContent = notes.value.trim() || "لا توجد ملاحظات";

      wizardStep3.classList.add("active");
      if (stepIndicators && stepIndicators[0]) stepIndicators[0].classList.add("active");
      if (stepIndicators && stepIndicators[1]) stepIndicators[1].classList.add("active");
      if (stepIndicators && stepIndicators[2]) stepIndicators[2].classList.add("active");
      if (stepperProgress) stepperProgress.style.width = "100%";
      if (topProgressBar) {
        topProgressBar.style.width = "100%";
        topProgressBar.style.background = "#10b981";
      }
    }
  }

  if (toStep2) {
    toStep2.addEventListener("click", () => {
      if (validateStep1()) {
        goToStep(2);
      }
    });
  }

  if (backToStep1) {
    backToStep1.addEventListener("click", () => {
      goToStep(1);
    });
  }

  if (toStep3) {
    toStep3.addEventListener("click", () => {
      if (validateStep2()) {
        goToStep(3);
      }
    });
  }

  if (backToStep2) {
    backToStep2.addEventListener("click", () => {
      goToStep(2);
    });
  }

  if (stepIndicators && stepIndicators.length > 0) {
    stepIndicators.forEach((indicator, idx) => {
      indicator.addEventListener("click", () => {
        const targetStep = idx + 1;
        if (targetStep === 1) {
          goToStep(1);
        } else if (targetStep === 2) {
          if (validateStep1()) goToStep(2);
        } else if (targetStep === 3) {
          if (validateStep1() && validateStep2()) goToStep(3);
        }
      });
    });
  }

  orderForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if (cart.length === 0) {
      showToastMsg("السلة فارغة", true);
      return;
    }
    if (!validateStep1() || !validateStep2()) {
      showToastMsg("يرجى إكمال البيانات المطلوبة", true);
      return;
    }

    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = 5000;
    const grandTotal = subtotal + deliveryFee;

    currentOrder = {
      customerName: customerName.value.trim(),
      phoneNumber: phoneNumber.value.trim(),
      address: address.value.trim(),
      notes: notes.value.trim(),
      items: [...cart],
      total: grandTotal,
      quantity: cart.reduce((s, i) => s + i.quantity, 0),
      date: new Date().toISOString()
    };

    let detailsHtml = "";
    currentOrder.items.forEach(i => {
      detailsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>${i.name}</span><span>${i.quantity} × ${fmt(i.price)} د.ع</span></div>`;
    });
    detailsHtml += `<hr style="border:none; border-top:1px solid var(--neu-glass-border-sub, rgba(255,255,255,0.08)); margin:10px 0;">`;
    detailsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--neu-sub);"><span>المنتجات:</span><span>${fmt(subtotal)} د.ع</span></div>`;
    detailsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#ef4444;font-weight:700;"><span>التوصيل:</span><span>5,000 د.ع</span></div>`;
    detailsHtml += `<hr style="border:none; border-top:1px solid var(--neu-glass-border-sub, rgba(255,255,255,0.08)); margin:10px 0;">`;
    detailsHtml += `<div style="display:flex;justify-content:space-between;font-weight:900;color:var(--neu-accent);font-size:1rem;"><span>المجموع الكلي:</span><span>${fmt(grandTotal)} د.ع</span></div>`;
    
    confirmationDetails.innerHTML = detailsHtml;
    confirmationModal.style.display = "flex";
  });

  cancelOrderBtn.addEventListener("click", () => {
    confirmationModal.style.display = "none";
  });

  confirmOrderBtn.addEventListener("click", async () => {
    if (isProcessing) return;
    isProcessing = true;
    confirmationModal.style.display = "none";
    
    try {
      showLoading("جارٍ الإرسال...");
      let token = localStorage.getItem("userToken");
      
      if (!token) {
        try {
          const tempUsername = "guest_" + Math.random().toString(36).substring(2, 8);
          const tempPassword = "guestpassword123";
          
          const regRes = await fetch("https://login.kanba.pw/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: tempUsername, password: tempPassword })
          });
          
          if (regRes.ok) {
            const data = await regRes.json();
            if (data.token) {
              token = data.token;
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("userToken", data.token);
              localStorage.setItem("userId", data.userId);
              localStorage.setItem("username", tempUsername);
              localStorage.setItem("guestPassword", tempPassword);
            }
          }
        } catch (regErr) {}
      }
      
      if (token) {
        const res = await fetch("https://login.kanba.pw/order", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(currentOrder)
        });
        
        if (!res.ok) throw new Error("تعذر إرسال الطلب");
      } else {
        let localOrders = JSON.parse(localStorage.getItem("orders") || "[]");
        localOrders.push(currentOrder);
        localStorage.setItem("orders", JSON.stringify(localOrders));
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      cart = [];
      localStorage.setItem("cart", "[]");
      renderCart();
      document.dispatchEvent(new Event("cart-updated"));
      
      successModal.style.display = "flex";
      triggerCelebration();
    } catch (e) {
      showToastMsg("تعذر إرسال الطلب، يرجى المحاولة ثانية", true);
      confirmationModal.style.display = "flex";
    } finally {
      isProcessing = false;
      hideLoading();
    }
  });

  closeSuccessBtn.addEventListener("click", () => {
    window.location.href = "/";
  });

  function triggerCelebration() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#f43f5e", "#10b981", "#3b82f6", "#eab308", "#a855f7", "#ff007f", "#00ffff"];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 5 + 3,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        vy: Math.random() * 3 + 2,
        vx: Math.random() * 2 - 1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.tiltAngle) * 0.5;
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;

        if (p.y < canvas.height + p.r) {
          alive = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(draw);
      } else {
        canvas.style.display = "none";
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", handleResize);
      }
    }

    draw();

    setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      canvas.style.display = "none";
      window.removeEventListener("resize", handleResize);
    }, 6000);
  }

  init();
});
