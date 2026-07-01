# ملخص نشر موقع وزارة الثقافة `moc.gov.sy` على Plesk

هذا الملف يلخّص كل ما تم عمله في المحادثة لنشر مشروع **Next.js + Node.js + PostgreSQL + Prisma** على Plesk للدومين الرئيسي:

```text
moc.gov.sy
```

الهدف كان استبدال موقع WordPress القديم بموقع Next.js الجديد، مع ترك `injaz.moc.gov.sy` خارج الموضوع بالكامل.

---

## 1. الحالة الأولية

كان على السيرفر:

- Plesk بصلاحية Administrator.
- الدومين الرئيسي `moc.gov.sy` شغال كموقع WordPress داخل:

```text
/var/www/vhosts/moc.gov.sy/httpdocs
```

- Node.js Toolkit ظاهر في Plesk Extensions، لكن أمر `node` لم يكن مثبتاً على النظام.
- PostgreSQL لم يكن ظاهراً ضمن Database Servers.
- كانت قاعدة MariaDB فقط موجودة، وهذا لا يناسب المشروع لأن Prisma يستخدم PostgreSQL.

---

## 2. Backup قبل الاستبدال

تم التوجيه لأخذ Backup كامل قبل لمس موقع WordPress:

```text
Tools & Settings → Backup Manager
```

مع اختيار:

```text
Full Backup
Configuration
User files
Databases
```

---

## 3. تحليل المشروع المحلي

المشروع موجود محلياً في:

```text
F:\تطبيقات انا عم اعملها\MOC\moc-website
```

أهم الملفات والمجلدات:

```text
src/
public/
prisma/
scripts/
package.json
package-lock.json
next.config.mjs
postcss.config.mjs
jsconfig.json
moc-content.json
moc-content-full.json
.env
.env.local
```

المشروع يستخدم:

```json
"next": "16.2.6",
"react": "19.2.4",
"@prisma/client": "^6.19.3",
"prisma": "^6.19.3"
```

أوامر `package.json` المهمة:

```json
"scripts": {
  "dev": "next dev --webpack",
  "build": "next build",
  "start": "next start",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:seed": "node prisma/seed.js",
  "db:studio": "prisma studio",
  "postinstall": "prisma generate"
}
```

Prisma يستخدم PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 4. تصدير قاعدة البيانات من الجهاز المحلي

ملف `.env` المحلي كان:

```env
DATABASE_URL="postgresql://postgres:****@localhost:5432/moc_cms"
```

تم اكتشاف أن PostgreSQL المحلي موجود في:

```text
C:\Program Files\PostgreSQL\18
```

أولاً تم إنشاء dump بصيغة custom:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -p 5432 -d moc_cms -F c -f moc_database.dump
```

لكن السيرفر لديه PostgreSQL 10، فظهر خطأ توافق:

```text
unsupported version (1.16) in file header
```

لذلك تم إنشاء dump بصيغة SQL:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -p 5432 -d moc_cms -f moc_database.sql
```

---

## 5. تشغيل PostgreSQL على السيرفر

من SSH:

```bash
psql --version
```

النتيجة:

```text
psql (PostgreSQL) 10.23
```

ثم:

```bash
systemctl status postgresql
```

كانت الخدمة متوقفة:

```text
Active: inactive (dead)
```

عند التشغيل ظهر أن مجلد البيانات غير مهيأ:

```text
Directory "/var/lib/pgsql/data" is missing or empty
```

تم الحل بـ:

```bash
/usr/bin/postgresql-setup initdb
systemctl start postgresql
systemctl status postgresql
```

ثم صارت الخدمة:

```text
Active: active (running)
```

---

## 6. إنشاء قاعدة البيانات على السيرفر

الدخول إلى PostgreSQL:

```bash
sudo -u postgres psql
```

ثم:

```sql
CREATE DATABASE moc_cms;
CREATE USER moc_admin WITH PASSWORD 'PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE moc_cms TO moc_admin;
\q
```

