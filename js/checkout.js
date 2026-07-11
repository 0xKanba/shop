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

  function showLoading(msg = "جاري التحديث...") {
    // We can use a simple generic loading approach here
    submitBtn.textContent = msg;
    submitBtn.disabled = true;
  }
  function hideLoading() {
    submitBtn.textContent = "تأكيد الطلب وإرسال";
    submitBtn.disabled = cart.length === 0;
  }

  async function init() {
    const isLoggedIn = !!localStorage.getItem("isLoggedIn");
    if (isLoggedIn) {
      authStatus.style.display = "none";
      checkoutContent.style.display = "block";
      await fetchCart();
      goToStep(1); // Ensure first step initialized correctly
    } else {
      authStatus.innerHTML = `
        <p style="margin-bottom:16px;">يرجى تسجيل الدخول لاستكمال الطلب</p>
        <a href="/enter.html" style="padding:10px 20px; background:var(--primary); color:#000; text-decoration:none; border-radius:12px; font-weight:700;">تسجيل الدخول</a>
      `;
    }
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
          <p>السلة فارغة، أضف بعض المنتجات!</p>
          <a href="/" style="display:inline-block; margin-top:16px; color:var(--primary); font-weight:700;">تصفح المتجر</a>
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
            <button class="qty-btn minus-btn" data-index="${index}"><i class="fas fa-minus"></i></button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn plus-btn" data-index="${index}"><i class="fas fa-plus"></i></button>
          </div>
          <div class="item-price">${fmt(item.price * item.quantity)} د.ع</div>
          <button class="del-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
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

  async function removeItem(index) {
    if (isProcessing) return;
    isProcessing = true;
    try {
      showLoading();
      cart.splice(index, 1);
      await syncCart();
      renderCart();
    } finally {
      isProcessing = false;
      hideLoading();
    }
  }

  async function decrementItem(index) {
    if (isProcessing) return;
    isProcessing = true;
    try {
      showLoading();
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
      } else {
        cart.splice(index, 1);
      }
      await syncCart();
      renderCart();
    } finally {
      isProcessing = false;
      hideLoading();
    }
  }

  async function incrementItem(index) {
    if (isProcessing) return;
    isProcessing = true;
    try {
      showLoading();
      cart[index].quantity += 1;
      await syncCart();
      renderCart();
    } finally {
      isProcessing = false;
      hideLoading();
    }
  }

  async function syncCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    const token = localStorage.getItem("userToken");
    if (!token) return;
    try {
      await fetch("https://login.kanba.pw/cart", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cart })
      });
      document.dispatchEvent(new Event("cart-updated"));
    } catch (e) {}
  }

  function updateTotals() {
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    cartTotal.textContent = fmt(total) + " د.ع";
    
    const orderTotalCompact = document.getElementById("orderTotalCompact");
    if (orderTotalCompact) {
      orderTotalCompact.textContent = fmt(total) + " د.ع";
    }
    
    totalItems.textContent = count;
    submitBtn.disabled = cart.length === 0;
  }

  function fmt(num) {
    return new Intl.NumberFormat("en-US").format(num);
  }

  // Google-Style Progressive Wizard Navigation Logic
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

  // Phone Number Dynamic Filter & Format enforcement
  if (phoneNumber) {
    phoneNumber.addEventListener("input", () => {
      // Allow only digits
      let val = phoneNumber.value.replace(/\D/g, "");
      
      // Enforce max length of 11
      if (val.length > 11) {
        val = val.substring(0, 11);
      }
      
      phoneNumber.value = val;
      
      // Real-time custom validation feedback
      if (val.length > 0 && !val.startsWith("07")) {
        phoneNumber.setCustomValidity("يجب أن يبدأ رقم الهاتف العراقي بـ 07");
      } else if (val.length > 0 && val.length !== 11) {
        phoneNumber.setCustomValidity("يجب أن يكون رقم الهاتف مكوناً من 11 رقماً بالضبط");
      } else {
        phoneNumber.setCustomValidity("");
      }
    });
  }

  const reviewName = document.getElementById("reviewName");
  const reviewPhone = document.getElementById("reviewPhone");
  const reviewAddress = document.getElementById("reviewAddress");
  const reviewNotes = document.getElementById("reviewNotes");

  const summaryAccordion = document.getElementById("summaryAccordion");
  const accordionTrigger = document.getElementById("accordionTrigger");

  // Accordion Toggle
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
      
      // Top Progress Bar: Red
      if (topProgressBar) {
        topProgressBar.style.width = "33.33%";
        topProgressBar.style.background = "#ef4444";
      }
    } else if (step === 2) {
      wizardStep2.classList.add("active");
      if (stepIndicators && stepIndicators[0]) {
        stepIndicators[0].classList.add("active");
      }
      if (stepIndicators && stepIndicators[1]) {
        stepIndicators[1].classList.add("active");
      }
      if (stepperProgress) stepperProgress.style.width = "50%";
      
      // Top Progress Bar: Orange/Amber
      if (topProgressBar) {
        topProgressBar.style.width = "66.66%";
        topProgressBar.style.background = "#f59e0b";
      }
    } else if (step === 3) {
      // Bind Review Values
      reviewName.textContent = customerName.value.trim() || "—";
      reviewPhone.textContent = phoneNumber.value.trim() || "—";
      reviewAddress.textContent = address.value.trim() || "—";
      reviewNotes.textContent = notes.value.trim() || "بدون ملاحظات إضافية";

      wizardStep3.classList.add("active");
      if (stepIndicators && stepIndicators[0]) {
        stepIndicators[0].classList.add("active");
      }
      if (stepIndicators && stepIndicators[1]) {
        stepIndicators[1].classList.add("active");
      }
      if (stepIndicators && stepIndicators[2]) {
        stepIndicators[2].classList.add("active");
      }
      if (stepperProgress) stepperProgress.style.width = "100%";
      
      // Top Progress Bar: Full Green
      if (topProgressBar) {
        topProgressBar.style.width = "100%";
        topProgressBar.style.background = "#10b981";
      }
    }
  }

  if (toStep2) {
    toStep2.addEventListener("click", () => {
      if (!customerName.checkValidity()) {
        customerName.reportValidity();
        return;
      }
      if (!phoneNumber.checkValidity()) {
        phoneNumber.reportValidity();
        return;
      }
      goToStep(2);
    });
  }

  if (backToStep1) {
    backToStep1.addEventListener("click", () => {
      goToStep(1);
    });
  }

  if (toStep3) {
    toStep3.addEventListener("click", () => {
      if (!address.checkValidity()) {
        address.reportValidity();
        return;
      }
      goToStep(3);
    });
  }

  if (backToStep2) {
    backToStep2.addEventListener("click", () => {
      goToStep(2);
    });
  }

  // Handle step click direct jumps if the user already reached them or inputs are valid
  if (stepIndicators && stepIndicators.length > 0) {
    stepIndicators.forEach((indicator, idx) => {
      indicator.addEventListener("click", () => {
        const targetStep = idx + 1;
        if (targetStep === 1) {
          goToStep(1);
        } else if (targetStep === 2) {
          if (customerName.checkValidity() && phoneNumber.checkValidity()) {
            goToStep(2);
          } else {
            customerName.reportValidity() || phoneNumber.reportValidity();
          }
        } else if (targetStep === 3) {
          if (customerName.checkValidity() && phoneNumber.checkValidity() && address.checkValidity()) {
            goToStep(3);
          } else {
            if (!customerName.checkValidity() || !phoneNumber.checkValidity()) {
              goToStep(1);
              customerName.reportValidity() || phoneNumber.reportValidity();
            } else {
              goToStep(2);
              address.reportValidity();
            }
          }
        }
      });
    });
  }

  orderForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    currentOrder = {
      customerName: customerName.value,
      phoneNumber: phoneNumber.value,
      address: address.value,
      notes: notes.value,
      items: [...cart],
      total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
      quantity: cart.reduce((s, i) => s + i.quantity, 0),
      date: new Date().toISOString()
    };

    let detailsHtml = "";
    currentOrder.items.forEach(i => {
      detailsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>${i.name}</span><span>${i.quantity} × ${fmt(i.price)}</span></div>`;
    });
    detailsHtml += `<hr style="border-color:var(--border); margin:12px 0;">`;
    detailsHtml += `<div style="display:flex;justify-content:space-between;font-weight:bold;color:var(--primary);"><span>المجموع الكلي:</span><span>${fmt(currentOrder.total)} د.ع</span></div>`;
    
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
      showLoading("جاري إرسال الطلب...");
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("User not logged in");
      
      const res = await fetch("https://login.kanba.pw/order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(currentOrder)
      });
      
      if (!res.ok) throw new Error("فشل إرسال الطلب");
      
      cart = [];
      localStorage.setItem("cart", "[]");
      renderCart();
      document.dispatchEvent(new Event("cart-updated"));
      
      successModal.style.display = "flex";
      triggerCelebration();
    } catch (e) {
      alert("فشل إرسال الطلب، تأكد من الاتصال وحاول مجدداً.");
      confirmationModal.style.display = "flex";
    } finally {
      isProcessing = false;
      hideLoading();
    }
  });

  closeSuccessBtn.addEventListener("click", () => {
    window.location.href = "/";
  });

  // Beautiful High-performance Canvas Celebration Confetti
  function triggerCelebration() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Resize canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#f43f5e", "#10b981", "#3b82f6", "#eab308", "#a855f7", "#ff007f", "#00ffff"];
    const particles = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
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

    // Clean stop after 8 seconds
    setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      canvas.style.display = "none";
      window.removeEventListener("resize", handleResize);
    }, 8000);
  }

  init();
});
