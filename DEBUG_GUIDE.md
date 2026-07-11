# دليل تصحيح مشاكل Worker - Telegram

## المشكلة الحالية
الـ Worker يرجع خطأ "غير مصرح" (401) وهذا يعني أن الـ **Secrets** غير موجودة أو غير مضبوطة بشكل صحيح.

## الخطوات اللازمة للإصلاح

### 1. تأكد من إعداد الـ Secrets في Cloudflare Dashboard

اذهب إلى:
```
https://dash.cloudflare.com/?to=/:account/workers-and-pages/login/edit
```

ثم:
1. اضغط على **Settings** في القائمة الجانبية
2. اضغط على **Variables and Secrets**
3. تأكد من وجود متغيرين من نوع **Secret** (وليس Environment Variable):
   - `BOT_TOKEN`: توكن البوت الخاص بك (مثال: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   - `CHAT_ID`: المعرف الرقمي للحساب أو المجموعة (مثال: `123456789` أو `-1001234567890`)

### طريقة إضافة Secret جديد:
1. اضغط على **Add variable**
2. اختر **Secret** (مهم جداً!)
3. اسم المتغير: `BOT_TOKEN`
4. القيمة: توكن البوت
5. اضغط **Save**
6. كرر نفس العملية لـ `CHAT_ID`

### 2. احصل على BOT_TOKEN الصحيح

1. افتح تلكرام وابحث عن @BotFather
2. أرسل `/newbot` إذا لم يكن لديك بوت، أو `/mybots` لرؤية البوتات الموجودة
3. اختر البوت الخاص بك
4. انسخ التوكن (يبدو هكذا: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. احصل على CHAT_ID الصحيح

**للحساب الشخصي:**
1. ابحث عن @userinfobot في تلقرام
2. أرسل أي رسالة للبوت
3. سيرد لك بـ ID الخاص بك (رقم موجب مثل: `123456789`)

**للمجموعة:**
1. أضف البوت إلى المجموعة
2. اجعل البوت **Admin** في المجموعة
3. أرسل رسالة في المجموعة
4. اذهب إلى: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
5. ابحث عن `"chat":{"id":-100xxxxxxxxxx}` في الرد
6. انسخ الرقم الكامل مع الإشارة السالبة إذا وجدت

### 4. انشر التحديثات

بعد إضافة الـ Secrets:
1. اذهب إلى Cloudflare Dashboard
2. Workers & Pages → login → Deployments
3. اضغط على **Create deployment** أو **Redeploy**
4. أو عدّل الكود قليلاً واضغط Save & Deploy

### 5. اختبر الـ Worker

**اختبار نقطة التصحيح:**
```bash
curl https://login.kanba.pw/debug
```

يجب أن ترى رد مثل:
```json
{
  "hasBotToken": true,
  "hasChatId": true,
  "botTokenLength": 46,
  "chatId": "123456789"
}
```

إذا رأيت `false` في أي مكان، فالـ Secrets غير مضبوطة!

**اختبار إرسال طلب:**
```bash
curl -X POST https://login.kanba.pw/order \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "اسم تجريبي",
    "phoneNumber": "+9647700000000",
    "address": "بغداد",
    "items": [{"name": "منتج 1", "quantity": 2}],
    "total": 5000
  }'
```

## أخطاء شائعة وحلولها

| الخطأ | السبب | الحل |
|-------|-------|------|
| "غير مصرح" | Secrets غير موجودة | أضف BOT_TOKEN و CHAT_ID كـ Secrets |
| "Unauthorized" في telegramError | التوكن خاطئ | تحقق من BOT_TOKEN |
| "Chat not found" | CHAT_ID خاطئ أو البوت ليس Admin | تحقق من CHAT_ID واجعل البوت Admin |
| "Bad Request: message text is empty" | مشكلة في تنسيق الرسالة | تأكد من وجود بيانات في الطلب |

## ملاحظات مهمة

1. **Secrets ≠ Variables**: يجب أن تكون من نوع Secret وليس Environment Variable
2. **إعادة النشر ضرورية**: بعد إضافة Secrets جديدة، يجب عمل Redeploy للـ Worker
3. **البوت يجب أن يكون Admin**: إذا كنت ترسل لمجموعة، البوت يجب أن يكون عضو فيها وAdmin
4. **CHAT_ID للمجموعات يبدأ بـ `-`**: مثل `-1001234567890`

