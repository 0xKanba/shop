function createLogoutConfirmationModal(){if(document.querySelector(".confirm-modal"))return;let t=document.createElement("div");t.className="confirm-modal",t.innerHTML=`
    <div class="confirm-modal-content">
      <div class="confirm-modal-header">
        <div class="confirm-modal-icon">
          <i class="fas fa-sign-out-alt"></i>
        </div>
        <h3>تسجيل الخروج</h3>
      </div>
      <div class="confirm-modal-body">
        هل أنت متأكد من رغبتك في تسجيل الخروج؟
      </div>
      <div class="confirm-modal-footer">
        <button class="confirm-btn cancel">إلغاء</button>
        <button class="confirm-btn confirm">تسجيل الخروج</button>
      </div>
    </div>
  `,document.body.appendChild(t);let e=t.querySelector(".cancel"),n=t.querySelector(".confirm");e.addEventListener("click",function(){closeModal()}),n.addEventListener("click",function(){if(window.auth&&window.auth.isLoggedIn){window.auth.logout();let t=document.querySelector(".notification-envelope");t&&(t.style.animation="none",t.offsetHeight,t.style.animation="pulse 2s infinite"),closeModal(),setTimeout(()=>{window.location.href="/"},300)}}),t.addEventListener("click",function(e){e.target===t&&closeModal()})}function showLogoutConfirmationModal(){let t=document.querySelector(".confirm-modal");if(t){t.classList.add("active");let e=document.querySelector(".notification-envelope");e&&(e.style.animation="none",e.offsetHeight,e.style.animation="pulse 2s infinite")}}function closeModal(){let t=document.querySelector(".confirm-modal");t&&t.classList.remove("active")}function updateLoginButton(){let t=document.querySelector(".login-btn");if(t){if(window.auth&&window.auth.isLoggedIn){let e=t.cloneNode(!0);t.parentNode.replaceChild(e,t);let n=e.querySelector(".login-text"),o=e.querySelector("i");n&&(n.textContent="تسجيل الخروج"),o&&(o.className="fas fa-sign-out-alt"),e.classList.add("logged-in"),e.addEventListener("click",function(t){t.preventDefault(),showLogoutConfirmationModal()})}else{let a=t.cloneNode(!0);t.parentNode.replaceChild(a,t);let i=a.querySelector(".login-text"),l=a.querySelector("i");i&&(i.textContent="تسجيل الدخول"),l&&(l.className="fas fa-user"),a.classList.remove("logged-in"),a.addEventListener("click",function(){window.location.href="/enter.html"})}}}function updateCartCount(){let t=document.querySelector(".cart-count");if(!t)return;let e=JSON.parse(localStorage.getItem("cart")||"[]"),n=e.reduce((t,e)=>t+e.quantity,0);t.textContent=n,0===n?t.classList.add("no-items"):(t.classList.remove("no-items"),t.style.animation="none",t.offsetHeight,t.style.animation="pulse 2s infinite")}document.addEventListener("DOMContentLoaded",function(){if(document.querySelector(".nav-center")){updateLoginButton();return}let t=document.createElement("div");t.className="nav-center",t.innerHTML=`
    <button class="nav-button cart-btn">
      <i class="fas fa-shopping-cart"></i>
      <span class="cart-text">السلة</span>
      <span class="cart-count">0</span>
    </button>
    <button class="nav-button login-btn">
      <i class="fas fa-user"></i>
      <span class="login-text">تسجيل الدخول</span>
      <span class="notification-envelope">!</span>
    </button>
  `,document.body.insertBefore(t,document.body.firstChild),createLogoutConfirmationModal(),updateLoginButton(),document.addEventListener("auth-status-changed",updateLoginButton),document.querySelectorAll(".nav-button").forEach(t=>{setTimeout(()=>{t.style.opacity="1",t.style.transform="translateY(0)"},300),t.addEventListener("animationstart",function(t){"pulse"===t.animationName&&(this.style.transform="translateY(-3px) scale(1.1)")}),t.addEventListener("animationend",function(t){"pulse"===t.animationName&&(this.style.transform="translateY(-3px)")})});let e=document.querySelector(".cart-btn"),n=document.querySelector(".login-btn");e&&e.addEventListener("click",function(){window.location.href="/checkout"}),n&&n.addEventListener("click",function(){window.auth&&window.auth.isLoggedIn?showLogoutConfirmationModal():window.location.href="/enter.html"})}),document.addEventListener("cart-updated",updateCartCount),updateCartCount(),window.updateLoginButton=updateLoginButton,window.updateCartCount=updateCartCount;
