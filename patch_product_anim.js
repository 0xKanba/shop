const fs = require('fs');

let js = fs.readFileSync('js/product.js', 'utf8');

const oldCode = `      showToast(\`تمت إضافة \${qty} × \${currentProduct.title}\`);
      
      btnAddCart.innerHTML = '<i class="fas fa-check"></i>';
      btnAddCart.style.background = "var(--surface-1)";
      btnAddCart.style.color = "var(--text-main)";
      setTimeout(() => { btnAddCart.innerHTML = orig; btnAddCart.style = ""; btnAddCart.disabled = false; qty=1; qtyVal.textContent=1; }, 2000);`;

const newCode = `      showToast(\`تمت إضافة \${qty} × \${currentProduct.title}\`);
      
      btnAddCart.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';
      btnAddCart.classList.add('success-anim');
      
      if (window.confetti) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']
        });
      }
      
      setTimeout(() => { 
        btnAddCart.innerHTML = orig; 
        btnAddCart.classList.remove('success-anim');
        btnAddCart.disabled = false; 
        qty = 1; 
        qtyVal.textContent = 1; 
      }, 2000);`;

js = js.replace(oldCode, newCode);
fs.writeFileSync('js/product.js', js);