لاحقاً أضيفت صلاحيات:

```bash
sudo -u postgres psql -d moc_cms -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO moc_admin;"
sudo -u postgres psql -d moc_cms -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO moc_admin;"
sudo -u postgres psql -d moc_cms -c "GRANT ALL ON SCHEMA public TO moc_admin;"
sudo -u postgres psql -d moc_cms -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO moc_admin;"
```

---

## 7. استيراد قاعدة البيانات

تم رفع:

```text
moc_database.sql
```

إلى:

```text
/var/www/vhosts/moc.gov.sy/httpdocs/backup-upload/moc_database.sql
```

بسبب Permission denied، تم نسخ الملف إلى `/tmp`:

```bash
cp /var/www/vhosts/moc.gov.sy/httpdocs/backup-upload/moc_database.sql /tmp/
chmod 644 /tmp/moc_database.sql
```

ثم الاستيراد:

```bash
sudo -u postgres psql -d moc_cms -f /tmp/moc_database.sql
```

ظهر تحذير:

```text
invalid command \unrestrict
```

لكنه لم يمنع استيراد البيانات.

تم التحقق من الجداول:

```bash
sudo -u postgres psql -d moc_cms -c "\dt"
```

الجداول الموجودة:

```text
AuditLog
Category
Event
EventSubmission
EventType
Media
Post
PostTag
Setting
Tag
User
```

---

## 8. تعديل PostgreSQL authentication

ظهر خطأ:

```text
Ident authentication failed for user "moc_admin"
```

تم تعديل ملف:

```text
/var/lib/pgsql/data/pg_hba.conf
```

أخذ نسخة:

```bash
cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.bak
```

تغيير `ident` إلى `md5`:

```bash
sed -i 's/127\.0\.0\.1\/32            ident/127.0.0.1\/32            md5/' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/::1\/128                 ident/::1\/128                 md5/' /var/lib/pgsql/data/pg_hba.conf
systemctl reload postgresql
```

إعادة ضبط كلمة مرور مستخدم قاعدة البيانات:

```bash
sudo -u postgres psql -c "ALTER USER moc_admin WITH PASSWORD 'MocAdmin_2026_7Kb9Qx2L';"
```

استخدام `127.0.0.1` بدل `localhost` داخل `.env` لتجنب socket/ident:

```env
DATABASE_URL="postgresql://moc_admin:MocAdmin_2026_7Kb9Qx2L@127.0.0.1:5432/moc_cms?schema=public"
```

اختبار Prisma:

```bash
npx prisma db pull
```

ونجح:

```text
Introspected 11 models and wrote them into prisma/schema.prisma
```

---

## 9. تجهيز ملفات المشروع للرفع

الملف الأول كان كبيراً:

```text
moc-next-upload.zip ≈ 119 MB
```

وفشل رفعه عبر Plesk File Manager:

```text
No upload response
```

تم إنشاء ملف أخف بدون `public/uploads`:

```powershell
New-Item -ItemType Directory -Force deploy-temp
Copy-Item src,prisma,scripts,package.json,package-lock.json,next.config.mjs,postcss.config.mjs,jsconfig.json,moc-content.json,moc-content-full.json deploy-temp -Recurse -Force
New-Item -ItemType Directory -Force deploy-temp\public
Copy-Item public\fonts,public\images,public\svg deploy-temp\public -Recurse -Force
Copy-Item public\*.svg,public\*.png deploy-temp\public -Force
Compress-Archive -Path deploy-temp\* -DestinationPath moc-next-no-uploads.zip -Force
```

الحجم الجديد:

```text
24 MB تقريباً
```

تم رفعه إلى:

```text
/var/www/vhosts/moc.gov.sy/httpdocs/next-app
```

وفك الضغط أعطى تحذير backslashes من Windows لكنه استخرج الملفات.

