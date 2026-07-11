const fs = require('fs');

// Patch product.js
let productJs = fs.readFileSync('js/product.js', 'utf8');
const oldAddToCartCode = `      btnAddCart.disabled = true;
      const orig = btnAddCart.innerHTML;
      btnAddCart.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';`;

const newAddToCartCode = `      const token = localStorage.getItem("userToken");
      if (!token) {
        const pendingCartItem = { id: currentProduct.id, name: currentProduct.title, price: currentProduct.price, quantity: qty };
        localStorage.setItem("pendingCartAdd", JSON.stringify(pendingCartItem));
        localStorage.setItem("redirectAfterLogin", window.location.href);
        window.location.href = '/enter.html';
        return;
      }

      btnAddCart.disabled = true;
      const orig = btnAddCart.innerHTML;
      btnAddCart.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';`;

productJs = productJs.replace(oldAddToCartCode, newAddToCartCode);
fs.writeFileSync('js/product.js', productJs);

// Patch enter.js
let enterJs = fs.readFileSync('js/enter.js', 'utf8');
const oldLoginSuccess = `    localStorage.setItem('username',   username);
    location.replace('/');`;

const newLoginSuccess = `    localStorage.setItem('username',   username);
    await handlePendingCart(data.token);`;

const oldRegisterSuccess = `    localStorage.setItem('username',   username);
    location.replace('/');`;

const newRegisterSuccess = `    localStorage.setItem('username',   username);
    await handlePendingCart(data.token);`;

enterJs = enterJs.replace(oldLoginSuccess, newLoginSuccess).replace(oldRegisterSuccess, newRegisterSuccess);

const handlePendingCode = `

async function handlePendingCart(token) {
  const pending = localStorage.getItem('pendingCartAdd');
  if (pending) {
    try {
      let pendingItem = JSON.parse(pending);
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const idx = cart.findIndex(i => i.id === pendingItem.id);
      if (idx >= 0) cart[idx].quantity += pendingItem.quantity;
      else cart.push(pendingItem);
      
      const res = await fetch(\`\${API}/cart\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ cart })
      });
      if (res.ok) {
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('pendingCartAdd');
  }
  const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/';
  localStorage.removeItem('redirectAfterLogin');
  location.replace(redirectUrl);
}
`;

enterJs = enterJs + handlePendingCode;
fs.writeFileSync('js/enter.js', enterJs);
