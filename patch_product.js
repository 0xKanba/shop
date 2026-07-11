const fs = require('fs');

let js = fs.readFileSync('js/product.js', 'utf8');

const oldModalCode = `  // Gallery Modal
  const modal = document.getElementById("gallery-modal");
  const modalImg = document.getElementById("modalImg");
  document.getElementById("mainImageWrap").onclick = () => {
    modalImg.src = document.getElementById("mainImage").src;
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
  };
  document.getElementById("modalClose").onclick = () => {
    modal.classList.remove("active");
    setTimeout(() => modal.style.display = "none", 300);
  };`;

const newModalCode = `  // Gallery Modal
  const modal = document.getElementById("gallery-modal");
  const modalImg = document.getElementById("modalImg");
  let currentImageIndex = 0;

  function updateModalImage() {
    if(currentProduct && currentProduct.images) {
      modalImg.src = currentProduct.images[currentImageIndex];
    }
  }

  document.getElementById("mainImageWrap").onclick = () => {
    if(currentProduct && currentProduct.images) {
      const currentSrc = document.getElementById("mainImage").src;
      currentImageIndex = currentProduct.images.findIndex(img => currentSrc.includes(img));
      if(currentImageIndex === -1) currentImageIndex = 0;
      updateModalImage();
      modal.style.display = "flex";
      setTimeout(() => modal.classList.add("active"), 10);
    }
  };

  const closeModal = () => {
    modal.classList.remove("active");
    setTimeout(() => modal.style.display = "none", 300);
  };

  document.getElementById("modalClose").onclick = closeModal;
  modalImg.onclick = closeModal; // Click image to close

  document.getElementById("modalPrev")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if(currentProduct && currentProduct.images) {
      currentImageIndex = (currentImageIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
      updateModalImage();
    }
  });

  document.getElementById("modalNext")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if(currentProduct && currentProduct.images) {
      currentImageIndex = (currentImageIndex + 1) % currentProduct.images.length;
      updateModalImage();
    }
  });`;

js = js.replace(oldModalCode, newModalCode);
fs.writeFileSync('js/product.js', js);
