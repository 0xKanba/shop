class AuthManager {
  constructor() {
    this.isLoggedIn = this.checkLoginStatus();
    this.email = localStorage.getItem("userEmail");
    this.userId = localStorage.getItem("userId");
    this.token = localStorage.getItem("userToken");
  }

  checkLoginStatus() {
    return !!localStorage.getItem("isLoggedIn");
  }

  async updateLoginStatus(email, token, userId) {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userToken", token);
    localStorage.setItem("userId", userId);
    this.isLoggedIn = true;
    this.email = email;
    this.token = token;
    this.userId = userId;
    
    // Trigger cart merge on manual login
    await this.loadCartFromCloud(true);
    
    document.dispatchEvent(new Event("auth-status-changed"));
    return true;
  }

  async logout() {
    const username = localStorage.getItem("username") || "";
    const isGuest = username.startsWith("guest_");
    
    if (isGuest) {
      // Save guest cart to tempCart so it can be merged on next login
      let t = JSON.parse(localStorage.getItem("cart") || "[]");
      if (t.length > 0) {
        localStorage.setItem("tempCart", JSON.stringify(t));
      }
    } else {
      // For real users, we do not need tempCart
      localStorage.removeItem("tempCart");
    }
    
    // Clear the active local cart on logout
    localStorage.removeItem("cart");
    
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("guestPassword");
    localStorage.removeItem("justLoggedIn");
    
    this.isLoggedIn = false;
    this.email = null;
    this.token = null;
    this.userId = null;
    
    document.dispatchEvent(new Event("cart-updated"));
    document.dispatchEvent(new Event("auth-status-changed"));
    return true;
  }

  async loadCartFromCloud(isLoginMerge = false) {
    if (this.isLoggedIn && this.userId) {
      try {
        let t = await fetch("https://login.kanba.pw/cart", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          }
        });
        if (t.ok) {
          let e = await t.json();
          if (e.cart && Array.isArray(e.cart)) {
            let cloudCart = [...e.cart];
            let localCart = JSON.parse(localStorage.getItem("cart") || "[]");
            let tempCart = JSON.parse(localStorage.getItem("tempCart") || "[]");
            
            let finalCart = [...cloudCart];

            // 1. If we just logged in, merge pre-existing local guest cart with cloud cart
            if (isLoginMerge && localCart.length > 0) {
              localCart.forEach(localItem => {
                let existingItem = finalCart.find(item => item.id === localItem.id);
                if (existingItem) {
                  existingItem.quantity += localItem.quantity;
                } else {
                  finalCart.push(localItem);
                }
              });
            }

            // 2. Merge tempCart (from logout transition) if any exists
            if (tempCart.length > 0) {
              tempCart.forEach(tempItem => {
                let existingItem = finalCart.find(item => item.id === tempItem.id);
                if (existingItem) {
                  existingItem.quantity += tempItem.quantity;
                } else {
                  finalCart.push(tempItem);
                }
              });
              localStorage.removeItem("tempCart");
            }

            localStorage.setItem("cart", JSON.stringify(finalCart));
            document.dispatchEvent(new Event("cart-updated"));
            
            // If merged, immediately update the cloud cart with the merged result
            if (isLoginMerge || tempCart.length > 0) {
              await this.saveCartToCloud();
            }
          }
        }
      } catch (r) {
        console.error("فشل جلب السلة من السحابة:", r);
      }
    }
  }

  async saveCartToCloud() {
    if (this.isLoggedIn && this.userId && this.token) {
      try {
        let t = JSON.parse(localStorage.getItem("cart") || "[]");
        let e = await fetch("https://login.kanba.pw/cart", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ cart: t })
        });
        if (!e.ok) {
          console.error("فشل حفظ السلة في السحابة");
        }
      } catch (a) {
        console.error("فشل حفظ السلة في السحابة:", a);
      }
    }
  }

  getUser() {
    return this.isLoggedIn ? {
      email: this.email,
      id: this.userId || "user_" + Math.random().toString(36).substr(2,9)
    } : null;
  }

  isTokenValid() {
    let t = localStorage.getItem("userToken");
    return !!t && t.length > 10;
  }
}

const auth = new AuthManager;
window.auth = auth;

document.addEventListener("DOMContentLoaded", function() {
  if (auth.isTokenValid()) {
    auth.isLoggedIn = true;
    auth.email = localStorage.getItem("userEmail");
    auth.token = localStorage.getItem("userToken");
    auth.userId = localStorage.getItem("userId");
    
    // Check if we just redirected after logging in to perform a smart merge
    const justLoggedIn = localStorage.getItem("justLoggedIn") === "true";
    auth.loadCartFromCloud(justLoggedIn);
    if (justLoggedIn) {
      localStorage.removeItem("justLoggedIn");
    }
    
    document.dispatchEvent(new Event("auth-status-changed"));
  }
  
  if (typeof window.updateCartCount === "function") {
    window.updateCartCount();
  }
  
  if (typeof createLogoutConfirmationModal === "function") {
    createLogoutConfirmationModal();
  }
  
  document.addEventListener("cart-updated", function() {
    if (auth.isLoggedIn) {
      auth.saveCartToCloud();
    }
  });
});
