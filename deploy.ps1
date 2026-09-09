# ══════════════════════════════════════════════════════
#  deploy.ps1 — رفع تحديثات موقع وزارة الثقافة للسيرفر
#  الاستخدام:  .\deploy.ps1
#              .\deploy.ps1 -PackageOnly     (تجهيز الحزمة فقط بدون رفع)
#              .\deploy.ps1 -SkipBuild       (تحزيم بناء موجود بدون إعادة بنائه)
#
#  البناء يتم هنا على جهاز التطوير، لا على السيرفر.
#  `next build` على السيرفر يستغرق دقائق بسبب محدودية الذاكرة، بينما ينتهي
#  محلياً خلال ٢٠–٥٠ ثانية. لذلك نرفع ناتج البناء (.next) جاهزاً بدل الكود
#  المصدري (src)، ويبقى على السيرفر `npm install` وحده — وهو ضروري لأن
#  محرّك Prisma وثنائيات لينكس يجب أن تُولَّد على نظام السيرفر لا على ويندوز.
# ══════════════════════════════════════════════════════

param(
    [switch]$PackageOnly,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$SERVER   = "root@moc.gov.sy"
$APP_DIR  = "/var/www/vhosts/moc.gov.sy/httpdocs/next-app"
$ZIP_NAME = "moc-update.zip"
$STAGE    = "deploy-temp"

# محتويات الحزمة — مطابقة لما هو موثّق في AGENTS.md.
# لاحظ `.next` بدل `src`: السيرفر ما عاد يقرأ الكود المصدري، بل ناتج البناء.
$ITEMS = @(
    ".next", "prisma", "scripts", "design-system",
    "package.json", "package-lock.json",
    "next.config.mjs", "postcss.config.mjs", "jsconfig.json",
    "README.md", "AGENTS.md"
)

# ما يجب ألا يصل السيرفر أبداً.
$FORBIDDEN = @("uploads/", "uploads.zip", "node_modules/", ".env", ".codegraph", ".dump", ".next/cache/", ".next/dev/", "src/")

Write-Host ""
Write-Host "=== MOC Deploy ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. تنظيف أي ملفات مؤقتة سابقة ──
Write-Host "[1/7] تنظيف الملفات المؤقتة..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $STAGE, $ZIP_NAME -ErrorAction Ignore

# ── 2. البناء محلياً ──
if (-not $SkipBuild) {
    Write-Host "[2/7] توليد Prisma Client وبناء المشروع محلياً..." -ForegroundColor Yellow
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { Write-Host "فشل توليد Prisma Client!" -ForegroundColor Red; exit 1 }

    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "فشل البناء!" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "[2/7] تخطي البناء (-SkipBuild) — يُستخدم .next الموجود حالياً." -ForegroundColor DarkYellow
    if (-not (Test-Path ".next\BUILD_ID")) {
        Write-Host "لا يوجد .next\BUILD_ID — لا يوجد بناء سابق صالح للرفع." -ForegroundColor Red
        exit 1
    }
}

# ── 3. تجهيز الملفات ──
Write-Host "[3/7] تجهيز ملفات التحديث..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force $STAGE | Out-Null

# مجلدات داخل .next لا ترافق النشر:
#   cache        ذاكرة بناء مؤقتة مرتبطة بجهاز التطوير.
#   dev          مخرجات خادم التطوير (npm run dev) — تتجاوز ١.٥ غيغابايت
#                ولا يقرأها next start إطلاقاً.
#   node_modules روابط رمزية ينشئها Turbopack نحو node_modules الحقيقي.
#                ضغطها على ويندوز يتبع الرابط وينسخ الحزمة كاملة
#                (١.٢ غيغابايت + ثنائيات ويندوز لا تعمل على لينكس)،
#                لذلك نستثنيها ونعيد إنشاءها على السيرفر — انظر أدناه.
$NEXT_SKIP = @("cache", "dev", "node_modules")

foreach ($item in $ITEMS) {
    if ($item -eq ".next") {
        New-Item -ItemType Directory -Force "$STAGE\.next" | Out-Null
        Get-ChildItem ".next" -Force |
            Where-Object { $NEXT_SKIP -notcontains $_.Name } |
            ForEach-Object { Copy-Item $_.FullName "$STAGE\.next" -Recurse -Force }
    }
    elseif (Test-Path $item) { Copy-Item $item $STAGE -Recurse -Force }
    else { Write-Host "     تحذير: $item غير موجود" -ForegroundColor DarkYellow }
}

# public كاملاً ما عدا رفوعات المستخدمين.
New-Item -ItemType Directory -Force "$STAGE\public" | Out-Null
Get-ChildItem public -Force |
    Where-Object { $_.Name -ne "uploads" -and $_.Name -ne "uploads.zip" } |
    ForEach-Object { Copy-Item $_.FullName "$STAGE\public" -Recurse -Force }

# ── إعادة بناء روابط Turbopack على السيرفر ──
# مخرجات البناء تستدعي الحزم بأسماء مستعارة مجزّأة، مثلاً:
#     require("@prisma/client-2c3a283f134fdcb6")
# وNode يحلّها بالصعود حتى .next/node_modules. بدون هذه الروابط يفشل
# التطبيق وقت التشغيل بـ MODULE_NOT_FOUND، لا وقت البناء. الأسماء المجزّأة
# تتغير مع كل بناء، فنولّد السكربت من الروابط الفعلية بدل كتابتها يدوياً،
# ونوجّهها إلى node_modules الخاص بالسيرفر (المثبّت بـ npm install) حتى
# يبقى محرّك Prisma مطابقاً لنظام السيرفر لا لويندوز.
#
# السكربت يتحقق من نتيجته بنفسه: رابط لا يُحلّ يوقف النشر قبل إعادة تشغيل
# pm2، فيبقى الإصدار السابق يعمل بدل أن يسقط الموقع.
$aliasLines = @("#!/bin/sh", "set -e", "rm -rf .next/node_modules")
$aliasChecks = @()
if (Test-Path ".next\node_modules") {
    $root = (Resolve-Path ".next\node_modules").Path
    Get-ChildItem ".next\node_modules" -Force -Recurse -Attributes ReparsePoint | ForEach-Object {
        $alias  = $_.FullName.Substring($root.Length + 1).Replace("\", "/")
        $target = $_.Target -replace "\\", "/"
        # المسار النسبي من موقع الرابط إلى node_modules في جذر المشروع.
        $depth  = ($alias -split "/").Count + 1
        $up     = ("../" * $depth)
        $pkg    = $target -replace ".*/node_modules/", ""
        $aliasLines += "mkdir -p `"`$(dirname '.next/node_modules/$alias')`""
        $aliasLines += "ln -sfn $up" + "node_modules/$pkg '.next/node_modules/$alias'"
        $aliasChecks += "test -e '.next/node_modules/$alias' || { echo 'رابط مكسور: $alias (هل نجح npm install؟)' >&2; exit 1; }"
    }
}
$aliasLines += $aliasChecks
$aliasLines += "echo 'روابط Turbopack سليمة.'"

# بدون BOM وبنهايات أسطر LF: `Set-Content -Encoding utf8` في PowerShell 5.1
# يكتب BOM، وعندها يقرأ sh السطر الأول كأمر غريب بدل `#!/bin/sh` ويفشل.
[System.IO.File]::WriteAllText(
    (Join-Path (Resolve-Path $STAGE) "restore-next-aliases.sh"),
    ($aliasLines -join "`n") + "`n",
    (New-Object System.Text.UTF8Encoding $false)
)
Write-Host "     روابط Turbopack المُعاد إنشاؤها على السيرفر: $($aliasChecks.Count)" -ForegroundColor Gray

# ── 4. الضغط ──
Write-Host "[4/7] ضغط الملفات..." -ForegroundColor Yellow
tar -acf $ZIP_NAME -C $STAGE .
if ($LASTEXITCODE -ne 0) { Write-Host "فشل الضغط!" -ForegroundColor Red; exit 1 }
Remove-Item -Recurse -Force $STAGE

$sizeMB = [math]::Round((Get-Item $ZIP_NAME).Length / 1MB, 1)
Write-Host "     الحجم: $sizeMB MB" -ForegroundColor Gray

# ── 5. التحقق من محتوى الحزمة قبل الرفع ──
# فحص فعلي وليس افتراضاً: خطأ واحد في التجهيز كفيل برفع ملف .env أو
# مجلد الرفوعات إلى السيرفر، وعندها يكون الوقت قد فات.
Write-Host "[5/7] فحص محتوى الحزمة..." -ForegroundColor Yellow
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $ZIP_NAME))
$names = $archive.Entries | ForEach-Object { $_.FullName }
$archive.Dispose()

