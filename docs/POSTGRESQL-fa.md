# دیتابیس PostgreSQL

تمام داده‌های سرور .NET فقط در PostgreSQL ذخیره می‌شوند: دفتر کامل مالی، یادداشت‌ها، طراحی‌ها، تسک‌ها، تقویم، برنامه‌ریزی، تجمیع، تنظیمات همگام‌شوندهٔ میز کار، رسید عملیات، بوم و لینک‌های اشتراک و کتابخانهٔ آن، ثبت دستگاه‌های Push، رسید یادآورها و تاریخچهٔ بازار. قالب API و بکاپ کاربران حفظ شده است. IndexedDB مرورگر همچنان کش و صف کار آفلاین است؛ انتخاب زبان و ظاهر و دادهٔ مهمان طبق رفتار فعلی محلی می‌مانند. استقرار Worker/D1 خارج از این مخزن، دیتابیس مستقل دارد.

## ساختار جدول‌ها و مسئولیت کد

دفتر کامل دیگر در ستون JSON واحد ذخیره نمی‌شود. هر رکورد یک ردیف مستقل دارد؛ فقط محتوای متغیر هر نوع رکورد در JSONB می‌ماند. رکوردهای مالی، یادداشت و کارها در جدول مشترک `FinanceRecords` با `Kind` جدا می‌شوند و برای هر نوع جدول تخصصی جدا ایجاد نشده است.

| جدول | مسئولیت و رابطه |
| --- | --- |
| `Ledgers` | شناسهٔ کاربر، نسخهٔ دفتر و زمان تغییر؛ کنترل تعارض کل batch |
| `FinanceRecords` | کلید مرکب UserId/Id، نوع، نسخه، حذف منطقی، ترتیب و Data از نوع JSONB؛ وابسته به Ledgers |
| `Receipts` | کلید UserId/OperationId و متن دقیق درخواست برای جلوگیری از اعمال تکراری؛ وابسته به Ledgers |
| `Whiteboards` | سند بوم، مالک، نسخه و State از نوع JSONB |
| `WhiteboardOperations` | رسید عملیات بوم؛ کلید مرکب سند/عملیات و رابطه با Whiteboards |
| `WhiteboardShares` | لینک یکتا، نقش محدود به view/edit، انقضا و لغو؛ وابسته به Whiteboards |
| `WhiteboardLibraries` | کتابخانهٔ کاربر با نسخه و Items از نوع JSONB |
| `Subscriptions` | دستگاه Push و زبان؛ ایندکس UserId |
| `ReminderReceipts` | رسید ارسال و ایندکس زمان ارسال |
| `MarketSamples` | کلید نماد/زمان و قیمت numeric مثبت |

ایندکس رکوردها روی کاربر/نوع/حذف و کاربر/ترتیب است. ایندکس یکتای جزئی، میز کار فعال تکراری را در دیتابیس رد می‌کند. محدودیت‌های نسخه و ترتیب و Foreign Keyها از دادهٔ ناسازگار جلوگیری می‌کنند. حذف دفتر یا سند، وابستگی‌های آن را با cascade حذف می‌کند؛ حذف معمول رکوردهای برنامه همچنان منطقی و با tombstone است.

تنظیمات EF در `Persistence/Configurations`، تبدیل مدل ذخیره‌شده در `FinanceRecordMapping` و تلاش مجدد تراکنش‌ها در `DatabaseWriteRetry` است. Repositoryها قراردادهای Application را اجرا می‌کنند؛ Controller سلامت نیز فقط `IDatabaseHealth` را می‌شناسد. ابزار SQLite پروژهٔ اجرایی جداست. migration جدید، دادهٔ ستون قدیمی را پیش از حذف به ردیف‌های مستقل منتقل می‌کند و در rollback نیز دفتر را بازسازی می‌کند.

## اجرای محلی

SDK دات‌نت ۱۰ و Docker فعال لازم‌اند. در ریشهٔ پروژه:

