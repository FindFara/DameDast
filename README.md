# DameDast · دمِ دست

Current source uses DameDast project and namespace names. The UI includes searchable selection sheets, up to three pinned navigation shortcuts, category columns for transactions, and local holiday data through 1410.

Upgrade: legacy browser ledgers are copied without replacing newer data. A legacy server database is backed up into `damedast.db` on first startup; the original stays available. Authentication uses the new app identity, so sign in again if needed. Docker keeps the existing volume name via the `DAMEDAST_DATA_VOLUME` override; set this to your current volume when your Compose project name differs.

Future lunar holiday dates are estimates. Calendar datasets are bundled locally; there is no calendar-source link in the interface. Internal data provenance: https://github.com/alirezadesh/jalali_calendar

> UI update: dashboard amounts start hidden with an eye toggle, simpler task forms, aligned date controls, matte themes, and no canvas Libraries entry.

# DameDast · دمِ دست

Complete source: ASP.NET Core 10 backend, current web/PWA frontend, React/TypeScript whiteboard, browser extension, tests and Docker deployment.

[راهنمای فارسی](README-fa.md)

Latest frontend: workbench/calendar settings, compact radial + menu, PDF note attachments and separate notes/finance/full backups. PDF bytes are browser-local and included in notes backups; PDF byte synchronization to the server is not implemented.

> **Fullscreen canvas / بوم تمام‌صفحه:** [Setup, storage, features and collaboration](docs/WHITEBOARD-fa.md) · [Verification](docs/WHITEBOARD-VERIFICATION.md)

> **تقویم، تنظیمات و بکاپ کامل:** [راهنمای نسخه جدید](docs/CALENDAR-SETTINGS-BACKUP-fa.md)

> **Workbench / میز کار:** [راهنمای شبکهٔ ۱۲×۶، کارت‌ها، رنگ و ذخیره‌سازی](docs/WORKBENCH-fa.md)

New: [Google sign-in, handwriting canvas, asset P/L and grouped numbers](docs/GOOGLE-CANVAS-ASSETS-fa.md). Real Google OAuth client keys still need to be configured.

Architecture update: ASP.NET Core controllers dispatch through MediatR handlers, entity-organized interfaces, application services and repository contracts. See [Architecture guide](docs/ARCHITECTURE-fa.md). The self-hosted .NET backend and the separately hosted Worker remain distinct deployments.

# DameDast · دمِ دست

A bilingual English/Persian, mobile-first personal finance PWA with an ASP.NET Core 10 backend and Clean Architecture. The same server hosts both the web interface and the installable Android PWA. No separate frontend server or Node runtime is required in production.

## Run locally

Install the .NET 10 SDK, then run:

```bash
dotnet restore DameDast.slnx
dotnet run --project src/DameDast.Web --urls http://localhost:5000 --environment Development
```

Open `http://localhost:5000`. Start in your empty local workspace or select **Explore the demo**. The demo is clearly labelled, isolated from real records, and never syncs to Google. To open it directly, use `http://localhost:5000/?demo=1`.

## Features

- Overview with account balances, monthly income/spending, six-month cash flow, category breakdown and budget progress.
- Accounts with opening balances and calculated current balances.
- Income, expenses and transfers: create, edit, delete, search, filter and export CSV.
- Per-category monthly budgets and overspending indicators.
- Installment schedules, due/overdue/paid status, monthly and total remaining amounts.
- Money lent with partial repayments and outstanding totals.
- Locked assets with release dates and total locked value.
- 39 categorized instruments: 12 cryptocurrencies, 5 metals, 7 currencies, 5 funds and 10 stocks, with search, dated quotes and daily/weekly/monthly charts. Official unavailable NAV remains unavailable.
- Daily, weekly and monthly cash-flow grouping.
- Opt-in Web Push installment and personal recurring reminders while the app is closed (self-hosted .NET, supported browsers).
- One planner for notes, checklists, repeating reminders and savings goals; pinned dashboard cards and an unread notification bell.
- Google sign-in, user-isolated server persistence, offline IndexedDB queue and automatic sync while open.
- Explicit conflict resolution when two devices edit the same record.
- JSON data export, guest-to-Google data transfer, mobile navigation and PWA installation.
- English LTR and Persian RTL, self-hosted Vazir and Manrope fonts, light/dark/system themes.
- Whole-toman amounts; Solar Hijri input, display and reporting periods in both languages. Existing Gregorian budgets retain their original period.
- Custom monthly percentage plans with planned/actual doughnuts, custom categories, recurring fixed bills and pinned notes.
- Per-contribution historical investment comparisons against gold, Yaghoot Agah, Bitcoin and USD; a constrained hindsight allocation. See [Planning and insights](docs/PLANNING.md).
- Live gold, USD, silver and Bitcoin quotes directly on the overview dashboard.

