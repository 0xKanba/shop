const fs = require('fs');

const files = ['index.html', 'product.html', 'checkout.html', 'enter.html'];

const seoTags = `
  <meta name="description" content="المحل العراقي - أفضل وجهة للتسوق الإلكتروني في العراق، نوفر لك منتجات عالية الجودة بأسعار تنافسية مع خدمة توصيل سريعة وموثوقة.">
  <meta name="keywords" content="تسوق, العراق, المحل العراقي, متجر الكتروني, منتجات, بغداد, توصيل, تسوق اونلاين">
  <meta name="author" content="المحل العراقي">
  <meta property="og:title" content="المحل العراقي">
  <meta property="og:description" content="تسوق أفضل المنتجات بجودة عالية محلياً في العراق.">
  <meta property="og:image" content="https://i.postimg.cc/d3fS0sHg/pro.webp">
  <meta property="og:url" content="https://shop.kanba.pw/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="المحل العراقي">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="المحل العراقي">
  <meta name="twitter:description" content="تسوق أفضل المنتجات بجودة عالية محلياً في العراق.">
  <meta name="twitter:image" content="https://i.postimg.cc/d3fS0sHg/pro.webp">
`;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // Replace "IQ Shop" with "المحل العراقي"
  html = html.replace(/IQ Shop/g, 'المحل العراقي');
  
  // Replace "طلبات فاخرة" with "المحل العراقي — الرئيسية"
  html = html.replace(/<title>طلبات فاخرة<\/title>/, '<title>المحل العراقي — الرئيسية</title>');
  
  // For enter.html
  html = html.replace(/<title>MyOrders — تسجيل الدخول<\/title>/, '<title>المحل العراقي — تسجيل الدخول</title>');
  html = html.replace(/<span class="g">My<\/span>Orders/, '<span class="g">المحل</span> العراقي');
  html = html.replace(/alt="MyOrders"/, 'alt="المحل العراقي"');
  
  // Remove existing OG tags
  html = html.replace(/<meta property="og:title" content="[^"]*">/g, '');
  html = html.replace(/<meta property="og:description" content="[^"]*">/g, '');
  html = html.replace(/<meta property="og:image" content="[^"]*">/g, '');
  html = html.replace(/<meta property="og:url" content="[^"]*">/g, '');
  html = html.replace(/<meta property="og:type" content="[^"]*">/g, '');
  
  // Remove existing twitter tags if any
  html = html.replace(/<meta name="twitter:[^>]*>/g, '');
  
  // Remove existing description if any
  html = html.replace(/<meta name="description" [^>]*>/g, '');
  
  // Insert SEO tags after <head> or <head ...>
  // But wait, the head tag could be just <head>
  html = html.replace(/<head>/, `<head>\n${seoTags}`);
  
  fs.writeFileSync(file, html);
  console.log(`Updated ${file}`);
});
