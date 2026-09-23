# نظام تسجيل الطلبة — جاهز لـ Render

مشروع كامل باستخدام Node.js وExpress وPostgreSQL، ويحتوي على:

- صفحة تسجيل الطلبة على `/`
- لوحة الإدارة على `/admin`
- تسجيل دخول الإدارة
- عرض وبحث وحذف السجلات
- تصدير CSV
- حماية أساسية عبر Helmet وRate Limit وSessions

## التشغيل محليًا

1. ثبّت Node.js 18 أو أحدث.
2. أنشئ قاعدة PostgreSQL.
3. انسخ `.env.example` إلى `.env` واملأ القيم.
4. نفّذ:

```bash
npm install
npm start
```

ثم افتح `http://localhost:3000`.

## النشر على Render

### الطريقة الموصى بها

1. ارفع المشروع إلى مستودع GitHub.
2. في Render اختر **New Blueprint** واربط مستودع GitHub.
3. سيقرأ Render ملف `render.yaml` وينشئ خدمة الويب وقاعدة PostgreSQL.
4. عند طلب `ADMIN_PASSWORD` أدخل كلمة مرور قوية.
5. بعد اكتمال النشر افتح رابط الخدمة.

### إعدادات يدوية إن لزم الأمر

- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`
- أضف المتغيرات:
  - `NODE_ENV=production`
  - `DATABASE_URL` من قاعدة PostgreSQL
  - `SESSION_SECRET` قيمة عشوائية طويلة
  - `ADMIN_USERNAME` مثل `admin`
  - `ADMIN_PASSWORD` كلمة مرور قوية

## ملاحظات مهمة

- لا ترفع ملف `.env` إلى GitHub.
- يجب أن تكون قاعدة PostgreSQL متاحة للخدمة.
- غيّر كلمة مرور الإدارة الافتراضية قبل الاستخدام الحقيقي.