$violations = $names | Where-Object { $name = $_; $FORBIDDEN | Where-Object { $name -like "*$_*" } }
if ($violations) {
    Write-Host "الحزمة تحتوي ملفات ممنوعة — أُلغي النشر:" -ForegroundColor Red
    $violations | Select-Object -First 20 | ForEach-Object { Write-Host "     $_" -ForegroundColor Red }
    exit 1
}
# tar يكتب المسارات مسبوقة بـ ./ لأننا نضغط محتوى مجلد التجهيز (-C $STAGE .)
if (-not ($names -match "(^|/)\.next/BUILD_ID$")) {
    Write-Host "الحزمة لا تحتوي .next/BUILD_ID — البناء غير مكتمل. أُلغي النشر." -ForegroundColor Red
    exit 1
}
Write-Host "     $($names.Count) ملف — لا كود مصدري ولا رفوعات ولا أسرار ولا اعتماديات" -ForegroundColor Gray

# أوامر السيرفر — تُطبع دائماً لأن الرفع قد يتم يدوياً عبر Plesk File Manager
# حين يكون SSH من الخارج محجوباً.
$serverSteps = @(
    "cd $APP_DIR",
    "pm2 stop moc-next",
    "rm -rf .next src",
    "unzip -o $ZIP_NAME",
    "rm -f $ZIP_NAME",
    "npm install",
    "npx prisma migrate deploy",
    "npx prisma generate",
    "sh restore-next-aliases.sh && rm -f restore-next-aliases.sh",
    "pm2 restart moc-next --update-env"
)

