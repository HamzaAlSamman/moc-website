# ══════════════════════════════════════════════════════
#  deploy.ps1 — رفع تحديثات موقع وزارة الثقافة للسيرفر
#  الاستخدام:  .\deploy.ps1
# ══════════════════════════════════════════════════════

$SERVER   = "root@moc.gov.sy"
$APP_DIR  = "/var/www/vhosts/moc.gov.sy/httpdocs/next-app"
$ZIP_NAME = "moc-update.zip"

Write-Host ""
Write-Host "=== MOC Deploy ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. تنظيف أي ملفات مؤقتة سابقة ──
Write-Host "[1/5] تنظيف الملفات المؤقتة..." -ForegroundColor Yellow
Remove-Item -Recurse -Force deploy-temp, $ZIP_NAME -ErrorAction Ignore

# ── 2. نسخ الملفات المطلوبة ──
Write-Host "[2/5] تجهيز ملفات التحديث..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force deploy-temp | Out-Null

$items = @("src","prisma","scripts","package.json","package-lock.json","next.config.mjs","postcss.config.mjs","jsconfig.json")
foreach ($item in $items) {
    if (Test-Path $item) {
        Copy-Item $item deploy-temp -Recurse -Force
    }
}

New-Item -ItemType Directory -Force "deploy-temp\public" | Out-Null
$pubFolders = @("public\fonts","public\images","public\svg")
foreach ($f in $pubFolders) {
    if (Test-Path $f) { Copy-Item $f deploy-temp\public -Recurse -Force }
}
if (Test-Path "public\*.svg")  { Copy-Item "public\*.svg"  deploy-temp\public -Force }
if (Test-Path "public\*.png")  { Copy-Item "public\*.png"  deploy-temp\public -Force }
if (Test-Path "public\*.ico")  { Copy-Item "public\*.ico"  deploy-temp\public -Force }

# ── 3. ضغط الملفات ──
Write-Host "[3/5] ضغط الملفات..." -ForegroundColor Yellow
tar -acf $ZIP_NAME -C deploy-temp .
Remove-Item -Recurse -Force deploy-temp

$sizeMB = [math]::Round((Get-Item $ZIP_NAME).Length / 1MB, 1)
Write-Host "     الحجم: $sizeMB MB" -ForegroundColor Gray

# ── 4. رفع الملف للسيرفر ──
Write-Host "[4/5] رفع الملف للسيرفر عبر SCP..." -ForegroundColor Yellow
scp $ZIP_NAME "${SERVER}:${APP_DIR}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "فشل الرفع! تحقق من الاتصال بالسيرفر." -ForegroundColor Red
    exit 1
}
Remove-Item -Force $ZIP_NAME

# ── 5. تطبيق التحديثات على السيرفر ──
Write-Host "[5/5] تطبيق التحديثات على السيرفر..." -ForegroundColor Yellow
$remote_cmd = @"
cd $APP_DIR
unzip -o $ZIP_NAME -d . && rm -f $ZIP_NAME
npm install --prefer-offline
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run build
pm2 restart moc-next
echo '✅ تم التحديث بنجاح!'
"@
ssh $SERVER $remote_cmd

Write-Host ""
Write-Host "✅ اكتمل النشر!" -ForegroundColor Green
Write-Host ""
