# 🔧 دليل إصلاح Worker — login.kanba.pw

## المشكلة الحالية
Worker يُرجع خطأ **"غير مصرح" (401)** لأن الـ Secrets غير موجودة أو غير مضبوطة.

---

## ✅ الحل خطوة بخطوة

### الخطوة 1: تأكد من وجود الـ Secrets في Cloudflare Dashboard

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اختر **Workers & Pages**
3. اضغط على Worker باسم **`login`**
4. اذهب إلى **Settings** → **Variables and Secrets**
5. تأكد من وجود المتغيرين التاليين كـ **Secrets** (وليس Variables):
   - `BOT_TOKEN` — توكن بوت تلكرام
   - `CHAT_ID` — معرف المحادثة (Chat ID)

#### ❌ إذا لم تكن موجودة، أضفها:

```bash
# عبر Wrangler CLI (موصى به)
wrangler secret put BOT_TOKEN
# أدخل التوكن عندما يطلب منك

wrangler secret put CHAT_ID
# أدخل Chat ID (مثلاً: 6038843849)
```

أو من Dashboard:
- اضغط **Add Secret**
- الاسم: `BOT_TOKEN`، القيمة: توكن البوت
- اضغط **Add Secret** مرة أخرى
- الاسم: `CHAT_ID`، القيمة: `6038843849` (أو أي Chat ID تريد)

---

### الخطوة 2: انشر الكود المُحدّث

الملفات جاهزة في `/workspace`:
- `worker.js` — الكود الكامل مع دعم التصحيح
- `wrangler.toml` — الإعدادات مع KV Namespaces

```bash
# تثبيت Wrangler إذا لم يكن مثبتاً
npm install -g wrangler

# تسجيل الدخول
wrangler login

# نشر Worker
wrangler deploy
```

أو من Dashboard:
1. اذهب إلى Worker → **Quick Edit**
2. انسخ محتويات `worker.js` والصقها
3. اضغط **Deploy**

---

### الخطوة 3: اختبر الـ Secrets

بعد النشر، زر الرابط التالي:

```
https://login.kanba.pw/debug
```

**النتيجة المتوقعة:**
```json
{
  "hasBotToken": true,
  "hasChatId": true,
  "botTokenLength": 45,
  "chatId": "6038843849",
  "chatIdType": "string",
  "message": "✅ Secrets are configured correctly"
}
```

**إذا كانت النتيجة:**
```json
{
  "hasBotToken": false,
  "hasChatId": false,
  ...
  "message": "❌ Missing BOT_TOKEN or CHAT_ID..."
}
```
→ فهذا يعني أن الـ Secrets **غير موجودة**، عد إلى الخطوة 1.

---

### الخطوة 4: اختبر إرسال طلب

من متجرك، أرسل طلب تجريبي. إذا وصلتك الرسالة على تلكرام، فالمشكلة حُلّت! 🎉

---

## 🐛 استكشاف الأخطاء

| المشكلة | السبب | الحل |
|---------|-------|------|
| `hasBotToken: false` | BOT_TOKEN غير موجود | أضفه كـ Secret |
| `hasChatId: false` | CHAT_ID غير موجود | أضفه كـ Secret |
| `401 غير مصرح` | الـ Secrets مفقودة | راجع الخطوة 1 |
| `500 فشل الإرسال` | البوت ليس Admin في المجموعة | اجعل البوت Admin |
| `Telegram API Error` | التوكن خاطئ | تحقق من BOT_TOKEN من @BotFather |

---

## 📝 ملاحظات مهمة

1. **لا تضع الـ Secrets في `wrangler.toml`** — يجب أن تكون دائماً في Dashboard أو عبر `wrangler secret put`
2. **CHAT_ID يمكن أن يكون string أو array**:
   ```javascript
   // Chat ID واحد
   CHAT_ID = "6038843849"
   
   // متعدد
   CHAT_ID = ["6038843849", "1734895857"]
   ```
3. **تأكد أن البوت Admin** في الـ Group/Channel الذي تريد الإرسال إليه
4. **التوكن يجب أن يكون كامل** بدون مسافات، مثلاً:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

---

## 🆘 مساعدة إضافية

إذا استمرت المشكلة:
1. افتح **Console** في Cloudflare Dashboard (Workers → login → Logs)
2. أرسل طلب وشاهد الأخطاء
3. شارك الخطأ وسأساعدك في حله!

---

**تم التحديث:** 2025-01-11  
**المؤلف:** مساعد الإصلاح الآلي
