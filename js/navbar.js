function createLogoutConfirmationModal() {
  if(document.querySelector(".confirm-modal")) return;
  const m = document.createElement("div");
  m.className = "confirm-modal";
  m.innerHTML = `
    <div class="confirm-modal-content">
      <div class="confirm-modal-icon"><i class="fas fa-sign-out-alt"></i></div>
      <div class="confirm-modal-header"><h3>تسجيل الخروج</h3></div>
      <div class="confirm-modal-body">هل أنت متأكد من رغبتك في تسجيل الخروج؟</div>
      <div class="confirm-modal-footer">
        <button class="confirm-btn cancel">إلغاء</button>
        <button class="confirm-btn confirm">خروج</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  m.querySelector(".cancel").onclick = () => closeModal();
  m.querySelector(".confirm").onclick = () => {
    if(window.auth && window.auth.isLoggedIn) {
      window.auth.logout();
      closeModal();
      setTimeout(() => window.location.href = "/", 300);
    }
  };
  m.onclick = (e) => { if(e.target === m) closeModal(); };
}

function showLogoutConfirmationModal() {
  const m = document.querySelector(".confirm-modal");
  if(m) m.classList.add("active");
}
function closeModal() {
  const m = document.querySelector(".confirm-modal");
  if(m) m.classList.remove("active");
}

function updateLoginButton() {
  const btn = document.querySelector(".login-btn");
  if(!btn) return;
  const isLog = window.auth && window.auth.isLoggedIn;
  const iconHtml = isLog ? '<i class="fas fa-sign-out-alt"></i>' : '<i class="far fa-user-circle"></i>';
  btn.innerHTML = iconHtml;
  btn.title = isLog ? 'تسجيل الخروج' : 'تسجيل الدخول';
  
  // Replace to clear old listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.onclick = (e) => {
    e.preventDefault();
    if(window.auth && window.auth.isLoggedIn) showLogoutConfirmationModal();
    else window.location.href = "/enter.html";
  };
}

function updateCartCount() {
  const c = document.querySelector(".cart-count");
  if(!c) return;
  const cart = JSON.parse(localStorage.getItem("cart")||"[]");
  const count = cart.reduce((s,i) => s + i.quantity, 0);
  c.textContent = count;
  c.style.display = count > 0 ? 'flex' : 'none';
}

document.addEventListener("DOMContentLoaded", () => {
  if(document.querySelector(".app-header")) {
    updateLoginButton();
    return;
  }
  
  const isMainPage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html") || window.location.pathname === "";
  
  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <div class="header-container">
      <div class="header-right">
        ${!isMainPage ? `<a href="javascript:history.back()" class="header-back-btn" title="رجوع"><i class="fas fa-arrow-right"></i></a>` : ''}
        <a href="/" class="header-brand">
          <img src="https://i.postimg.cc/d3fS0sHg/pro.webp" alt="المحل العراقي" class="header-logo">
          <span class="header-title"><span class="g">المحل</span> العراقي</span>
        </a>
      </div>
      <div class="header-left">
        <button class="header-btn cart-btn" title="السلة" onclick="window.location.href='/checkout.html'">
          <i class="fas fa-shopping-cart"></i>
          <span class="cart-count" style="display:none;">0</span>
        </button>
        
        <button class="header-btn theme-toggle" title="تغيير المظهر">
          <!-- hydrated dynamically by theme.js -->
        </button>
        
        ${isMainPage ? `<button class="header-btn login-btn" title="الحساب"></button>` : ''}
      </div>
    </div>
  `;
  
  // Inject at the very top of the body
  document.body.insertBefore(header, document.body.firstChild);
  
  createLogoutConfirmationModal();
  updateLoginButton();
  updateCartCount();
  
  document.addEventListener("auth-status-changed", updateLoginButton);
  document.addEventListener("cart-updated", updateCartCount);
});
