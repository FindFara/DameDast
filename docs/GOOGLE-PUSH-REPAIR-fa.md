# رفع خطای GH013 برای ورود گوگل

نسخهٔ منتشرشدهٔ `fara` مقدارهای خالی برای `Authentication:Google:ClientId` و
`Authentication:Google:ClientSecret` دارد. اگر GitHub هنگام Push به کامیت‌های
ارسال‌نشده در سیستم خودت اشاره می‌کند، یک کامیت جدید برای خالی‌کردن تنظیمات کافی نیست؛
مقدارها باید از کامیت‌هایی که قرار است ارسال شوند نیز خارج شوند.

## اجرا در PowerShell از پوشهٔ مخزن

ابتدا تغییرات باز را کامیت یا stash کن. سپس:

```powershell
git switch fara
git fetch origin
git merge origin/fara
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\repair-google-push.ps1
```

اگر merge تعارض داشت، آن را حل و کامیت کن و سپس اسکریپت را اجرا کن. در PowerShell 7
می‌توان به‌جای `powershell` از `pwsh` استفاده کرد. برای انتقال کلیدها، SDK دات‌نت
سازگار با پروژه باید نصب باشد.

اسکریپت:

- فقط روی برنچ `fara` و با working tree تمیز اجرا می‌شود.
- تنظیمات گوگل را از فایل فعلی یا آخرین نسخهٔ کامل در کامیت‌های ارسال‌نشده به User Secrets منتقل می‌کند؛ کلیدها را چاپ نمی‌کند.
- یک برنچ بازیابی **محلی** از کامیت‌های قبلی ایجاد می‌کند.
- فقط مقدارهای گوگل را در `appsettings.json` خالی می‌کند؛ بقیهٔ تنظیمات و فایل‌ها حفظ می‌شوند.
- همهٔ کامیت‌های ارسال‌نشده را در یک کامیت با والد `origin/fara` جمع می‌کند؛ تاریخچهٔ منتشرشده عوض نمی‌شود.
- خودش Push نمی‌کند.

تغییرات را بررسی و Push کن:

```powershell
git diff --stat origin/fara..HEAD
git push origin fara
```

نیازی به Force Push نیست. **از `git push --all` و ارسال برنچ `backup/…` خودداری کن**؛
نسخهٔ بازیابی هنوز اطلاعات قبلی را دارد. اگر Push جدید باز هم مسیر دیگری را گزارش کرد،
همان مسیر را جداگانه بررسی کن؛ این اسکریپت فقط تنظیمات گوگل در فایل گزارش‌شده را اصلاح می‌کند.

برای اجرای محلی از محیط `Development` استفاده کن تا User Secrets بارگذاری شود:

```powershell
dotnet run --project src/DameDast.Web --environment Development
```

روی سرور مقدارها را در `Authentication__Google__ClientId` و
`Authentication__Google__ClientSecret` یا aliasهای پشتیبانی‌شدهٔ
`GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` تنظیم کن. User Secrets برای توسعه است.
اگر Client Secret قبلاً افشا شده، در Google Cloud تعویضش کن.

مراجع: [حفاظت GitHub هنگام Push](https://docs.github.com/en/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line)
و [User Secrets در ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0).