```powershell
docker compose -f compose.postgres.yaml up -d --wait
$env:ConnectionStrings__Finance = 'Host=localhost;Port=5432;Database=damedast;Username=damedast;Password=damedast-local;Timeout=10;Command Timeout=30'
dotnet run --project src/DameDast.Web --environment ASPNETCORE_ENVIRONMENT=Development -- --urls http://localhost:5000
```

در Bash، به جای دستور `$env:...` از `export ConnectionStrings__Finance='Host=localhost;Port=5432;Database=damedast;Username=damedast;Password=damedast-local;Timeout=10;Command Timeout=30'` استفاده کن. این رمز فقط پیش‌فرض توسعه است. اگر `POSTGRES_PASSWORD` یا `POSTGRES_PORT` را تغییر دادی، connection string را نیز هماهنگ کن. فایل `.env` را Compose می‌خواند؛ اجرای مستقیم `dotnet run` به متغیر محیطی یا user-secrets نیاز دارد.

برای سرور موجود، `ConnectionStrings__Finance` را با Host، Port، Database، Username و Password مناسب تنظیم کن. دیتابیس و کاربر را از قبل بساز؛ کاربر برنامه به مجوز ساخت/تغییر جدول‌ها برای migration شروع برنامه نیاز دارد. اتصال‌ها با Npgsql pool می‌شوند. `/health` اتصال واقعی دیتابیس را بررسی می‌کند و در قطع اتصال 503 می‌دهد. خطای قالب connection string بدون افشای رمز گزارش می‌شود.

## اجرای محلی Windows بدون Docker

اگر PostgreSQL یا نسخهٔ portable آن را داری، مسیر پوشهٔ شامل `initdb.exe` و `pg_ctl.exe` را بده:

```powershell
./scripts/setup-local-postgres.ps1 -BinDirectory 'C:/tools/pgsql/bin' -ImportLegacy
dotnet run --project src/DameDast.Web --environment ASPNETCORE_ENVIRONMENT=Development -- --urls http://localhost:5000
```

اسکریپت یک cluster مستقل در `.local/postgresql/data`، کاربر و دیتابیس `damedast` و رمز تصادفی محلی می‌سازد؛ فقط روی `127.0.0.1` گوش می‌دهد. با `-Port 55432` می‌توان پورت دیگری انتخاب کرد. برای نصب تازه، `-ImportLegacy` را حذف کن. این گزینه دیتابیس `damedast.db` یا `poolo.db` داخل data برنامه را فقط یک بار به مقصد خالی وارد می‌کند؛ فایل اصلی حفظ می‌شود. اجرای بعدی اسکریپت باید بدون این گزینه باشد. انتقال با برنامهٔ قدیمی متوقف‌شده انجام شود.

تنظیم اتصال در `src/DameDast.Web/appsettings.Development.json` ذخیره می‌شود؛ این فایل وارد Git، خروجی publish یا Docker نمی‌شود. اجرای معمول Development اتصال را خودکار می‌خواند. اولویت متغیر محیطی `ConnectionStrings__Finance` همچنان بیشتر است. داده و رمز cluster در `.local/postgresql` باقی می‌مانند؛ پس از راه‌اندازی مجدد سیستم، اسکریپت را دوباره اجرا کن. برای توقف:

```powershell
& 'C:/tools/pgsql/bin/pg_ctl.exe' -D './.local/postgresql/data' -m fast -w stop
```

## استقرار Docker

`.env.example` را به `.env` کپی و `POSTGRES_PASSWORD`، تنظیمات Google و دامنه را تکمیل کن. برای نصب جدید:

```bash
docker compose up -d --build
```

برنامه پس از سالم‌شدن سرویس `postgres` شروع می‌شود. پورت PostgreSQL در استقرار اصلی روی میزبان منتشر نمی‌شود. دیتابیس در volume مستقل `postgres_data` و کلیدهای Data Protection و VAPID در volume قبلی `damedast_data` باقی می‌مانند. هنگام ارتقای نصب قدیمی، ابتدا انتقال زیر را انجام بده.