**Important distinctions:** account balances include all recorded transactions, including future-dated ones. Transfers do not count as income/expense. Explicitly categorized transfers count once in the monthly allocation view; ordinary Other transfers are excluded. Goal savings, installment paid flags, money-lent repayments and locked-asset releases are tracking records; they do not create account transactions. Record the relevant account movements separately. CSV exports cover the selected month. JSON backups can be exported and restored from Settings.

## Architecture

| Project | Responsibility | Dependencies |
| --- | --- | --- |
| DameDast.Domain | Financial types, validation, record versions, recurrence, transfer and deletion rules | Common |
| DameDast.Application | MediatR use cases, entity interfaces, application services and repository contracts | Domain, Common |
| DameDast.Infrastructure | EF Core SQLite, migration, optimistic concurrency, operation receipts | Application, Common |
| DameDast.Common | Shared TimeProvider-based time utilities | None |
| DameDast.Web | controller-based API, cookie/OAuth authentication, CSRF and PWA assets | Infrastructure |
| DameDast.Tests | Domain, SQLite concurrency, API authorization and CSRF checks | Web |

The frontend uses browser-native ES modules and CSS so the installed app can run without a server connection. Business validation and the synchronization use case remain on the .NET side. This is a PWA plus an optional Manifest V3 browser extension, not a native .NET MAUI APK. No MAUI project or APK is included.

## Google sign-in and synchronization

Google identifies the user. Financial data is stored in **your application's server database**, not Google Drive. No Drive or Gmail scopes are requested. Every device must use the same deployment URL and the same Google account.

1. In Google Cloud Console, create a project and configure the OAuth consent screen.
2. Create an **OAuth client ID → Web application**.
3. Add the authorized redirect URI `https://YOUR-DOMAIN/signin-google`.
4. For local testing, also add `http://localhost:5000/signin-google`.
5. Set Client ID and Client Secret on the **server only**. For local development:

```bash
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR_CLIENT_ID" --project src/DameDast.Web
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_CLIENT_SECRET" --project src/DameDast.Web
```

If Google's app is in testing mode, add your Google account as a test user. Client credentials are intentionally absent from this repository. Without them, local use and the demo work; Google login and cross-device sync stay disabled.

Official setup reference: https://learn.microsoft.com/aspnet/core/security/authentication/social/google-logins?view=aspnetcore-10.0

### Sync behavior

- Each browser workspace has a cached snapshot and a durable queue of operations. Google account workspaces and the guest/demo spaces use separate storage keys.
- A client-generated operation UUID makes a network retry idempotent. A reused UUID with changed content is rejected. Receipts and ledger writes commit in the same database transaction.
- Each record has a version. A stale edit returns HTTP 409. The UI asks whether to keep the server record or explicitly apply the local changes. Deleted server records cannot be silently resurrected.
- SQLite optimistic concurrency and bounded retries protect writes from concurrent processes. A whole batch is atomic; unrelated records can be applied after a retry, while edits to the same record require review.
- Tombstones are retained so a delayed device cannot recreate a deleted record. Operation receipts are retained for durable retry deduplication.
- Sync runs after changes, on reconnect, on page activation and every 30 seconds while visible. There is no promise of background sync while the PWA is closed.
- Offline authentication is not a fresh Google login. The browser can display its previously cached account; the server still checks the session before allowing sync.
- Guest data is not silently merged on sign-in. Use **Settings → Bring your local data along**. Already transferred record IDs are remembered on the device to avoid duplicate imports.

## Deploy on one server

Requirements: Docker Engine with Compose, a domain pointing to the server, and ports 80/443 available.

```bash
cp .env.example .env
# Edit .env: DOMAIN, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
docker compose up -d --build
```

Open `https://YOUR-DOMAIN`. Caddy terminates HTTPS and proxies the single ASP.NET app. The API is not published directly. A named volume retains SQLite data and ASP.NET Data Protection keys across container replacement.

The Compose network uses `172.29.10.0/24`. If that overlaps a server network, change its subnet, both static addresses and `ReverseProxy__KnownProxy` together. If deploying with a different proxy or IIS, set the domain in `AllowedHosts`, trust only the actual reverse proxy, forward HTTPS correctly and keep the `data` directory persistent. Do not trust arbitrary forwarded headers.

