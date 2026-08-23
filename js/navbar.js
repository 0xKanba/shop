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
    else window.location.href = "/enter";
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

function updateGuestButton() {
  const cartBtn = document.querySelector(".cart-btn");
  if (!cartBtn) return;
  
  const isLoggedIn = !!localStorage.getItem("isLoggedIn");
  const username = localStorage.getItem("username") || "";
  const isGuest = isLoggedIn && username.startsWith("guest_");
  
  let guestBtn = document.querySelector(".guest-info-btn");
  
  // When logging in manually with a username & password, hide the button entirely
  if (isLoggedIn && !isGuest) {
    if (guestBtn) {
      guestBtn.style.display = "none";
    }
    return;
  }
  
  if (!guestBtn) {
    guestBtn = document.createElement("button");
    guestBtn.className = "header-btn guest-info-btn";
    guestBtn.title = "بيانات الحساب السحابي / الضيف";
    guestBtn.style.cssText = `
      font-size: 1rem;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      margin-left: 8px;
      padding: 0;
      line-height: 1;
      position: relative;
    `;
    guestBtn.innerHTML = "⁉️";
    
    if (!document.getElementById("guest-pulse-style")) {
      const style = document.createElement("style");
      style.id = "guest-pulse-style";
      style.innerHTML = `
        @keyframes pulseGuestBlue {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes pulseGuestAmber {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .guest-info-btn:hover {
          transform: scale(1.15);
        }
        .guest-full-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 20px;
        }
        .guest-full-modal.active {
          opacity: 1;
          pointer-events: auto;
        }
        .guest-full-modal-card {
          background: var(--surface-0);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          transform: translateY(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .guest-full-modal.active .guest-full-modal-card {
          transform: translateY(0);
        }
        .guest-full-modal-header {
          padding: 28px 20px 22px;
          text-align: center;
          color: #ffffff;
          position: relative;
        }
        .guest-full-modal-close {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 100;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #ffffff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .guest-full-modal-close:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: scale(1.1) rotate(90deg);
        }
        .guest-full-modal-close:active {
          transform: scale(0.92);
        }
        .guest-full-modal-body {
          padding: 24px;
          text-align: right;
          direction: rtl;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .guest-cred-item {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .guest-copy-btn-modal {
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          color: var(--primary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .guest-copy-btn-modal:hover {
          background: var(--primary);
          color: white;
        }
      `;
      document.head.appendChild(style);
    }
    
    cartBtn.parentNode.insertBefore(guestBtn, cartBtn);
    
    guestBtn.onclick = () => {
      showGuestInfoModal();
    };
  } else {
    guestBtn.style.display = "flex";
  }
  
  // Apply dynamic color & animation based on status
  if (isGuest) {
    guestBtn.style.background = "rgba(37, 99, 235, 0.15)";
    guestBtn.style.border = "1px solid rgba(37, 99, 235, 0.3)";
    guestBtn.style.color = "#3b82f6";
    guestBtn.style.animation = "pulseGuestBlue 2s infinite";
  } else if (!isLoggedIn) {
    guestBtn.style.background = "rgba(245, 158, 11, 0.15)";
    guestBtn.style.border = "1px solid rgba(245, 158, 11, 0.3)";
    guestBtn.style.color = "#f59e0b";
    guestBtn.style.animation = "pulseGuestAmber 2s infinite";
  } else {
    // Normal user
    guestBtn.style.background = "rgba(16, 185, 129, 0.15)";
    guestBtn.style.border = "1px solid rgba(16, 185, 129, 0.3)";
    guestBtn.style.color = "#10b981";
    guestBtn.style.animation = "none";
  }
}

