# إعداد Telegram Bot لمتجر Cloudflare Pages + Workers

## الملفات المطلوبة في الـ repo

### 1. ملف `wrangler.toml` (اختياري إذا كنت تستخدم Dashboard)
```toml
name = "login"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
# لا تضع الـ secrets هنا! استخدم wrangler secret put

[[routes]]
pattern = "login.0xkanba.workers.dev/*"
zone_name = "0xkanba.pw"
```

### 2. Worker Code (`src/index.js`)
```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // التعامل مع CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // مسار إرسال الطلبات إلى Telegram
    if (url.pathname === '/order' && request.method === 'POST') {
      try {
        const orderData = await request.json();
        
        // تنسيق الرسالة
        let message = `🛒 **طلب جديد!**\n\n`;
        message += `👤 **الاسم:** ${orderData.customerName}\n`;
        message += `📱 **الهاتف:** ${orderData.phoneNumber}\n`;
        message += `📍 **العنوان:** ${orderData.address}\n\n`;
        message += `**المنتجات:**\n`;
        
        orderData.items.forEach(item => {
          message += `  • ${item.name} (${item.quantity} قطعة)\n`;
        });
        
        message += `\n💰 **المجموع:** ${orderData.total.toLocaleString()} د.ع`;

        // إرسال إلى Telegram
        const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        const result = await response.json();
        
        if (result.ok) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          console.error('Telegram API Error:', result);
          return new Response(JSON.stringify({ error: 'Failed to send to Telegram' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('Order Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

## إعداد الـ Secrets

### الطريقة 1: عبر CLI (موصى بها)
```bash
# تثبيت Wrangler CLI
npm install -g wrangler

# تسجيل الدخول
wrangler login

# إضافة الـ secrets
wrangler secret put BOT_TOKEN
# أدخل توكن البوت هنا (مثال: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)

wrangler secret put CHAT_ID
# أدخل الـ Chat ID هنا (مثال: -1001234567890)
```

### الطريقة 2: عبر Cloudflare Dashboard
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اختر Workers & Pages
3. اختر الـ Worker الخاص بك (`login`)
4. اضغط على **Settings** → **Variables**
5. تحت **Environment Variables**، اضغط **Add Variable**
6. أضف كل متغير كـ **Secret** (ليس variable عادي):
   - اسم: `BOT_TOKEN`, القيمة: توكن البوت
   - اسم: `CHAT_ID`, القيمة: الـ Chat ID

## كيفية الحصول على BOT_TOKEN و CHAT_ID

### 1. إنشاء بوت والحصول على TOKEN:
- افتح تلكرام وابحث عن `@BotFather`
- أرسل `/newbot`
- اتبع التعليمات واختر اسم للبوت
- ستحصل على توكن مثل: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. الحصول على CHAT_ID:
**للـ Group:**
- أضف البوت إلى المجموعة
- اجعل البوت Admin
- أرسل رسالة في المجموعة
- افتح هذا الرابط في المتصفح (استبدل YOUR_BOT_TOKEN بالتوكن):
  ```
  https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
  ```
- ابحث عن `"chat":{"id":-100xxxxxxxxxx` وانسخ الرقم (مع الإشارة السالبة)

**للـ Channel:**
- أنشئ قناة وأضف البوت كـ Admin
- أرسل رسالة في القناة
- استخدم نفس الرابط أعلاه للحصول على الـ ID
- الـ Channel ID يكون عادة مثل: `-1001234567890`

## التحقق من العمل

بعد نشر التغييرات:

1. تأكد أن الـ Worker منتشر على `https://login.0xkanba.workers.dev`
2. جرب إرسال طلب تجريبي من الموقع
3. تحقق من الـ Logs في Cloudflare Dashboard:
   - Workers → login → Logs
4. يجب أن تصلك رسالة على تلكرام

## استكشاف الأخطاء

### المشكلة: الطلبات لا تصل
- تحقق من أن الـ Secrets مضبوطة بشكل صحيح
- تحقق من Logs في Cloudflare
- تأكد أن البوت Admin في الـ Group/Channel
- جرب إرسال رسالة مباشرة عبر:
  ```
  https://api.telegram.org/botYOUR_TOKEN/sendMessage?chat_id=YOUR_CHAT_ID&text=Test
  ```

### المشكلة: خطأ CORS
- تأكد من إضافة headers الـ CORS في الـ Worker
- تأكد من معالجة OPTIONS requests

### المشكلة: الخطأ 404 على /order
- تأكد أن الـ Worker مربوط بالدومين الصحيح
- تحقق من المسار في الكود (`/order`)
