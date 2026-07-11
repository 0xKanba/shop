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
  const iconHtml = isLog ? '<i class="fas fa-user-circle"></i>' : '<i class="far fa-user-circle"></i>';
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
  if(document.querySelector(".nav-center")) {
    updateLoginButton();
    return;
  }
  
  const nav = document.createElement("div");
  nav.className = "nav-center";
  nav.innerHTML = `
    <button class="nav-button cart-btn" title="السلة" onclick="window.location.href='/checkout.html'">
      <i class="fas fa-shopping-cart"></i>
      <span class="cart-count" style="display:none;">0</span>
    </button>
    <button class="nav-button login-btn" title="الحساب"></button>
  `;
  document.body.appendChild(nav);
  
  createLogoutConfirmationModal();
  updateLoginButton();
  updateCartCount();
  
  document.addEventListener("auth-status-changed", updateLoginButton);
  document.addEventListener("cart-updated", updateCartCount);
});