function showGuestInfoModal() {
  let modal = document.querySelector(".guest-full-modal");
  const isLoggedIn = !!localStorage.getItem("isLoggedIn");
  const username = localStorage.getItem("username") || "";
  const isGuest = isLoggedIn && username.startsWith("guest_");
  const guestPassword = localStorage.getItem("guestPassword") || "guestpassword123";
  
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "guest-full-modal";
    document.body.appendChild(modal);
  }
  
  if (isLoggedIn && isGuest) {
    modal.innerHTML = `
      <div class="guest-full-modal-card" style="box-sizing: border-box;">
        <div class="guest-full-modal-header" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
          <button class="guest-full-modal-close" id="closeGuestModalBtn"><i class="fas fa-times"></i></button>
          <div style="font-size: 3rem; margin-bottom: 12px; animation: bounce 1s infinite alternate;">👤</div>
          <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #fff;">حساب الضيف السحابي الخاص بك 🌐</h2>
          <p style="margin: 6px 0 0 0; font-size: 0.85rem; opacity: 0.9;">سلتك وطلباتك محفوظة تلقائياً ومحمية</p>
        </div>
        <div class="guest-full-modal-body">
          <p style="margin: 0; line-height: 1.6; font-size: 0.95rem; color: var(--text-main); font-weight: 700;">
            أنت تتسوق الآن كـ ضيف آمن!
          </p>
          <p style="margin: 0; line-height: 1.6; font-size: 0.85rem; color: var(--text-muted);">
            لقد أنشأنا لك حساباً تلقائياً لمزامنة سلتك وتوصيل طلباتك بسلاسة فائقة وسرعة. يمكنك مشاركة هذه البيانات مع عائلتك لمتابعة السلة والطلب معاً من أي هاتف آخر!
          </p>
          
          <div class="guest-cred-item">
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">اسم المستخدم (المعرف):</span>
              <strong style="font-family: monospace; font-size: 1rem; color: var(--text-main); letter-spacing: 0.5px;">${username}</strong>
            </div>
            <button class="guest-copy-btn-modal" data-copy="${username}">
              <i class="far fa-copy"></i> نسخ
            </button>
          </div>
          
          <div class="guest-cred-item">
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">كلمة المرور الخاصة بك:</span>
              <strong style="font-family: monospace; font-size: 1rem; color: var(--text-main); letter-spacing: 0.5px;">${guestPassword}</strong>
            </div>
            <button class="guest-copy-btn-modal" data-copy="${guestPassword}">
              <i class="far fa-copy"></i> نسخ
            </button>
          </div>
          
          <button id="btnCopyGuestFullModal" style="
            background: var(--primary);
            color: #fff;
            border: none;
            padding: 12px;
            border-radius: var(--radius-md);
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
            transition: all 0.2s;
            margin-top: 8px;
          ">
            <i class="fas fa-share-alt"></i> نسخ البيانات كاملة للمشاركة مع الأهل 👥
          </button>
          
          <button id="logoutBtnInGuestModal" style="
            background: transparent;
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
            padding: 10px;
            border-radius: var(--radius-md);
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            margin-top: 4px;
          ">
            <i class="fas fa-sign-out-alt"></i> تسجيل الخروج / الدخول لحساب آخر
          </button>
        </div>
      </div>
    `;
  } else if (!isLoggedIn) {
    modal.innerHTML = `
      <div class="guest-full-modal-card" style="box-sizing: border-box;">
        <div class="guest-full-modal-header" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);">
          <button class="guest-full-modal-close" id="closeGuestModalBtn"><i class="fas fa-times"></i></button>
          <div style="font-size: 3rem; margin-bottom: 12px; animation: pulse 1.5s infinite alternate;">🛒</div>
          <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #fff;">أنت تتسوق كـ ضيف حالياً 📲</h2>
          <p style="margin: 6px 0 0 0; font-size: 0.85rem; opacity: 0.9;">تسجيل الدخول اختياري للحفظ السحابي</p>
        </div>
        <div class="guest-full-modal-body">
          <p style="margin: 0; line-height: 1.6; font-size: 0.95rem; color: var(--text-main); font-weight: 700;">
            أهلاً بك في متجرنا! 👋
          </p>
          <p style="margin: 0; line-height: 1.6; font-size: 0.85rem; color: var(--text-muted);">
            تصفحك وسلتك محفوظة ومحمية محلياً. عندما تقوم بإتمام الطلب، سنقوم بإنشاء حساب ضيف سحابي مؤمن لك تلقائياً ومجاناً لحفظ جميع طلباتك ومزامنتها ومشاركتها مع العائلة والأهل!
          </p>
          
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: var(--radius-md); padding: 12px 16px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 1.2rem; color: #f59e0b;">💡</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; text-align: right; flex: 1;">
              تنبيه: تسجيل الدخول غير إجباري، يمكنك إتمام طلباتك كضيف كامل الصلاحية، أو يمكنك الدخول بحسابك السحابي لحفظ سلتك بأمان في أي وقت.
            </span>
          </div>
          
          <a href="/enter" style="
            background: var(--primary);
            color: #fff;
            text-decoration: none;
            padding: 12px;
            border-radius: var(--radius-md);
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
            transition: all 0.2s;
            margin-top: 8px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            text-align: center;
          ">
            <i class="fas fa-sign-in-alt"></i> تسجيل الدخول أو إنشاء حساب سحابي 🔐
          </a>
        </div>
      </div>
    `;
  } else {
    modal.innerHTML = `
      <div class="guest-full-modal-card" style="box-sizing: border-box;">
        <div class="guest-full-modal-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <button class="guest-full-modal-close" id="closeGuestModalBtn"><i class="fas fa-times"></i></button>
          <div style="font-size: 3rem; margin-bottom: 12px; animation: pulse 1.5s infinite alternate;">🛡️</div>
          <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #fff;">حسابك السحابي نشط وآمن 🔒</h2>
          <p style="margin: 6px 0 0 0; font-size: 0.85rem; opacity: 0.9;">أنت متصل بحسابك الدائم</p>
        </div>
        <div class="guest-full-modal-body">
          <p style="margin: 0; line-height: 1.6; font-size: 0.95rem; color: var(--text-main); font-weight: 700;">
            مرحباً بك، ${username}! 👋
          </p>
          <p style="margin: 0; line-height: 1.6; font-size: 0.85rem; color: var(--text-muted);">
            حسابك السحابي نشط بالكامل. جميع مشترياتك وسلتك وبيانات الشحن الخاصة بك محفوظة بشكل آمن ومزامنة تلقائياً مع السحابة.
          </p>
          
          <div class="guest-cred-item">
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">اسم المستخدم:</span>
              <strong style="font-size: 1rem; color: #10b981; letter-spacing: 0.3px;">${username}</strong>
            </div>
            <button class="guest-copy-btn-modal" data-copy="${username}">
              <i class="far fa-copy"></i> نسخ الاسم
            </button>
          </div>
          
          <button id="btnShareStoreModal" style="
            background: var(--surface-1);
            color: var(--text-main);
            border: 1px solid var(--border);
            padding: 12px;
            border-radius: var(--radius-md);
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
            transition: all 0.2s;
            margin-top: 8px;
          ">
            <i class="fas fa-share-alt"></i> مشاركة رابط المتجر مع العائلة 👥
          </button>
          
          <button id="logoutBtnInGuestModal" style="
            background: transparent;
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
            padding: 10px;
            border-radius: var(--radius-md);
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            margin-top: 4px;
          ">
            <i class="fas fa-sign-out-alt"></i> تسجيل الخروج من الحساب
          </button>
        </div>
      </div>
    `;
  }
  
  setTimeout(() => modal.classList.add("active"), 10);
  
  const closeModalFunc = () => {
    modal.classList.remove("active");
    setTimeout(() => {
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  };
  
  const toastFallback = (msg) => {
    let container = document.getElementById("toast-container-fallback");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container-fallback";
      container.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #fff;
        padding: 12px 24px;
        border-radius: 9999px;
        font-size: 0.9rem;
        font-weight: 700;
        z-index: 110000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        pointer-events: none;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        direction: rtl;
      `;
      document.body.appendChild(container);
    }
    container.textContent = msg;
    container.style.bottom = "40px";
    container.style.opacity = "1";
    setTimeout(() => {
      container.style.bottom = "30px";
      container.style.opacity = "0";
    }, 2500);
  };
  
  const closeBtn = modal.querySelector("#closeGuestModalBtn");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModalFunc();
    };
  }
  modal.onclick = (e) => {
    if (e.target === modal || e.target.closest("#closeGuestModalBtn")) {
      closeModalFunc();
    }
  };
  
  modal.querySelectorAll(".guest-copy-btn-modal").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const val = btn.getAttribute("data-copy");
      navigator.clipboard.writeText(val).then(() => {
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> تم';
        btn.style.background = "#10b981";
        btn.style.borderColor = "#10b981";
        btn.style.color = "#fff";
        toastFallback("تم النسخ بنجاح");
        setTimeout(() => {
          btn.innerHTML = origText;
          btn.style.background = "";
          btn.style.borderColor = "";
          btn.style.color = "";
        }, 1500);
      });
    };
  });
  
  const copyFullBtn = document.getElementById("btnCopyGuestFullModal");
  if (copyFullBtn) {
    copyFullBtn.onclick = () => {
      const fullText = `المحل العراقي - حساب الضيف:\nالمستخدم: ${username}\nكلمة المرور: ${guestPassword}\nالمتجر: ${window.location.origin}`;
      navigator.clipboard.writeText(fullText).then(() => {
        toastFallback("تم نسخ بيانات الحساب");
        copyFullBtn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
        copyFullBtn.style.background = "#10b981";
        setTimeout(() => {
          copyFullBtn.innerHTML = '<i class="fas fa-share-alt"></i> نسخ البيانات كاملة للمشاركة 👥';
          copyFullBtn.style.background = "";
        }, 1500);
      });
    };
  }
  
  const shareStoreBtn = document.getElementById("btnShareStoreModal");
  if (shareStoreBtn) {
    shareStoreBtn.onclick = () => {
      const fullText = `المحل العراقي:\n${window.location.origin}`;
      navigator.clipboard.writeText(fullText).then(() => {
        toastFallback("تم نسخ رابط المتجر");
        shareStoreBtn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
        shareStoreBtn.style.background = "#10b981";
        shareStoreBtn.style.color = "#fff";
        setTimeout(() => {
          shareStoreBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة رابط المتجر 👥';
          shareStoreBtn.style.background = "";
          shareStoreBtn.style.color = "";
        }, 1500);
      });
    };
  }
  
  const logoutBtn = document.getElementById("logoutBtnInGuestModal");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      closeModalFunc();
      if (window.auth && typeof window.auth.logout === "function") {
        await window.auth.logout();
        localStorage.removeItem("guestPassword");
        window.location.reload();
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        localStorage.removeItem("guestPassword");
        window.location.reload();
      }
    };
  }
}

function initAppHeader() {
  if (window.appHeaderInitialized) return;
  window.appHeaderInitialized = true;

  // Do not inject navbar or header on enter / auth page
  const isAuthPage = window.location.pathname.includes("/enter");
  if (isAuthPage) return;

  if(document.querySelector(".app-header")) {
    updateLoginButton();
    updateGuestButton();
    return;
  }
  
  const isMainPage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html") || window.location.pathname.endsWith("/index") || window.location.pathname === "";
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const themeIconClass = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  
  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <div class="header-container">
      <div class="header-right">
        ${!isMainPage ? `<a href="javascript:history.back()" class="header-back-btn" title="رجوع"><i class="fas fa-arrow-right"></i></a>` : ''}
        <a href="/" class="header-brand">
          <img src="https://cdn.jsdelivr.net/gh/0xKanba/assets@master/shop/pro.webp" alt="المحل العراقي" class="header-logo">
          <span class="header-title"><span class="g">المحل</span> العراقي</span>
        </a>
      </div>
      <div class="header-left">
        <button class="header-btn cart-btn" title="السلة" onclick="window.location.href='/checkout'">
          <i class="fas fa-shopping-cart"></i>
          <span class="cart-count" style="display:none;">0</span>
        </button>
        
        <button class="header-btn theme-toggle" title="${currentTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}" aria-label="تغيير المظهر">
          <i class="${themeIconClass}" id="themeIcon"></i>
        </button>
        
        ${isMainPage ? `<button class="header-btn login-btn" title="الحساب"></button>` : ''}
      </div>
    </div>
  `;
  
  document.body.insertBefore(header, document.body.firstChild);
  
  createLogoutConfirmationModal();
  updateLoginButton();
  updateCartCount();
  updateGuestButton();
  if (typeof window.syncThemeButtons === 'function') {
    window.syncThemeButtons();
  }
  
  document.addEventListener("auth-status-changed", () => {
    updateLoginButton();
    updateGuestButton();
  });
  document.addEventListener("cart-updated", updateCartCount);
}

if (document.readyState === "interactive" || document.readyState === "complete") {
  initAppHeader();
} else {
  document.addEventListener("DOMContentLoaded", initAppHeader);
}