On Android Chrome, choose **Install app** or **Add to Home screen**. On iPhone Safari, choose **Share → Add to Home Screen**. A production PWA requires HTTPS. The service worker caches only the application shell, never API responses or authentication endpoints. App updates are activated after the previous tabs close and the new worker is ready; increment `CACHE` in `sw.js` when changing shell assets.

## Data and backups

Settings exports `damdast-v3` JSON backups for notes, finances, or the whole workspace. Notes backups include linked handwriting documents, checklists, and local PDF bytes; full backups also include preferences. Import validates the file and creates an isolated local workspace. Use the workspace selector to return to the original ledger. Personal component libraries, server secrets and unrelated/unlinked canvases are excluded. Legacy v1/v2 backups remain readable; financial-only legacy exports cannot recreate missing image bytes. See [calendar and backup details](docs/CALENDAR-SETTINGS-BACKUP-fa.md).

The server keeps one versioned JSON ledger per user in SQLite, plus a table of operation receipts. This design is intentionally compact for personal finance; each read returns a full snapshot. For very large ledgers or many users, evolve toward relational tables, delta sync and PostgreSQL. Run one app replica with the local persistent SQLite volume; do not put SQLite on a shared network filesystem.

Schema migrations run on startup. The included initial migration and model snapshot are tracked. For future releases, back up first and run reviewed migrations as a single deployment step before multiple instances start. SQLite backup must include a consistent database image: stop the app before copying its data volume, or use SQLite's online backup API. Back up Data Protection keys too, restrict access to the volume and protect backups. JSON export is useful for data access but is not a substitute for a server restore strategy.

Signing out clears the cached copy of the Google workspace from the current browser. Sign-out is blocked while changes remain unsynced; export a copy if the connection is unavailable. Guest and demo data remain separate.

## Validation

```bash
dotnet test DameDast.slnx -m:1
node --test tests/*.test.mjs
dotnet publish src/DameDast.Web -c Release -o outputs/publish
```

Node is only needed for the small client test suite and the optional internal preview command, not for the app at runtime.

Tested here: domain money/transfer/deletion rules, idempotent retries, user isolation, atomic failed batches, competing SQLite writers, API authorization/CSRF/conflicts and client balance/projection calculations. Real Google OAuth cannot be tested end to end without your credentials and redirect domain. Docker deployment must be verified on your target server.

## Hosted UI preview

The hosted preview uses the same frontend with a small Worker market-data adapter. Live prices and daily-close history are fetched through a real server API, including on the overview screen. Google sign-in and full financial synchronization are implemented on the hosted Worker as well as the .NET server; real OAuth Client ID/Secret must still be configured. Without Google sign-in the manual finance workspace remains browser-local.


## Installments and reminders

Personal reminders support once, daily, weekly and Persian-monthly schedules, up to 12 times per active day, interval/count/end limits and dashboard pins. Each occurrence has an independent read state and per-device push receipt. The server scans every minute and sends due personal occurrences from the last 24 hours; browser/OS delivery is best effort. In-app bell updates every 15 seconds while visible.


Create one installment or a monthly schedule of up to 100 installments. Shorter months clamp the due day without shifting later months away from the original day (Shahrivar 31 → Mehr 30 → Aban 30). Individual installments can be edited, marked paid/unpaid and deleted. Summaries show all remaining amounts, unpaid amounts in the selected month and overdue amounts.

The dashboard always highlights unpaid installments within their reminder window. For background delivery, sign in with Google, sync the installments and choose **Enable reminders on this device**. The browser asks for notification permission only after that explicit button click. The service worker receives pushes even when the PWA is closed, subject to browser/OS delivery limits.

The server automatically generates persistent VAPID keys in `data/keys/vapid.json`. Keep this file private and backed up. Set `PUSH_SUBJECT` in `.env` to your own contact URI, such as `mailto:owner@your-domain.com`; the development fallback uses the configured host. Notification bodies are generic: loan names and amounts are not included on the lock screen. A one-minute server loop checks unpaid installments from `ReminderDays` before due date through 7 days overdue, between 09:00 and 21:00 Asia/Tehran, with at most one reminder per device per day during normal operation. Delivery is best effort; a server crash after delivery but before receipt persistence can cause a retry. Notifications use a replacement tag to reduce duplicates. The server must remain running and must reach the browser push service. Safari/iOS may require installation before Web Push is available. Google OAuth and real push delivery still require testing on your own deployment/browser.

Push subscription endpoints are restricted to supported Chrome/Firefox/Apple push-service hosts. There is no arbitrary URL fetch supplied by users. Expired subscriptions are removed. To disable reminders, revoke this site's notification permission in the browser. Sign out removes this device's push registration.

