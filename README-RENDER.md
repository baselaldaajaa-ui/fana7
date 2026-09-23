# نشر المشروع على Render

هذا الإصدار يستخدم PostgreSQL بدل SQLite، حتى تكون بيانات التسجيل محفوظة في قاعدة بيانات منفصلة عند النشر.

## أسرع طريقة

1. ارفع هذا المجلد إلى مستودع GitHub خاص بالمشروع.
2. افتح Render وسجّل الدخول.
3. اختر New ثم Blueprint.
4. اختر مستودع GitHub الذي يحتوي على المشروع.
5. Render سيقرأ `render.yaml` ويجهز Web Service وقاعدة PostgreSQL.
6. عند طلب `ADMIN_PASSWORD` ضع كلمة مرور قوية خاصة بالمشروع.
7. بعد نجاح النشر افتح رابط `onrender.com` الذي يعطيه Render.
8. صفحة الطلاب هي `/`.
9. لوحة الإدارة هي `/admin`.

## ملاحظة مهمة عن الخطة المجانية

Render يوضح أن قاعدة PostgreSQL المجانية الحالية لها مدة محدودة، لذلك لا تستخدمها لحفظ بيانات حقيقية على المدى الطويل. للمشروع الجامعي التجريبي استخدم بيانات وهمية فقط.

## QR

بعد حصولك على الرابط النهائي، مثال:
https://student-registration-demo.onrender.com

اصنع QR لهذا الرابط، وليس `localhost`.

## البيانات

الرقم الوطني في هذا المشروع حقل تجريبي. لا تدخل أرقامًا وطنية حقيقية.


## Free plan
The Blueprint explicitly sets the web service and Render Postgres database to the `free` compute plan. Render's Free Postgres has a 30-day lifetime and Free web services spin down after 15 minutes of inactivity, so this configuration is intended for a student/demo project.