if ($PackageOnly) {
    Write-Host ""
    Write-Host "تم تجهيز $ZIP_NAME ($sizeMB MB)." -ForegroundColor Green
    Write-Host ""
    Write-Host "ارفعه إلى $APP_DIR ثم نفّذ على السيرفر:" -ForegroundColor Cyan
    Write-Host ""
    $serverSteps | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "لا يوجد npm run build — البناء تم هنا." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

# ── 6. الرفع ──
Write-Host "[6/7] رفع الملف للسيرفر عبر SCP..." -ForegroundColor Yellow
scp $ZIP_NAME "${SERVER}:${APP_DIR}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "فشل الرفع! تحقق من الاتصال بالسيرفر ومن مفتاح SSH." -ForegroundColor Red
    Write-Host ""
    Write-Host "بديل: ارفع $ZIP_NAME يدوياً عبر Plesk File Manager إلى:" -ForegroundColor Cyan
    Write-Host "   $APP_DIR" -ForegroundColor Cyan
    Write-Host "ثم نفّذ في SSH Terminal الخاص بـ Plesk:" -ForegroundColor Cyan
    Write-Host ""
    $serverSteps | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
    exit 1
}

# ── 7. تطبيق التحديثات على السيرفر ──
# ملاحظة مهمة: هنا `prisma migrate deploy` وليس `db push`.
#   db push يزامن المخطط مباشرة بلا سجل مايغريشن، ويقدر يحذف أعمدة
#   وبيانات إنتاجية بلا سؤال. وحُذف كذلك `node prisma/seed.js` لأن
#   تشغيل بذور البيانات على الإنتاج يكتب فوق بيانات حقيقية.
# ولا يوجد هنا `npm run build` — البناء تم محلياً.
Write-Host "[7/7] تطبيق التحديثات على السيرفر..." -ForegroundColor Yellow

ssh $SERVER ($serverSteps -join " && ")
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "فشل التطبيق على السيرفر. التطبيق قد يكون متوقفاً — راجع:" -ForegroundColor Red
    Write-Host "   ssh $SERVER 'pm2 logs moc-next --lines 100 --nostream'" -ForegroundColor Red
    exit 1
}

# ── فحص تطابق المخطط مع قاعدة البيانات ──
# `migrate deploy` الناجح لا يعني أن الإنتاج مطابق لـ schema.prisma: جداول
# أُنشئت يوماً بـ db push على جهاز التطوير قد تكون غائبة عن الإنتاج بينما
# سجل المايغريشن يدّعي العكس. راجع AGENTS.md.
Write-Host ""
Write-Host "فحص تطابق قاعدة البيانات مع المخطط..." -ForegroundColor Yellow
$diff = ssh $SERVER "cd $APP_DIR && npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script 2>/dev/null"
if ($diff -match "empty migration") {
    Write-Host "     قاعدة البيانات مطابقة للمخطط." -ForegroundColor Gray
} else {
    Write-Host "     تحذير: يوجد فرق بين قاعدة البيانات والمخطط. راجعه قبل تطبيقه:" -ForegroundColor DarkYellow
    Write-Host ""
    $diff | Select-Object -First 40 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkYellow }
}

Write-Host ""
Write-Host "✅ اكتمل النشر!" -ForegroundColor Green
Write-Host ""