## Market data

See [Expanded market and planner guide (Persian)](docs/ORGANIZER-MARKETS-fa.md) for all 39 instruments, units, providers, recurrence rules and storage details. Stocks and ETFs use TSETMC closing prices with positive trade counts; Morvarid requires a dated, explicitly denominated official redemption NAV. The optional official NAV feed may be unavailable.


The built-in server adapter reads TGJU's public quote feed (`https://call1.tgju.org/ajax.json`) and historical daily-close feed. These public site endpoints are **not a documented contractual API**: if TGJU changes its format or access policy, replace/update `MarketService`. No paid API credential is embedded. Requests are server-side; complete current quotes are cached for five minutes (one minute for partial or failed responses), historical responses for 6 hours, and failed current requests back off for one minute. Provider availability and permitted use should be checked before a public commercial launch.

| Instrument | Provider symbol | Display unit |
| --- | --- | --- |
| 18K gold | geram18 | toman per gram (source IRR ÷ 10) |
| US dollar | price_dollar_rl | toman per USD (source IRR ÷ 10) |
| 999 silver | silver_999 | toman per gram (source IRR ÷ 10) |
| Bitcoin | crypto-bitcoin | USD per BTC |

Each tile includes the source timestamp, and stale/delayed quotes are labelled. Quotes older than two hours are treated as stale, including market closures. Daily charts use real observations collected after deployment; with fewer than two observations the app explains that history is still accumulating. Weekly/monthly charts use available daily closes and observed points without inventing missing prices. The hosted preview uses a matching Worker adapter for real quotes. Demo mode only supplies sample financial records; it does not substitute made-up market quotes. The preview's intraday observations are best effort and may reset when a Worker restarts; the .NET app persists its observations in SQLite.

Market sample storage grows as observations accumulate. Monitor the personal SQLite database, and add a retention policy when operating it for a long period. The pure parsers have tests for rial-to-toman conversion, Bitcoin units, timezone offsets and daily-close selection.


## Language, theme and accessibility

Use the **EN / Fa** control in the top bar, or **Settings → Language**, to switch the entire interface. Language and theme persist separately in this browser. Persian mode uses RTL logical layout, Persian digits and display dates, localized categories, form labels, status text and messages. Account names and notes entered by the user are preserved as data and are not machine-translated. Custom day/month/year selectors and reporting months use the Persian calendar in both languages. Dates retain canonical ISO values in storage; new budgets use explicit Persian month keys. Legacy Gregorian budget boundaries are preserved and shown with their actual date range.

Choose light, dark or system appearance in Settings; the top-bar sun/moon button quickly toggles light/dark. Font files are bundled locally: Vazir for Persian, Manrope for English. Financial numbers are isolated from surrounding text to preserve signs, separators and direction. Chronological charts keep left-to-right time order in both languages. Reduced-motion preferences are respected.

The application name and PWA manifest now show **دمِ دست**. Internal .NET project names, cookie keys, database path and IndexedDB identifiers retain their original DameDast names so existing records and sessions remain compatible. The added schema migration preserves old push subscriptions and defaults their language to English; choosing Persian updates an existing signed-in device registration without requesting notification permission again.

The service worker cache version is bumped with shell changes. Close old tabs and reopen if the browser is still serving the previous version. No financial database is cleared by a UI/theme/language update.

## Connected portfolio and personal extension

Use **Connected portfolio** in the PWA. The extension source is `src/DameDast.Web/wwwroot/extension`; a ready-to-extract ZIP is in `src/DameDast.Web/wwwroot/downloads/damdast-extension.zip`. See the extension README and [Persian architecture and storage guide](docs/PORTFOLIO-fa.md). Capture is user-triggered and table-based, with reviewed mapping and a CSV fallback. Domain detection and synthetic fixtures cover EasyTrader, Agah, Nobitex, Digipay and SnappPay; their signed-in live pages have not been verified. No credential, cookie, private API, background trading or payment integration is included.

`/api/portfolio/session`, `/api/portfolio` and `/api/portfolio/sync` isolate imported snapshots and use the existing Google identity, CSRF protection, ledger transaction and operation receipts on the .NET server. Imported installments with an explicit unpaid status and date participate in .NET Web Push reminders.

The hosted Site preserves its owner-private ChatGPT gate and the previous D1 portfolio store. With configured Google OAuth, the full notebook/finance ledger syncs to a Google-identified D1 ledger. Previous ChatGPT captures can be imported explicitly. Personal background push jobs still require .NET. D1 and self-hosted SQLite remain separate deployments.
