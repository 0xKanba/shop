# MyOrders Backend - Cloudflare Worker

هذا المستودع يحتوي على كود الـ Backend لمتجر MyOrders الذي يعمل على Cloudflare Workers.

## 📁 الملفات
- `worker.js`: كود الـ Worker الكامل (API + Telegram)
- `wrangler.toml`: إعدادات النشر والـ KV Namespaces

## 🚀 خطوات النشر

### 1. تثبيت Wrangler CLI
```bash
npm install -g wrangler
```

### 2. تسجيل الدخول
```bash
wrangler login
```

### 3. إضافة الـ Secrets (مهم جداً!)
يجب إضافة هذه المفاتيح كـ **Secrets** وليس Variables:

```bash
wrangler secret put BOT_TOKEN
# أدخل توكن البوت هنا (مثال: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)

wrangler secret put CHAT_ID
# أدخل Chat ID هنا (مثال: 6038843849)
```

**أو من Dashboard:**
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → **login** → Settings → **Variables and Secrets**
3. اضغط **Add Secret** وأضف:
   - `BOT_TOKEN`: توكن بوت تلكرام
   - `CHAT_ID`: الـ Chat ID الخاص بك

### 4. النشر
```bash
wrangler deploy
```

## ✅ التحقق من العمل

بعد النشر، افتح هذا الرابط للتحقق من الإعدادات:
```
https://login.kanba.pw/debug
```

النتيجة المتوقعة:
```json
{
  "hasBotToken": true,
  "hasChatId": true,
  "botTokenLength": 45,
  "chatId": "6038843849",
  "message": "✅ Secrets are configured correctly"
}
```

## 📦 إرسال الطلبات إلى تلكرام

عندما يرسل العميل طلباً من الموقع، سيتم إرساله إلى:
```
POST https://login.kanba.pw/order
```

الـ Worker سيقوم بإرسال الرسالة إلى تلكرام فوراً باستخدام الصيغة:
```
🛒 *طلب جديد — MyOrders*
👤 الاسم: ...
📞 الهاتف: ...
📍 العنوان: ...
🧾 المنتجات: ...
💰 المجموع: ... د.ع
```

## ⚠️ ملاحظات مهمة

1. **لا تضع الـ Secrets في wrangler.toml** - يجب إضافتها فقط عبر Dashboard أو `wrangler secret put`
2. تأكد أن **البوت Admin** في المجموعة/القناة التي تريد الإرسال إليها
3. التوكن يجب أن يكون بدون مسافات
4. إذا استخدمت Webhook، قم بإلغائه لأننا نستخدم Pull API:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook
   ```

## 🔧 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `غير مصرح` في /debug | أضف الـ Secrets من Dashboard |
| الطلبات لا تصل لتلكرام | تأكد من أن البوت Admin في المجموعة |
| خطأ 400 في الإرسال | تحقق من صحة التوكن و Chat ID |
| CORS Error | تأكد أن الموقع يرسل لـ `https://login.kanba.pw/order` |

## 📞 الدعم

إذا واجهت مشكلة، تحقق من:
1. وجود الـ Secrets في Dashboard
2. صحة التوكن و Chat ID
3. أن البوت لديه صلاحيات الإرسال في المجموعة