## انتقال از SQLite قدیمی

برنامهٔ قدیمی را متوقف کن و از دیتابیس قبلی و پوشهٔ کلیدها بکاپ سازگار بگیر. برای دیتابیس دارای WAL از API بکاپ SQLite استفاده کن یا پس از توقف کامل، فایل دیتابیس و فایل‌های WAL/SHM موجود را با هم حفظ کن. ابزار جداگانهٔ انتقال هر ۹ جدول را در یک تراکنش می‌خواند و به PostgreSQL خالی وارد می‌کند؛ UUIDها، نسخه‌ها، رسیدها، رشته‌های JSON، اعشار قیمت‌ها، لینک‌های بوم و زمان‌ها حفظ می‌شوند. زمان‌های دارای offset به UTC تبدیل می‌شوند. نصب‌های قدیمی بدون ستون Language مقدار `en` می‌گیرند. فایل اصلی فقط خوانده می‌شود. SQLite هیچ وابستگی اجرایی در برنامهٔ وب یا Infrastructure ندارد و فقط در ابزار انتقال استفاده می‌شود.

در اجرای محلی، پس از تنظیم `ConnectionStrings__Finance`:

```powershell
dotnet run --project tools/DameDast.DatabaseMigration -- src/DameDast.Web/data/damedast.db
```

اگر نصب بسیار قدیمی است، مسیر `poolo.db` را بده. برای انتقال volume نصب قبلی در Docker، ابتدا نام همان volume را در `DAMEDAST_DATA_VOLUME` تنظیم کن:

```bash
docker compose stop app
docker compose up -d --wait postgres
docker compose --profile migration run --build --rm migrate /legacy/damedast.db
docker compose up -d --build app proxy
```

ابزار روی مقصد دارای داده اجرا نمی‌شود؛ چیزی را جایگزین یا با حساب‌ها ادغام نمی‌کند. در صورت خطای تبدیل یا لغو، تمام درج‌های انتقال rollback می‌شوند. migration ساخت جدول‌ها ممکن است باقی بماند و اجرای مجدد روی مقصد خالی مجاز است. پیش از شروع برنامهٔ جدید، تعداد ردیف‌های گزارش‌شده را با منبع مقایسه کن. همهٔ دستگاه‌ها باید به همان استقرار جدید وصل شوند.

## تست

```powershell
docker compose -f compose.postgres.yaml up -d --wait
dotnet test DameDast.slnx -m:1
npm ci
npm test
```

تست‌های repository و HTTP مستقیماً PostgreSQL را استفاده می‌کنند و برای هر fixture یک دیتابیس با پیشوند `damedast_test_` می‌سازند و پاک می‌کنند. اتصال پیش‌فرض تست `Host=localhost;Port=5432;Database=postgres;Username=damedast;Password=damedast-local` است. برای سرور تست دیگر، متغیر `DAMEDAST_TEST_POSTGRES` را تنظیم کن؛ کاربر تست باید مجوز `CREATEDB` داشته باشد. این مجوز فقط برای کاربر تست لازم است.

## بکاپ سرور

با `pg_dump` بکاپ سازگار بگیر و پوشهٔ `data/keys` را نیز جداگانه حفظ کن. برای مثال در PowerShell و Bash:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/damedast.dump'
docker compose cp postgres:/tmp/damedast.dump ./damedast.dump
```

برای بازیابی از `pg_restore` روی دیتابیس مقصد جدید استفاده کن و بازیابی را آزمایش کن. JSON خروجی رابط برای دسترسی به داده‌ها مفید است؛ بکاپ کامل سرور شامل PostgreSQL و کلیدهای نصب است. migrationهای این مخزن اکنون مخصوص PostgreSQL هستند؛ سابقهٔ migrationهای SQLite نباید به PostgreSQL کپی شود.
