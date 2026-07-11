const fs = require('fs');
let js = fs.readFileSync('js/product.js', 'utf8');
js = js.replace('modalImg.onclick = closeModal; // Click image to close', `  modalImg.onclick = () => {
    // Also update the main image to the one currently viewed in modal
    if(currentProduct && currentProduct.images) {
      const mainImg = document.getElementById("mainImage");
      mainImg.src = currentProduct.images[currentImageIndex];
      // Update active thumbnail
      document.querySelectorAll('.thumb-card').forEach((c, idx) => {
        if(idx === currentImageIndex) c.classList.add('active');
        else c.classList.remove('active');
      });
    }
    closeModal();
  };`);
fs.writeFileSync('js/product.js', js);
