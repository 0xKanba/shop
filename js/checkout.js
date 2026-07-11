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
      checkoutContent.style.display = "grid";
      await fetchCart();
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
          <div class="item-qty">الكمية: ${item.quantity}</div>
        </div>
        <div class="item-actions">
          <div class="item-price">${fmt(item.price * item.quantity)} د.ع</div>
          <button class="del-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
        </div>
      `;
      productsList.appendChild(div);
    });

    document.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", function() {
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
    totalItems.textContent = count;
    submitBtn.disabled = cart.length === 0;
  }

  function fmt(num) {
    return new Intl.NumberFormat("en-US").format(num);
  }

  orderForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    currentOrder = {
      customerName: document.getElementById("customerName").value,
      phoneNumber: document.getElementById("phoneNumber").value,
      address: document.getElementById("address").value,
      notes: document.getElementById("notes").value,
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

  init();
});