تم التحقق:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app
ls
```

وكانت الملفات موجودة:

```text
jsconfig.json
moc-content-full.json
moc-content.json
next.config.mjs
package-lock.json
package.json
postcss.config.mjs
prisma
public
scripts
src
```

---

## 10. ملف البيئة `.env` على السيرفر

بما أن `nano` غير مثبت، تم إنشاء `.env` بـ `cat`:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app

cat > .env <<'ENVFILE'
DATABASE_URL="postgresql://moc_admin:MocAdmin_2026_7Kb9Qx2L@127.0.0.1:5432/moc_cms?schema=public"
JWT_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
SESSION_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
AUTH_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
NEXTAUTH_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
NODE_ENV="production"
ENVFILE
```

> ملاحظة أمنية: يفضل تغيير كل كلمات السر والأسرار لاحقاً لأنها ظهرت ضمن المحادثة.

---

## 11. تثبيت Node.js

النظام:

```text
AlmaLinux 8.10
```

تم تثبيت Node.js:

```bash
curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
dnf install -y nodejs
```

النسخ:

```text
node v24.16.0
npm 11.13.0
```

---

## 12. تثبيت الحزم وبناء المشروع

داخل:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app
```

تم:

```bash
npm install
npx prisma generate
npm run build
```

تم حل مشاكل الاتصال بقاعدة البيانات لاحقاً عبر تعديل `pg_hba.conf` و `.env`.

---

## 13. تشغيل المشروع عبر PM2

تشغيل تجريبي:

```bash
npm run start
```

ظهر:

```text
Next.js 16.2.6
Local: http://localhost:3000
Network: http://192.168.10.9:3000
Ready
```

اختبار:

```bash
curl -I http://127.0.0.1:3000
```

النتيجة:

```text
HTTP/1.1 307 Temporary Redirect
location: /ar
```

تثبيت PM2:

```bash
npm install -g pm2
```

تشغيل دائم:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app
pm2 start npm --name moc-next -- run start
pm2 save
pm2 list
```

الحالة:

```text
moc-next online
```

---

## 14. ربط الدومين مع Next.js

المسار في Plesk:

```text
Websites & Domains → moc.gov.sy → Hosting & DNS → Apache & nginx
```

محاولة `Additional nginx directives` فشلت بسبب:

```text
duplicate location "/"
```

ثم فشل `proxy_pass` بدون location:

```text
"proxy_pass" directive is not allowed here
```

الحل المستخدم كان Apache reverse proxy:

- ترك `Proxy mode` مفعّل.
- ترك Additional nginx directives فارغاً.
- إضافة التالي في Additional Apache directives لـ HTTP و HTTPS:

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

ظهر 504 مرة، ثم تم التحقق من PM2 و curl حتى صار الموقع يعمل.

---

## 15. الملفات التي لم تُرفع

لم يتم رفع:

```text
public/uploads
```

لذلك بعض الصور لا تظهر.

طريقة رفعها لاحقاً من الجهاز المحلي:

```powershell
cd "F:\تطبيقات انا عم اعملها\MOC\moc-website\public"
Compress-Archive -Path .\uploads -DestinationPath uploads.zip -Force
```

ثم رفع `uploads.zip` إلى:

```text
/var/www/vhosts/moc.gov.sy/httpdocs/next-app/public
```

وفك الضغط:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app/public
unzip uploads.zip
pm2 restart moc-next --update-env
```

---

## 16. تغيير favicon إلى شعار الوزارة

تم استخدام:

```text
public/logo.png
```

على السيرفر:

```bash
cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app
rm -f src/app/favicon.ico
rm -f public/favicon.ico
cp public/logo.png src/app/icon.png
cp public/logo.png public/favicon.png
```

وتعديل:

```text
src/app/layout.js
```

إلى:

```js
export const metadata = {
  title: "وزارة الثقافة",
  description: "الموقع الرسمي لوزارة الثقافة",
  icons: {
    icon: [
      { url: "/favicon.png?v=4", type: "image/png" },
      { url: "/logo.png?v=4", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=4",
    apple: "/logo.png?v=4",
  },
};

export default function RootLayout({ children }) {
  return children;
}
```

ثم:

```bash
npm run build
pm2 restart moc-next
```

تم التأكد أن الرابط التالي يعرض شعار الوزارة:

```text
https://moc.gov.sy/favicon.png?v=4
```

إذا بقيت الأيقونة القديمة في التبويب، فالسبب غالباً كاش المتصفح.

---

## 17. مشكلة تسجيل الدخول للوحة التحكم

المسار:

```text
https://moc.gov.sy/admin/login
```

ظهر في الصفحة:

```text
حدث خطأ في الخادم
```

وفي console:

```text
/api/admin/auth/login 429
/api/admin/auth/login 500
```

تم فحص اللوج:

```bash
pm2 logs moc-next --lines 100
```

ظهر أولاً:

```text
Login error: Error [DataError]: Zero-length key is not supported
```

الحل كان إضافة متغيرات الأسرار:

```env
JWT_SECRET
SESSION_SECRET
AUTH_SECRET
NEXTAUTH_SECRET
```

ثم ظهر لاحقاً:

```text
Authentication failed against database server, the provided database credentials for `moc_admin` are not valid.
```

الحل المقترح النهائي:

```bash
sudo -u postgres psql -c "ALTER USER moc_admin WITH PASSWORD 'MocAdmin_2026_7Kb9Qx2L';"

cd /var/www/vhosts/moc.gov.sy/httpdocs/next-app

cat > .env <<'ENVFILE'
DATABASE_URL="postgresql://moc_admin:MocAdmin_2026_7Kb9Qx2L@127.0.0.1:5432/moc_cms?schema=public"
JWT_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
SESSION_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
AUTH_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
NEXTAUTH_SECRET="moc_2026_R8xK92LmPq7Vn4ZaT5HsEw1JcYb3DfNg6Ur"
NODE_ENV="production"
ENVFILE

psql "postgresql://moc_admin:MocAdmin_2026_7Kb9Qx2L@127.0.0.1:5432/moc_cms" -c "\dt"
npx prisma db pull
npx prisma generate
npm run build
pm2 restart moc-next --update-env
```

---

## 18. أوامر صيانة مهمة

### حالة PM2

```bash
pm2 list
```

### إعادة تشغيل التطبيق

```bash
pm2 restart moc-next --update-env
```

### عرض اللوج

```bash
pm2 logs moc-next --lines 100
```

### اختبار Next داخلياً

```bash
curl -I http://127.0.0.1:3000
```

### حالة PostgreSQL

```bash
systemctl status postgresql
```

### اختبار قاعدة البيانات

```bash
psql "postgresql://moc_admin:MocAdmin_2026_7Kb9Qx2L@127.0.0.1:5432/moc_cms" -c "\dt"
```

### Prisma

```bash
npx prisma db pull
npx prisma generate
```

### Build

```bash
npm run build
```

---

## 19. الحالة عند آخر نقطة

تم الوصول إلى:

- PostgreSQL يعمل.
- قاعدة `moc_cms` مستوردة.
- Next.js يعمل على بورت `3000`.
- PM2 يشغل `moc-next` كخدمة دائمة.
- الدومين `moc.gov.sy` مربوط بالتطبيق.
- `favicon.png?v=4` يعرض شعار الوزارة.
- `public/uploads` لم يُرفع بعد بالكامل.
- مشكلة تسجيل الدخول كانت بسبب أسرار الجلسة أو كلمة مرور PostgreSQL، وتم تحديد أوامر الحل النهائية أعلاه.

---

## 20. تنبيه أمني

يجب تغيير هذه القيم بعد انتهاء النشر لأنها ظهرت ضمن المحادثة:

- كلمة مرور `moc_admin`.
- `JWT_SECRET`.
- `SESSION_SECRET`.
- `AUTH_SECRET`.
- `NEXTAUTH_SECRET`.
- أي كلمة مرور root أو Plesk تم استخدامها خارج هذا الملف.

---


 