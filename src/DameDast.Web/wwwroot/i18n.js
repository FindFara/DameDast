const readPreference = (name, fallback) => {
  try {
    return globalThis.localStorage?.getItem(name) || fallback;
  } catch {
    return fallback;
  }
};
let language = readPreference("damdast-language", "en");
let theme = readPreference("damdast-theme", "system");
if (!["en", "fa"].includes(language)) language = "en";
if (!["light", "dark", "system"].includes(theme)) theme = "system";

export const getLanguage = () => language;
export const getTheme = () => theme;
export const isRtl = () => language === "fa";
export const locale = (gregorian = false) =>
  language === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian";
export function setLanguage(value) {
  if (!["en", "fa"].includes(value)) return;
  language = value;
  try {
    globalThis.localStorage?.setItem("damdast-language", value);
  } catch {}
  applyPreferences();
}
export function setTheme(value) {
  if (!["light", "dark", "system"].includes(value)) return;
  theme = value;
  try {
    globalThis.localStorage?.setItem("damdast-theme", value);
  } catch {}
  applyPreferences();
}
export function effectiveTheme() {
  return theme === "system"
    ? globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : theme;
}
export function applyPreferences() {
  if (!globalThis.document) return;
  document.documentElement.lang = language;
  document.documentElement.dir = isRtl() ? "rtl" : "ltr";
  document.documentElement.dataset.theme = effectiveTheme();
  document.documentElement.style.colorScheme = effectiveTheme();
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      effectiveTheme() === "dark" ? "#141c23" : "#f5f7f6",
    );
  document.title = isRtl()
    ? "دمِ دست"
    : "DameDast";
}
const fa = {
  "Dog": "سگ",
  "Send pet home": "برو خانه",
  "Call pet outside": "پت را صدا بزن",
  "Group": "گروه",
  "All groups": "همهٔ گروه‌ها",
  "Uncategorized": "بدون گروه",
  "Minimum amount": "از مبلغ",
  "Maximum amount": "تا مبلغ",
  "From date": "از تاریخ",
  "To date": "تا تاریخ",
  "No limit": "بدون محدودیت",
  "Apply filters": "اعمال فیلتر",
  "Clear filters": "پاک‌کردن فیلترها",
  "Enter a valid amount range.": "بازهٔ مبلغ معتبر وارد کن.",
  "Minimum amount must not exceed maximum amount.": "مبلغ شروع نباید بیشتر از مبلغ پایان باشد.",
  "Start date must not follow end date.": "تاریخ شروع نباید بعد از تاریخ پایان باشد.",
  "Check Authentication:Google in appsettings.json, restart the app, and register the exact callback URL shown in Settings.": "بخش Authentication:Google را در appsettings.json بررسی کن، برنامه را دوباره اجرا کن و آدرس بازگشت تنظیمات را دقیقاً در گوگل ثبت کن.",
  "Cannot reach the local app server. Start the app and try again.": "اتصال به سرور برنامه برقرار نشد. برنامه را اجرا کن و دوباره تلاش کن.",
  "After changing appsettings.json, stop and restart the app. Register the callback under Authorized redirect URIs, not only JavaScript origins.": "بعد از تغییر appsettings.json برنامه را متوقف و دوباره اجرا کن. آدرس بازگشت باید در Authorized redirect URIs ثبت شود؛ ثبت در JavaScript origins کافی نیست.",
  "Missing settings": "تنظیمات پیدا نشده",
  "Check Google sign-in status": "بررسی وضعیت ورود گوگل",
  "Google sign-in could not verify its browser cookie. Use the same localhost address throughout sign-in, allow cookies, and try again.": "کوکی ورود تأیید نشد. در تمام مراحل از همان آدرس localhost استفاده کن، کوکی‌ها را مجاز کن و دوباره تلاش کن.",
  "Google sign-in was cancelled or this account is not an OAuth test user.": "ورود لغو شده یا این حساب در فهرست کاربران آزمایشی گوگل نیست.",
  "Google rejected the client credentials. Check the Web application client in Google Cloud and restart the app.": "گوگل کلیدهای برنامه را نپذیرفت. کلاینت Web application را بررسی و برنامه را دوباره اجرا کن.",
  "Google sign-in failed. Check the exact callback URL in Settings and the OAuth test users in Google Cloud.": "ورود گوگل انجام نشد. آدرس بازگشت تنظیمات و فهرست کاربران آزمایشی گوگل را بررسی کن.",

  "Walks around your workbench": "در میز کار قدم می‌زند",
  "Pause walking": "توقف گردش",
  "Resume walking": "ادامهٔ گردش",
  "Resting": "در حال استراحت",
  "Transactions by category": "تراکنش‌ها بر اساس دسته‌بندی",
  "Pin menu": "پین کردن منو",
  "Unpin menu": "برداشتن پین",
  "Pinned menus": "منوهای پین‌شده",
  "Search options": "جست‌وجو در گزینه‌ها",
  "Choose an option": "انتخاب گزینه",
  "No matching options": "گزینه‌ای پیدا نشد",
  "Local holiday calendar": "تقویم تعطیلات داخلی",
  "Available through": "تا سال",
  "Future lunar holidays are estimates and may shift by one day.": "تعطیلات قمری آینده برآوردی‌اند و ممکن است یک روز جابه‌جا شوند.",

  Overview: "داشبورد",
  Transactions: "تراکنش‌ها",
  Accounts: "حساب‌ها",
  Budgets: "بودجه‌ها",
  "Savings goals": "هدف‌ها",
  Installments: "اقساط",
  "Money lent": "طلب‌ها",
  "Locked assets": "دارایی بلوکه",
  Market: "بازار",
  Reports: "گزارش‌ها",
  Settings: "تنظیمات",
  More: "بیشتر",
  Workspace: "فضای من",
  DameDast: "دمِ دست",
  Language: "زبان",
  Theme: "ظاهر",
  Light: "روشن",
  Dark: "تیره",
  System: "خودکار",
  "Switch language": "تغییر زبان",
  "Show amounts": "نمایش مبلغ‌ها",
  "Hide amounts": "پنهان کردن مبلغ‌ها",
  "Amount hidden": "مبلغ پنهان است",
  "More options": "بیشتر",
  "Optional": "اختیاری",
  "No date selected": "تاریخ انتخاب نشده",
  "Switch theme": "تغییر ظاهر",
  Menu: "فهرست",
  Close: "بستن",
  Cancel: "انصراف",
  Save: "ذخیره",
  Add: "افزودن",
  Edit: "ویرایش",
  Delete: "حذف",
  Done: "تأیید",
  Back: "بازگشت",
  "Sign in": "ورود با گوگل",
  "Google account": "حساب گوگل",
  "Sign out": "خروج",
  Sync: "همگام‌سازی",
  Syncing: "در حال همگام‌سازی",
  Synced: "همگام شده",
  Local: "روی دستگاه",
  Offline: "آفلاین",
  "Sign in to sync": "برای همگام‌سازی وارد شو",
  Demo: "نمونه",
  "Try demo": "دیدن نمونه",
  "Exit demo": "خروج از نمونه",
  "Demo data": "اطلاعات نمونه",
  "Reset demo": "بازنشانی نمونه",
  "Reset sample data?": "اطلاعات نمونه بازنشانی شود؟",
  "Demo only. Your records stay separate.": "فقط اطلاعات نمونه تغییر می‌کنند.",
  "Sample data refreshed.": "نمونه بازنشانی شد.",
  "Total balance": "موجودی کل",
  Income: "درآمد",
  Spending: "هزینه",
  Expense: "هزینه",
  Transfer: "انتقال",
  "This month": "این ماه",
  toman: "تومان",
  "toman / gram": "تومان / گرم",
  "toman / USD": "تومان / دلار",
  "USD / BTC": "دلار / بیت‌کوین",
  "Cash flow": "درآمد و هزینه",
  "Spending breakdown": "ترکیب هزینه‌ها",
  "Recent transactions": "تراکنش‌های اخیر",
  "View all": "مشاهده همه",
  "View report": "گزارش",
  Manage: "مدیریت",
  Month: "ماه",
  "Reporting month": "ماه گزارش",
  Daily: "روزانه",
  Weekly: "هفتگی",
  Monthly: "ماهانه",
  "Last 7 days": "۷ روز اخیر",
  "Last 7 weeks": "۷ هفته اخیر",
  "Last 6 months": "۶ ماه اخیر",
  "Net cash flow": "خالص جریان پول",
  "Savings rate": "نرخ پس‌انداز",
  "No transactions": "تراکنشی نیست",
  "No expenses": "هزینه‌ای نیست",
  "No budgets": "بودجه‌ای نیست",
  "No goals": "هدفی نیست",
  "No installments": "قسطی نیست",
  "No loans": "طلبی نیست",
  "No locked assets": "دارایی بلوکه‌ای نیست",
  "New transaction": "تراکنش جدید",
  "New account": "حساب جدید",
  "New budget": "بودجه جدید",
  "New goal": "هدف جدید",
  "New installment": "قسط جدید",
  "New loan": "طلب جدید",
  "New locked asset": "دارایی بلوکه جدید",
  Transaction: "تراکنش",
  Account: "حساب",
  Budget: "بودجه",
  Goal: "هدف",
  Installment: "قسط",
  Loan: "طلب",
  "Locked asset": "دارایی بلوکه",
  Description: "شرح",
  Category: "دسته‌بندی",
  Date: "تاریخ",
  Amount: "مبلغ",
  Actions: "عملیات",
  Type: "نوع",
  "Amount (toman)": "مبلغ (تومان)",
  "Account name": "نام حساب",
  "Opening balance": "موجودی اولیه",
  "Opening balance (toman)": "موجودی اولیه (تومان)",
  "Account color": "رنگ حساب",
  "From account": "حساب مبدأ",
  "To account": "حساب مقصد",
  Note: "یادداشت",
  "Note (optional)": "یادداشت (اختیاری)",
  "Date (Gregorian)": "تاریخ",
  "Budget month": "ماه بودجه",
  "Limit (toman)": "سقف هزینه (تومان)",
  "Goal name": "نام هدف",
  "Target amount (toman)": "مبلغ هدف (تومان)",
  "Saved so far (toman)": "پس‌انداز فعلی (تومان)",
  "Target date (optional)": "مهلت (اختیاری)",
  Title: "عنوان",
  "First due date": "سررسید اول",
  "Due date": "سررسید",
  "Due date (optional)": "سررسید (اختیاری)",
  "Installment amount (toman)": "مبلغ هر قسط (تومان)",
  "Monthly installments": "تعداد اقساط ماهانه",
  "Remind days before": "یادآوری چند روز قبل",
  "Who borrowed it?": "نام بدهکار",
  "Amount lent (toman)": "مبلغ قرض (تومان)",
  "Returned so far (toman)": "بازپرداخت‌شده (تومان)",
  "Lent on": "تاریخ قرض",
  "Asset name": "نام دارایی",
  "Locked amount (toman)": "مبلغ بلوکه (تومان)",
  "Release date (optional)": "تاریخ آزادسازی (اختیاری)",
  Sage: "سبز",
  Blue: "آبی",
  Lavender: "بنفش",
  Sand: "شنی",
  "Food & drinks": "خوراک",
  Shopping: "خرید",
  Transport: "رفت‌وآمد",
  Home: "خانه",
  Health: "سلامت",
  Leisure: "تفریح",
  Learning: "آموزش",
  Salary: "حقوق",
  "Other income": "درآمد دیگر",
  Other: "سایر",
  "Everyday account": "حساب روزمره",
  "Savings account": "پس‌انداز",
  "Cash wallet": "کیف پول",
  "Monthly salary": "حقوق ماهانه",
  "Weekly groceries": "خرید هفتگی",
  "Getting to work": "رفت‌وآمد",
  "Coffee with friends": "کافه",
  "A little wardrobe refresh": "پوشاک",
  "Monthly rent": "اجاره",
  "Grocery run": "سوپرمارکت",
  "Freelance project": "پروژه آزاد",
  "Monthly savings": "پس‌انداز ماهانه",
  "Monthly living costs": "هزینه‌های ماه",
  "A little escape": "سفر",
  "A new laptop": "لپ‌تاپ",
  "Home deposit loan": "وام ودیعه",
  "Rental deposit": "ودیعه مسکن",
  "Loan collateral": "وثیقه وام",
  "Moving expenses": "هزینه جابه‌جایی",
  "A little help": "قرض شخصی",
  "Held until the rental agreement ends": "تا پایان اجاره",
  "Blocked savings, already excluded from spending accounts":
    "خارج از موجودی قابل خرج",
  Paid: "پرداخت‌شده",
  Unpaid: "پرداخت‌نشده",
  "Mark paid": "پرداخت شد",
  "Mark unpaid": "پرداخت نشده",
  "Total remaining": "جمع مانده",
  "Due this month": "سررسید این ماه",
  Overdue: "عقب‌افتاده",
  "Payment calendar": "فهرست اقساط",
  Reminders: "یادآوری",
  "Enable reminders": "فعال‌سازی اعلان",
  "Due today": "سررسید امروز",
  Settled: "تسویه‌شده",
  "No due date": "بدون سررسید",
  "Still to receive": "طلب باقی‌مانده",
  "Total lent": "کل قرض‌ها",
  Returned: "بازپرداخت‌شده",
  "Record repayment": "ثبت بازپرداخت",
  "Total locked": "کل بلوکه‌شده",
  "Releasing in 30 days": "آزادسازی تا ۳۰ روز",
  "Release date reached": "موعد آزادسازی رسیده",
  "Mark released": "آزاد شد",
  "No release date": "بدون تاریخ آزادسازی",
  "Today’s market": "قیمت‌های روز",
  "18K Gold": "طلای ۱۸ عیار",
  "US Dollar": "دلار",
  "999 Silver": "نقره ۹۹۹",
  Bitcoin: "بیت‌کوین",
  Prices: "قیمت‌ها",
  "Price history": "نمودار قیمت",
  Refresh: "به‌روزرسانی",
  Loading: "در حال دریافت",
  Unavailable: "در دسترس نیست",
  Delayed: "با تأخیر",
  Live: "آخرین نرخ",
  Source: "منبع",
  "As of": "زمان نرخ",
  Updated: "دریافت",
  "No history yet": "تاریخچه‌ای نیست",
  "Collecting intraday quotes": "در حال جمع‌آوری نرخ‌های روز",
  "No market data": "قیمت دریافت نشد",
  "Try again": "تلاش دوباره",
  "Market feed unavailable": "ارتباط با منبع قیمت برقرار نشد.",
  "Historical closes": "قیمت پایانی روزها",
  "Observed quotes": "نرخ‌های ثبت‌شده امروز",
  "Search transactions": "جست‌وجوی تراکنش",
  Search: "جست‌وجو",
  "All types": "همه انواع",
  "Export CSV": "خروجی CSV",
  "Export JSON": "پشتیبان JSON",
  Export: "خروجی",
  Backup: "پشتیبان",
  Download: "دانلود",
  "Install app": "نصب برنامه",
  Device: "دستگاه",
  Connection: "اتصال",
  "Guest data": "اطلاعات مهمان",
  "Import guest data": "انتقال اطلاعات مهمان",
  "Pending changes": "تغییرات ارسال‌نشده",
  "Review pending": "بررسی تغییرات",
  Privacy: "حریم خصوصی",
  Help: "راهنما",
  "About totals": "درباره جمع‌ها",
  Calendar: "تقویم",
  "Gregorian months": "بودجه با ماه میلادی",
  "Persian dates": "نمایش تاریخ شمسی",
  "English dates": "نمایش تاریخ میلادی",
  "No data": "اطلاعاتی نیست",
  "Transfers do not count as spending.": "انتقال بین حساب‌ها هزینه نیست.",
  "Trackers do not change account balances.":
    "ثبت قسط، طلب، هدف و دارایی بلوکه، موجودی حساب را تغییر نمی‌دهد؛ تراکنش مربوط را جدا ثبت کن.",
  "Your data stays on this device until you sign in.":
    "اطلاعات تا زمان ورود با گوگل، روی همین دستگاه است.",
  "Google identifies your account. Financial data stays on your server.":
    "گوگل فقط برای ورود است. اطلاعات مالی روی سرور خودت می‌ماند.",
  "Notifications need sign-in, permission and an active server.":
    "اعلان به ورود، اجازه مرورگر و سرور روشن نیاز دارد.",
  "Install from your browser menu.":
    "در منوی مرورگر، نصب برنامه یا افزودن به صفحه اصلی را انتخاب کن.",
  "Payments and repayments are tracked separately.":
    "برای اثر روی موجودی حساب، تراکنش پرداخت یا بازپرداخت را هم ثبت کن.",
  "Released assets are removed from this list.":
    "دارایی از این فهرست حذف می‌شود؛ مبلغ آزادشده را جدا به حساب اضافه کن.",
  "Monthly schedules adjust for shorter months.":
    "سررسید ماه‌های کوتاه‌تر به آخر ماه منتقل می‌شود.",
  "Market data may be delayed.": "نرخ‌ها ممکن است با تأخیر باشند.",
  "Daily charts fill as real quotes arrive.":
    "نمودار روزانه با دریافت نرخ‌های واقعی کامل می‌شود.",
  "Source may have gaps on holidays.":
    "تاریخچه ممکن است در تعطیلی بازار فاصله داشته باشد.",
  "Saved.": "ذخیره شد.",
  "Deleted.": "حذف شد.",
  "Paid status updated.": "وضعیت پرداخت تغییر کرد.",
  "Create an account first.": "ابتدا یک حساب بساز.",
  "Delete this record?": "این مورد حذف شود؟",
  "Deletion syncs to your other devices.":
    "بعد از همگام‌سازی از دستگاه‌های دیگر هم حذف می‌شود.",
  "This account has transactions.":
    "این حساب تراکنش دارد. ابتدا آن‌ها را حذف یا منتقل کن.",
  "Release this asset?": "این دارایی آزاد شده؟",
  "Google sign-in is not configured.": "ورود گوگل هنوز فعال نیست.",
  "Set up Google credentials on your server. Local use is available.":
    "کلیدهای گوگل را روی سرور تنظیم کن. فعلاً حالت محلی فعال است.",
  "Sign in for background reminders.":
    "برای یادآوری در پس‌زمینه با گوگل وارد شو.",
  "Push is not supported here.": "این مرورگر اعلان را پشتیبانی نمی‌کند.",
  "Notifications are off.": "اعلان خاموش است.",
  "Reminders enabled.": "یادآوری فعال شد.",
  "Could not enable reminders.": "یادآوری فعال نشد.",
  "No guest records.": "اطلاعات مهمانی نیست.",
  "Import local records?": "اطلاعات محلی منتقل شود؟",
  "Existing imports will not be duplicated.":
    "موارد قبلی دوباره منتقل نمی‌شوند.",
  Import: "انتقال",
  "Queued for sync.": "در صف همگام‌سازی قرار گرفت.",
  "Sign out?": "از حساب خارج می‌شوی؟",
  "Sync pending changes first.": "ابتدا تغییرات ارسال‌نشده را همگام کن.",
  "The local copy will be cleared.": "نسخه محلی این حساب پاک می‌شود.",
  "Sign out and clear": "خروج و پاک‌کردن نسخه محلی",
  "Sync failed. Changes are kept locally.":
    "همگام‌سازی انجام نشد؛ تغییرات روی دستگاه محفوظ‌اند.",
  "Server unavailable.": "سرور در دسترس نیست.",
  "Choose a version": "نسخه را انتخاب کن",
  "This record changed on another device.":
    "این مورد در دستگاه دیگری تغییر کرده.",
  "This device": "این دستگاه",
  "Server version": "نسخه سرور",
  "Keep server": "نسخه سرور",
  "Keep mine": "تغییر من",
  Deleted: "حذف‌شده",
  "Unsynced changes": "تغییرات ارسال‌نشده",
  "Export before discarding.": "قبل از حذف، از تغییرات خروجی بگیر.",
  "Discard unsynced changes": "حذف تغییرات ارسال‌نشده",
  "This reloads the server version.": "نسخه سرور دوباره دریافت می‌شود.",
  "Sign-in failed.": "ورود انجام نشد.",
  "Try signing in again.": "دوباره برای ورود تلاش کن.",
  "Browser storage unavailable.": "ذخیره‌سازی مرورگر در دسترس نیست.",
  "Allow local storage and reopen the app.":
    "ذخیره‌سازی مرورگر را فعال و برنامه را دوباره باز کن.",
  "Something went wrong.": "عملیات انجام نشد.",
  "Complete this field.": "این قسمت را کامل کن.",
  "Check this value.": "مقدار را بررسی کن.",
  "Enter a valid amount.": "مبلغ را درست وارد کن.",
  "Enter a name and valid balance.": "نام و موجودی اولیه را درست وارد کن.",
  "Choose different accounts.": "حساب مبدأ و مقصد متفاوت باشند.",
  "Choose a date.": "تاریخ را انتخاب کن.",
  "This budget already exists.": "بودجه این دسته در این ماه وجود دارد.",
  "Enter a goal, target and savings.":
    "نام هدف، مبلغ و پس‌انداز را درست وارد کن.",
  "Enter an installment title and valid reminder days.":
    "عنوان قسط و روزهای یادآوری را درست وارد کن.",
  "Returned amount cannot exceed the loan.":
    "بازپرداخت از مبلغ قرض بیشتر نباشد.",
  "Choose 1 to 100 installments.": "تعداد اقساط بین ۱ تا ۱۰۰ باشد.",
  "Date must be before 2101.": "تاریخ باید قبل از سال ۲۱۰۱ باشد.",
  "This record changed. Reopen the form.":
    "این مورد تغییر کرده؛ فرم را دوباره باز کن.",
  "Another device changed this record.": "این مورد در دستگاه دیگری تغییر کرده.",
  "The selected account does not exist.": "حساب انتخاب‌شده وجود ندارد.",
  "This category already has a budget for this month.":
    "بودجه این دسته در این ماه وجود دارد.",
  "Your session expired. Refresh the page.": "نشست منقضی شده؛ صفحه را تازه کن.",
  "Amount must be a positive whole-toman value, up to 1 trillion.":
    "مبلغ باید عدد صحیح مثبت و حداکثر هزار میلیارد تومان باشد.",
};
Object.assign(fa, {
  "Connected portfolio": "تجمیع",
  "Download extension": "دانلود افزونه",
  "Receive from extension": "دریافت از افزونه",
  "Import JSON": "ورود JSON",
  "On this device": "فقط این دستگاه",
  "Cloud synced": "همگام با سرور",
  Conflict: "تداخل تغییرات",
  "Connect the extension": "اتصال افزونه",
  "Install the extension in desktop Chrome or Edge. Open your provider portfolio or installment page and capture it. Review the columns and save. In the extension, connect this app URL, then return here to receive the captures.":
    "افزونه را در Chrome یا Edge کامپیوتر نصب کن. صفحه پرتفو یا اقساط هر سرویس را باز کن، روی افزونه بزن و پس از بررسی ستون‌ها ذخیره کن. نشانی این برنامه را در افزونه ثبت و اتصال را تأیید کن؛ سپس به این صفحه برگرد.",
  "Mobile Chrome does not run this extension. Sync here, then open the same app account on your phone.":
    "افزونه در Chrome موبایل اجرا نمی‌شود؛ اینجا همگام کن و روی گوشی وارد همین حساب برنامه شو.",
  "Live provider accounts have not been verified. Table mapping and manual CSV are available; missing data stays unknown.":
    "خواندن حساب واقعی سرویس‌ها هنوز تأیید نشده. انتخاب ستون‌ها و ورود CSV در دسترس است؛ داده غایب، نامشخص می‌ماند.",
  "Cloud sync": "همگام‌سازی بین دستگاه‌ها",
  "On this hosted app, portfolio snapshots sync through your ChatGPT sign-in. On your own .NET server, they sync through Google. Source passwords and cookies are never collected.":
    "در این نسخه، اطلاعات تجمیع با حساب ChatGPT و روی سرور شخصی .NET با حساب گوگل همگام می‌شود. رمز و کوکی سرویس‌ها دریافت نمی‌شوند.",
  "Currently local. Sign in to your deployed app to sync across devices.":
    "فعلاً اطلاعات محلی است؛ برای دیدن روی دستگاه‌های دیگر باید وارد حساب برنامه شوی.",
  "Paste a table / CSV": "ورود جدول کپی‌شده / CSV",
  "Reload cloud data": "دریافت نسخه سرور",
  "Reload cloud data?": "نسخه سرور دریافت شود؟",
  "Export first. Unsynced portfolio edits will be discarded.":
    "اول خروجی بگیر؛ تغییرات ارسال‌نشده تجمیع کنار گذاشته می‌شوند.",
  "Remove imported source?": "نسخه واردشده حذف شود؟",
  "Only the imported copy is removed. Your provider account stays unchanged.":
    "فقط نسخه واردشده از این فهرست حذف می‌شود؛ حساب اصلی سرویس تغییری نمی‌کند.",
  "Exit demo to import your data.":
    "برای ورود اطلاعات خودت از حالت نمونه خارج شو.",
  "Portfolio file is too large.": "فایل تجمیع بیش از حد بزرگ است.",
  "Import failed.": "ورود اطلاعات انجام نشد.",
  "Import portfolio?": "اطلاعات تجمیع وارد شود؟",
  Rows: "ردیف",
  "Complete list replaces missing rows in the same source.":
    "فهرست کامل: ردیف‌های غایب همین منبع جایگزین می‌شوند.",
  "Partial list keeps previous rows.": "فهرست ناقص: ردیف‌های قبلی حفظ می‌شوند.",
  "Reviewed snapshots will sync to your app account when signed in.":
    "پس از تأیید و در صورت ورود به حساب، این اطلاعات روی سرور برنامه هم ذخیره می‌شود.",
  "Connect the extension to this app URL, then reload this page.":
    "نشانی همین برنامه را در افزونه ثبت و اتصال را تأیید کن؛ سپس این صفحه را تازه کن.",
  "Extension connection failed.": "اتصال افزونه انجام نشد.",
  "Cloud conflict. Export local data before reloading cloud data.":
    "نسخه سرور با تغییرات محلی تداخل دارد؛ قبل از دریافت نسخه سرور، خروجی بگیر.",
  "Sign in again to sync.": "برای همگام‌سازی دوباره وارد حساب شو.",
  "Portfolio sync failed. Your data is kept locally.":
    "همگام‌سازی تجمیع انجام نشد؛ اطلاعات روی این دستگاه محفوظ است.",
  "Invalid portfolio file.": "ساختار فایل تجمیع معتبر نیست.",
  "An older capture cannot replace newer data.":
    "اطلاعات قدیمی نمی‌تواند جایگزین اطلاعات جدیدتر شود.",
  "Invalid decimal.": "مقدار عددی معتبر نیست.",
  "Duplicate row key. Choose a unique reference column.":
    "شناسه ردیف تکراری است؛ ستون شناسه یکتا را انتخاب کن.",
});
Object.assign(fa, {
  "Import captures": "واردکردن اطلاعات",
  Portfolio: "تجمیع",
});
Object.assign(fa, {
  "Monthly plan": "برنامه ماهانه",
  "Monthly expenses": "هزینه‌های ثابت",
  Notes: "یادداشت‌ها",
  "New note": "یادداشت جدید",
  Note: "یادداشت",
  Content: "متن",
  Pinned: "سنجاق‌شده",
  Pin: "سنجاق کن",
  Unpin: "بردار",
  "Pin note": "سنجاق‌کردن یادداشت",
  "Search notes": "جست‌وجوی یادداشت",
  "No notes yet.": "هنوز یادداشتی نیست.",
  "New category": "دسته جدید",
  "Category name": "نام دسته",
  "Your categories": "دسته‌های من",
  Color: "رنگ",
  "Deleted category": "دسته حذف‌شده",
  "Create plan": "ساخت برنامه",
  "Edit plan": "ویرایش برنامه",
  "Plan month": "ماه برنامه",
  "Monthly money": "پول این ماه",
  "Monthly money (toman)": "پول این ماه (تومان)",
  "Actually allocated": "تخصیص واقعی",
  Remaining: "باقی‌مانده",
  "Planned allocation": "تقسیم برنامه‌ریزی‌شده",
  "Actual allocation": "تقسیم واقعی",
  Unassigned: "تقسیم‌نشده",
  Planned: "برنامه",
  Actual: "واقعی",
  "Left / over": "باقی / اضافه‌خرج",
  Percent: "درصد",
  "Add category": "افزودن دسته",
  "Remove category": "حذف دسته",
  "Check percentages.": "درصدها را بررسی کن.",
  Year: "سال",
  Day: "روز",
  "Solar Hijri calendar": "تقویم شمسی",
  "Choose a complete Persian date.": "روز، ماه و سال شمسی را کامل انتخاب کن.",
  "Invalid Persian date.": "تاریخ شمسی معتبر نیست.",
  "Invalid Persian year.": "سال شمسی معتبر نیست.",
  "Invalid Persian month.": "ماه شمسی معتبر نیست.",
  "Saving converts this budget to the selected Persian month.":
    "با ذخیره، این بودجه به ماه شمسی انتخاب‌شده منتقل می‌شود.",
  "Give every part of your monthly money a purpose.":
    "برای هر بخش پول این ماه، یک مقصد مشخص کن.",
  "Plan your month": "این ماه را بچین",
  "Enter your monthly amount, add your own categories and set their percentages.":
    "مبلغ ماهانه، دسته‌ها و درصد هر کدام را مشخص کن.",
  "Where it actually went": "در عمل کجا رفت؟",
  "No actual spending in this month yet.": "این ماه هنوز هزینه‌ای ثبت نشده.",
  "Actual allocation counts expenses and explicitly categorized transfers once. Unmarked transfers and tracking goals are excluded.":
    "هزینه‌ها و انتقال‌های دارای دسته، یک‌بار شمرده می‌شوند؛ انتقال بدون دسته و هدف‌های پس‌انداز در این جمع نیستند.",
  "Up to 100%. The rest stays unassigned.":
    "حداکثر ۱۰۰٪؛ بقیه پول تقسیم‌نشده می‌ماند.",
  "Enter a valid monthly amount and categories.":
    "مبلغ ماهانه و دسته‌ها را درست وارد کن.",
  "Each category can appear only once.": "هر دسته فقط یک‌بار در برنامه باشد.",
  "Percentages must total 100% or less.": "جمع درصدها نباید از ۱۰۰٪ بیشتر شود.",
  "Use up to 2 decimal places for percentages.":
    "درصد را با حداکثر دو رقم اعشار وارد کن.",
  "Use at most 30 categories.": "حداکثر ۳۰ دسته انتخاب کن.",
  "This month already has a plan.": "این ماه قبلاً برنامه دارد.",
  "This category name already exists.": "این نام دسته قبلاً وجود دارد.",
  "Move records using this category before deleting it.":
    "قبل از حذف، مواردی که از این دسته استفاده می‌کنند را جابه‌جا کن.",
  Investment: "سرمایه‌گذاری",
  Savings: "پس‌انداز",
  "Enter a valid title or name.": "نام یا عنوان را درست وارد کن.",
  "Enter a title and a note up to 4000 characters.":
    "عنوان و متن حداکثر ۴۰۰۰ کاراکتری وارد کن.",
  "New monthly expense": "هزینه ثابت جدید",
  "Monthly expense": "هزینه ثابت",
  "Expected this month": "تعهد این ماه",
  "Recorded payments": "پرداخت ثبت‌شده",
  "Still to pay": "مانده پرداخت",
  "Day of Persian month": "روز ماه شمسی",
  "Starts in": "از ماه",
  "Ends in": "تا ماه",
  "Has an end month": "ماه پایان دارد",
  "Default account": "حساب پیش‌فرض",
  "Choose when recording payment": "هنگام ثبت پرداخت انتخاب می‌کنم",
  "View payment": "دیدن پرداخت",
  "Record payment": "ثبت پرداخت",
  "No monthly expenses for this month.": "برای این ماه هزینه ثابتی ثبت نشده.",
  "Invalid recurring expense schedule.":
    "مبلغ، روز و بازه هزینه ثابت را بررسی کن.",
  "This monthly expense is already recorded.":
    "پرداخت این هزینه برای این ماه قبلاً ثبت شده.",
  "Record payment creates one expense in your account and updates the monthly plan. It does not pay the provider.":
    "ثبت پرداخت یک هزینه در حساب ایجاد می‌کند و نتیجه برنامه ماهانه را به‌روز می‌کند؛ پرداخت بانکی انجام نمی‌دهد.",
  "Investment insights": "پیشنهادها",
  "The price column unit must match the selected source unit.":
    "واحد ستون قیمت باید با واحد انتخاب‌شده یکسان باشد.",
  "New investment step": "پله سرمایه‌گذاری جدید",
  "Investment step": "پله سرمایه‌گذاری",
  "Investment steps": "پله سرمایه‌گذاری",
  "Investment title": "عنوان سرمایه‌گذاری",
  "Invested amount (toman)": "مبلغ سرمایه‌گذاری (تومان)",
  "Investment date": "تاریخ سرمایه‌گذاری",
  "Current value (optional)": "ارزش فعلی (اختیاری)",
  "Valuation date (if value entered)": "تاریخ ارزش‌گذاری (اگر مبلغ وارد شد)",
  "Investment steps are tracking records. Record the account movement separately.":
    "پله‌ها برای مقایسه‌اند؛ گردش حساب را جدا ثبت کن.",
  "Your investment steps, compared with the same money and dates.":
    "همان پول، همان تاریخ‌ها؛ نتیجه در بازارهای دیگر.",
  "A look back, not a forecast": "نگاه به گذشته؛ نه پیش‌بینی",
  "The best historical mix uses information known today. It is not a recommendation for future returns.":
    "سبد برتر گذشته با اطلاعات امروز محاسبه می‌شود؛ بازده آینده را پیشنهاد یا تضمین نمی‌کند.",
  "Total contributed": "جمع سرمایه واردشده",
  "Actual value": "ارزش واقعی",
  "Enter actual values with matching valuation dates.":
    "ارزش واقعی پله‌ها را با تاریخ ارزش‌گذاری یکسان وارد کن.",
  "Comparison date": "تاریخ مقایسه",
  "Latest common available date": "آخرین تاریخ مشترکِ در دسترس",
  "Yaghoot Agah": "یاقوت آگاه",
  "History incomplete": "تاریخچه ناقص",
  "Covered steps": "پله‌های قابل محاسبه",
  "No usable price": "قیمت موجود نیست",
  "Each investment step": "نتیجه هر پله",
  "Buy date": "تاریخ خرید فرضی",
  "Add your first investment step": "اولین پله را ثبت کن",
  "Enter the amount and Persian date of each contribution.":
    "مبلغ و تاریخ شمسی هر پله را وارد کن.",
  "Best historical mix under your limits": "سبد برتر گذشته با محدودیت‌های تو",
  "Hindsight only": "فقط نتیجه گذشته",
  "Maximum per asset (%)": "سقف هر دارایی (٪)",
  "Minimum fixed income (%)": "حداقل درآمد ثابت (٪)",
  "Historical allocation": "ترکیب تاریخی",
  "All four benchmarks need full price coverage before a historical mix can be calculated.":
    "برای محاسبه سبد، تاریخچه کامل هر چهار بازار لازم است.",
  "Without allocation limits, the historical maximum is 100% in the best available benchmark":
    "بدون سقف تخصیص، بیشترین بازده گذشته با ۱۰۰٪ سرمایه در بهترین بازارِ قابل محاسبه حاصل می‌شود",
  "Calculation method": "روش محاسبه",
  "Each contribution buys at the first available daily close on or after its date, within 7 days. All assets are valued on the common comparison date, using a price no more than 7 days old. Missing data is not interpolated.":
    "خرید هر پله با اولین قیمت پایانی در تاریخ آن یا حداکثر ۷ روز بعد فرض می‌شود. ارزش‌گذاری همه بازارها در تاریخ مشترک و با قیمت حداکثر ۷ روز قبل انجام می‌شود. قیمت غایب تخمین زده نمی‌شود.",
  "Bitcoin is converted from USD to toman using the historical dollar rate. The mix keeps the same weights for every contribution, without rebalancing, fees, spreads or taxes, and permits fractional units.":
    "بیت‌کوین با نرخ دلار همان دوره به تومان تبدیل می‌شود. وزن سبد در تمام پله‌ها ثابت است؛ بازتوازن، کارمزد، اختلاف خرید و فروش و مالیات لحاظ نمی‌شوند و خرید واحد کسری فرض می‌شود.",
  "Fund comparison uses Yaghoot Agah unit prices, not an assumed annual yield. If a split needs adjustment or data is unavailable, import adjusted history.":
    "مقایسه یاقوت با قیمت واحد صندوق است، نه نرخ سالانه فرضی. اگر تاریخچه نیازمند تعدیل یا ناموجود باشد، داده تعدیل‌شده وارد کن.",
  "Price history and sources": "تاریخچه قیمت و منابع",
  "Bitcoin · USD source": "بیت‌کوین · منبع دلاری",
  "Daily prices": "قیمت روزانه",
  "Not loaded": "دریافت نشده",
  "Provider history unavailable": "تاریخچه منبع در دسترس نیست",
  "Import historical unit prices in rial or toman. All saved comparison prices are in toman. Manual values are labelled with your source.":
    "قیمت تاریخی هر واحد را با ریال یا تومان وارد کن؛ خروجی محاسبه تومانی است. داده دستی با نام منبع تو مشخص می‌شود.",
  Benchmark: "بازار مقایسه",
  "Source unit": "واحد منبع",
  Rial: "ریال",
  "Source name": "نام منبع",
  "User import": "ورود دستی",
  "These are comparable unit prices, adjusted for splits where needed.":
    "این‌ها قیمت واحدِ قابل مقایسه و در صورت نیاز تعدیل‌شده‌اند.",
  "Import price history": "ورود تاریخچه قیمت",
  "Import up to 5000 rows. Existing dates are updated; other dates are kept.":
    "حداکثر ۵۰۰۰ ردیف؛ تاریخ‌های مشترک به‌روز و بقیه حفظ می‌شوند.",
  "The latest common price is outdated. Import recent history before comparing with today.":
    "آخرین قیمت مشترک قدیمی است؛ برای مقایسه با امروز، تاریخچه جدید وارد کن.",
  "Price history is unavailable. You can import CSV.":
    "تاریخچه قیمت در دسترس نیست؛ می‌توانی CSV وارد کنی.",
  "Choose a valuation date on or after the investment.":
    "تاریخ ارزش‌گذاری باید برابر یا بعد از تاریخ سرمایه‌گذاری باشد.",
  "Enter an investment title, amount and date.":
    "عنوان، مبلغ و تاریخ سرمایه‌گذاری را وارد کن.",
  "Use a cap of 25–100% and a fund minimum no larger than the cap.":
    "سقف هر دارایی باید ۲۵ تا ۱۰۰٪ و حداقل صندوق، حداکثر برابر همان سقف باشد.",
  "These allocation limits cannot total 100%.":
    "با این محدودیت‌ها نمی‌توان ۱۰۰٪ سرمایه را تقسیم کرد.",
  "Confirm that these are comparable adjusted unit prices.":
    "قابل مقایسه و تعدیل‌شده‌بودن قیمت‌ها را تأیید کن.",
  "Choose a benchmark and source name.": "بازار و نام منبع را مشخص کن.",
  "CSV needs date and price columns.": "CSV باید ستون date و price داشته باشد.",
  "Prices must be positive with unique dates.":
    "قیمت‌ها باید مثبت و تاریخ‌ها یکتا باشند.",
  "Import price history?": "تاریخچه قیمت وارد شود؟",
  "My money priorities": "اولویت‌های پولم",
  "Keep the emergency fund ready. Review the monthly plan before the next investment.":
    "ذخیره اضطراری را آماده نگه دار. قبل از سرمایه‌گذاری بعدی برنامه ماهانه را مرور کن.",
  "Home rent": "اجاره خانه",
  "Internet subscription": "اشتراک اینترنت",
  "First investment": "پله اول",
  "Second investment": "پله دوم",
});
export function t(key, values = {}) {
  let result = isRtl() ? (fa[key] ?? key) : key;
  for (const [name, value] of Object.entries(values))
    result = result.replaceAll(`{${name}}`, String(value));
  return result;
}
export function message(text) {
  return isRtl() ? (fa[text] ?? fa["Something went wrong."]) : text;
}
export const percentage = (value) =>
  new Intl.NumberFormat(locale(), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
export const localizedNumber = (value, decimals = 0) =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(
    value || 0,
  );
export function dueText(days) {
  if (days === 0) return t("Due today");
  const number = localizedNumber(Math.abs(days));
  return isRtl()
    ? `${number} روز ${days < 0 ? "عقب‌افتاده" : "تا سررسید"}`
    : days < 0
      ? `${number} days overdue`
      : `In ${number} days`;
}
export function countText(count, noun) {
  const singular = {
    Accounts: "Account",
    Installments: "Installment",
    Transactions: "Transaction",
  };
  return `${localizedNumber(count)} ${t(isRtl() ? singular[noun] || noun : noun)}`;
}

Object.assign(fa, {
  Planner: "برنامه‌ریز",
  "Notes, tasks, reminders and goals. Together.":
    "یادداشت، کارها، یادآورها و هدف‌ها؛ کنار هم.",
  Tasks: "کارها",
  "Open tasks": "کارهای باز",
  Checklist: "چک‌لیست",
  Task: "کار",
  "Add task": "افزودن کار",
  "Remove task": "حذف کار",
  Completed: "انجام‌شده",
  "Pin to dashboard": "سنجاق به داشبورد",
  "Pinned to your dashboard": "سنجاق‌شده‌های من",
  "New reminder": "یادآور جدید",
  "No personal reminders yet.": "هنوز یادآوری ثبت نشده.",
  "Start date": "تاریخ شروع",
  "Times (Tehran)": "ساعت‌ها (تهران)",
  Repeat: "تکرار",
  "Every (interval)": "هر چند بار",
  Once: "یک‌بار",
  "Every Persian month": "هر ماه شمسی",
  "Number of occurrences (optional)": "تعداد نوبت‌ها (اختیاری)",
  "End date (optional)": "تاریخ پایان (اختیاری)",
  Every: "هر",
  "day(s)": "روز",
  "week(s)": "هفته",
  "Persian month(s)": "ماه شمسی",
  occurrences: "نوبت",
  Next: "بعدی",
  Complete: "انجام شد",
  Reactivate: "فعال‌سازی دوباره",
  "No upcoming occurrence in the next year.": "در یک سال آینده نوبتی ندارد.",
  "Add checklist tasks inside any note.": "داخل هر یادداشت یک چک‌لیست بساز.",
  Notifications: "اعلان‌ها",
  "Mark all read": "همه را خواندم",
  "Mark read": "خواندم",
  "You are all caught up.": "اعلان تازه‌ای نداری.",
  "Reminder times use Tehran time. Push reminders need your .NET server and notification permission.":
    "ساعت‌ها بر پایه تهران‌اند. اعلان خارج از برنامه به سرور دات‌نت و اجازه اعلان نیاز دارد.",
  "Add up to 12 times, separated by commas. Monthly repeats use the Persian calendar.":
    "تا ۱۲ ساعت، جداشده با کاما. تکرار ماهانه بر پایه تقویم شمسی است.",
  "Use up to 50 unique tasks, with text up to 200 characters.":
    "تا ۵۰ کار با شناسه یکتا و متن حداکثر ۲۰۰ حرف وارد کن.",
  "Enter a valid reminder date, times and repeat schedule.":
    "تاریخ، ساعت‌ها و برنامه تکرار یادآور را درست وارد کن.",
  "Enter times as HH:mm, separated by commas.":
    "ساعت‌ها را به شکل 09:00 و با کاما جدا کن.",
  "Choose 1 to 12 unique reminder times.":
    "بین ۱ تا ۱۲ ساعت بدون تکرار انتخاب کن.",
  Money: "پول من",
  "Plan & remember": "برنامه و یادآوری",
  Investing: "سرمایه‌گذاری",
  Obligations: "تعهدات",
  Crypto: "رمزارزها",
  Metals: "فلزات",
  Currencies: "ارزها",
  Funds: "صندوق‌ها",
  Stocks: "سهام",
  "Market categories": "گروه‌های بازار",
  "Search market": "جست‌وجوی بازار",
  "Search symbols, funds or currencies": "جست‌وجوی نماد، صندوق یا ارز",
  "Quoted instruments": "نماد دارای قیمت",
  "No matching instruments.": "نمادی پیدا نشد.",
  "Redemption NAV": "NAV ابطال",
  "Closing price": "قیمت پایانی",
  "Spot price": "قیمت نقدی",
  "NAV unavailable": "NAV ناموجود",
  "Last known": "آخرین داده",
  "Each instrument shows its own source, unit and update time. Unavailable prices are never estimated.":
    "منبع، واحد و زمان هر نماد جداست. قیمت ناموجود تخمین زده نمی‌شود.",
  Ethereum: "اتریوم",
  Copper: "مس",
  "Gram / Toncoin": "گرام / تون‌کوین",
  Euro: "یورو",
  "toman / mithqal": "تومان / مثقال",
  "USD / tonne": "دلار / تن",
  "toman / unit": "تومان / واحد",
  "toman / share": "تومان / سهم",
  "Weekly money check": "مرور هفتگی پول",
  "Review the plan and upcoming installments.":
    "برنامه ماه و قسط‌های پیش‌رو را مرور کن.",
  "Review monthly spending": "مرور هزینه‌های ماه",
  "Set aside emergency savings": "کنار گذاشتن ذخیره اضطراری",
  "toman / EUR": "تومان / EUR",
  "toman / GBP": "تومان / GBP",
  "toman / AED": "تومان / AED",
  "toman / TRY": "تومان / TRY",
  "toman / CHF": "تومان / CHF",
  "toman / CNY": "تومان / CNY",
  "toman / TON": "تومان / TON",
  "toman / USDT": "تومان / USDT",
  "USD / ETH": "دلار / ETH",
  "USD / TRX": "دلار / TRX",
  "USD / SOL": "دلار / SOL",
  "USD / BNB": "دلار / BNB",
  "USD / XRP": "دلار / XRP",
  "USD / DOGE": "دلار / DOGE",
  "USD / ADA": "دلار / ADA",
  "USD / LTC": "دلار / LTC",
  "USD / DOT": "دلار / DOT",
});

Object.assign(fa, { All: "همه", Reminder: "یادآور" });

Object.assign(fa, {
  "Canvas notebook": "دفتر طراحی",
  "Handwritten notes": "دست‌نوشته‌ها",
  "New canvas": "دست‌نوشته جدید",
  "Open canvas": "باز کردن صفحه طراحی",
  "Untitled canvas": "دست‌نوشته بی‌نام",
  "Canvas title": "عنوان دست‌نوشته",
  "Drawing tools": "ابزارهای طراحی",
  "Drawing canvas": "صفحه طراحی",
  Pen: "قلم",
  Highlighter: "هایلایتر",
  Eraser: "پاک‌کن",
  "Select / move": "انتخاب و جابه‌جایی",
  Pan: "حرکت صفحه",
  Line: "خط",
  Arrow: "پیکان",
  Rectangle: "مستطیل",
  Ellipse: "بیضی",
  Text: "متن",
  Stroke: "ضخامت",
  Undo: "برگردان",
  Redo: "انجام دوباره",
  "Zoom out": "کوچک‌نمایی",
  "Zoom in": "بزرگ‌نمایی",
  "Delete selected": "حذف انتخاب‌شده",
  "Text for the text tool": "متن را بنویس، سپس روی صفحه بزن",
  "Stylus only": "فقط قلم دستگاه",
  "Export SVG": "خروجی SVG",
  "Save & close": "ذخیره و بستن",
  "Recovered drawing draft.": "پیش‌نویس دست‌نوشته بازیابی شد.",
  "Pen, mouse or touch. Your drawing stays in this note.":
    "با قلم، ماوس یا لمس بنویس؛ طراحی در همین یادداشت می‌ماند.",
  "Draft saved on this device.": "پیش‌نویس روی این دستگاه ذخیره شد.",
  "Undo keeps your last 30 edits. Drafts stay on this device until you save.":
    "۳۰ تغییر آخر قابل برگشت است؛ پیش‌نویس تا زدن ذخیره روی همین دستگاه می‌ماند.",
  "OPEN CANVAS": "صفحه آزاد",
  "Enter text first, then tap the paper.":
    "اول متن را بنویس، سپس روی صفحه بزن.",
  "YOUR PORTFOLIO": "دارایی‌های من",
  "Asset performance": "سود و زیان دارایی‌ها",
  "Unrealized gains on the open purchases you record.":
    "سود و زیان دارایی‌هایی که هنوز نگه داشته‌ای.",
  "New asset": "دارایی جدید",
  "Tracked value": "ارزش دارایی‌ها",
  "valued assets": "دارایی ارزش‌گذاری‌شده",
  "Unrealized profit / loss": "سود / زیان محقق‌نشده",
  "assets with known cost": "دارایی با بهای خرید مشخص",
  "Purchase cost": "بهای خرید",
  "Fees belong in the total purchase cost.":
    "کارمزد را در بهای کل خرید حساب کن.",
  "Valued on": "زمان ارزش‌گذاری",
  "Manual valuation": "ارزش‌گذاری دستی",
  "Purchases & valuation": "خریدها و ارزش‌گذاری",
  Value: "ارزش",
  units: "واحد",
  "Personal asset": "دارایی شخصی",
  "Undated capture": "زمان ارزش‌گذاری نامشخص",
  "Edit purchases": "ویرایش خریدها",
  "Set purchase cost": "ثبت بهای خرید",
  "Add your purchase cost": "بهای خرید را ثبت کن",
  "Quantity changed. Update open purchases.":
    "مقدار دارایی عوض شده؛ خریدهای باز را اصلاح کن.",
  "Add a valuation or link a market symbol.":
    "نوع دارایی یا ارزش‌گذاری را مشخص کن.",
  "Source unavailable. Sync the captured asset again.":
    "منبع موجود نیست؛ دارایی را دوباره همگام کن.",
  "Valuation date not supplied by the source.":
    "منبع، تاریخ ارزش‌گذاری نداده است.",
  "Add an asset or receive your holdings from the extension.":
    "دارایی بساز یا اطلاعات آن را از افزونه دریافت کن.",
  "Only open holdings are compared. Sold positions and dividends are not included. Charts use available unadjusted market prices or your dated valuations.":
    "محاسبه برای دارایی‌های نگهداری‌شده است؛ فروش و سود نقدی در آن نیست. نمودار از قیمت خام بازار یا ارزش‌گذاری تاریخ‌دار تو استفاده می‌کند.",
  "History is still accumulating.": "تاریخچه در حال کامل‌شدن است.",
  "Add dated valuations or wait for more market observations. Missing prices are not estimated.":
    "ارزش‌گذاری تاریخ‌دار اضافه کن یا منتظر داده بازار بمان؛ قیمت ناموجود تخمین زده نمی‌شود.",
  "Unrealized profit / loss chart": "نمودار سود و زیان محقق‌نشده",
  Zero: "صفر",
  Quantity: "مقدار دارایی",
  "Total purchase cost (toman)": "بهای کل خرید (تومان)",
  "Purchase date": "تاریخ خرید",
  "Remove purchase": "حذف خرید",
  "Asset name": "نام دارایی",
  "Asset type / market price": "نوع دارایی / قیمت بازار",
  "Captured / manual value": "ارزش دریافت‌شده / دستی",
  "Open purchases": "خریدهای باز",
  "Add purchase": "افزودن خرید",
  "Record only the purchases you still hold. Include fees in cost. Quantities must match captured holdings.":
    "خریدهایی را ثبت کن که هنوز نگه داشته‌ای؛ با کارمزد. مقدار باید با دارایی دریافت‌شده برابر باشد.",
  "Dated manual valuations": "ارزش‌گذاری‌های تاریخ‌دار",
  "One line per date: 1405/08/25, 12000000. Amount is the total asset value in toman.":
    "هر سطر: تاریخ شمسی، ارزش کل به تومان؛ مثال 1405/08/25, 12,000,000",
  "Unit price": "قیمت هر واحد",
  "Estimated asset value": "ارزش دارایی با نرخ بازار",
  "Choose an asset type to fetch its market price, or enter a manual valuation.":
    "نوع دارایی را برای دریافت قیمت انتخاب کن؛ یا ارزش‌گذاری دستی وارد کن.",
  "Google sign-in setup": "راه‌اندازی ورود گوگل",
  "Ready to sign in": "آماده ورود",
  "OAuth keys required": "کلیدهای OAuth لازم است",
  "Google only identifies you. Your notes, drawings and financial records sync to this app server; Gmail messages are not accessed.":
    "گوگل فقط هویت تو را مشخص می‌کند. یادداشت‌ها، دست‌نوشته‌ها و اطلاعات مالی با سرور برنامه همگام می‌شوند؛ ایمیل‌ها خوانده نمی‌شوند.",
  "Create a Web application OAuth client in Google Cloud, add your account as a test user, then register this exact redirect URI:":
    "در Google Cloud یک OAuth Client از نوع Web application بساز، حسابت را به Test users اضافه کن و این آدرس بازگشت را دقیق ثبت کن:",
  "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as server secrets.":
    "GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET را در تنظیمات امن سرور ثبت کن.",
  "Set Authentication:Google:ClientId and Authentication:Google:ClientSecret on the .NET server. Use scripts/setup-google.ps1 for local setup.":
    "در سرور دات‌نت Authentication:Google:ClientId و Authentication:Google:ClientSecret را تنظیم کن؛ برای اجرای محلی اسکریپت scripts/setup-google.ps1 آماده است.",
  "The client secret stays on the server. No Gmail password is needed.":
    "Client Secret فقط روی سرور می‌ماند؛ رمز جیمیل لازم نیست.",
  "Google OAuth keys are not configured yet. See the Google sign-in setup section in Settings.":
    "کلیدهای OAuth گوگل هنوز تنظیم نشده‌اند؛ بخش راه‌اندازی ورود گوگل در تنظیمات را ببین.",
  "Import previous captures": "وارد کردن دریافت‌های قبلی",
  "Google sign-in syncs your full notebook and finances. Existing ChatGPT portfolio captures can be imported after Google sign-in. Source passwords and cookies are never collected.":
    "ورود گوگل، دفتر یادداشت و اطلاعات مالی را همگام می‌کند. دریافت‌های قبلی حساب ChatGPT را پس از ورود گوگل وارد کن. رمز و کوکی سرویس‌های مالی خوانده نمی‌شوند.",
  "Invalid drawing document.": "صفحه طراحی معتبر نیست.",
  "Invalid drawing element.": "یکی از اجزای طراحی معتبر نیست.",
  "Drawing is too large or contains invalid points.":
    "طراحی بیش از حد بزرگ است یا نقطه نامعتبر دارد.",
  "Drawing note is too large.": "حجم دست‌نوشته بیش از حد مجاز است.",
  "Invalid asset position.": "اطلاعات دارایی معتبر نیست.",
  "Enter valid open purchases.":
    "خریدهای باز را با مقدار و بهای معتبر وارد کن.",
  "Enter a valid asset valuation.":
    "ارزش‌گذاری دارایی را با تاریخ و مبلغ معتبر وارد کن.",
  "Invalid asset amount or quantity.": "مبلغ یا مقدار دارایی معتبر نیست.",
  "Asset position exceeds the supported amount.":
    "مقدار دارایی بیش از حد مجاز است.",
  "My investment map": "نقشه سرمایه‌گذاری من",
  "Gold savings": "پس‌انداز طلا",
  "Dollar reserve": "ذخیره دلاری",
});

Object.assign(fa, {
  "Valuation predates the latest purchase.":
    "ارزش‌گذاری از آخرین خرید قدیمی‌تر است.",
});

Object.assign(fa, {
  Optional: "اختیاری",
  gram: "گرم",
  tonne: "تن",
  share: "سهم",
  unit: "واحد",
  mithqal: "مثقال",
});

Object.assign(fa, { "Add drawing": "افزودن طراحی" });

Object.assign(fa, { Asset: "دارایی" });

Object.assign(fa, {
  Workbench: "میز کار",
  "YOUR SPACE, YOUR WAY": "فضای تو، به سبک تو",
  "Money overview": "نمای کلی پول",
  "Add component": "افزودن کامپوننت",
  Arrange: "چیدن کارت‌ها",
  "Done arranging": "پایان چیدمان",
  cards: "کارت",
  "Desk background": "پس‌زمینهٔ میز کار",
  "Card background": "پس‌زمینهٔ کارت",
  "Card settings": "تنظیمات کارت",
  "Card title": "عنوان کارت",
  "Move card": "جابه‌جایی کارت",
  "Resize card": "تغییر اندازهٔ کارت",
  "Drag to resize": "برای تغییر اندازه بکش",
  "Arrow keys move; Shift + arrow keys resize.":
    "کلیدهای جهت: جابه‌جایی؛ با Shift: تغییر اندازه.",
  "Drag a header to move. Pull a corner to resize. Changes save automatically.":
    "عنوان کارت را برای جابه‌جایی و گوشه را برای تغییر اندازه بکش؛ تغییرها خودکار ذخیره می‌شوند.",
  "Your live components, in your own arrangement.":
    "اطلاعات به‌روز برنامه، با چیدمان تو.",
  "Swipe sideways to explore the full desk.":
    "برای دیدن تمام میز، به طرفین بکش.",
  "Scrollable workbench": "میز کار قابل پیمایش",
  "Make room for what matters.": "میزت را با چیزهای مهم بچین.",
  "Each card uses live app data. Removing a card keeps your records.":
    "کارت‌ها به داده‌های برنامه وصل‌اند؛ حذف کارت، اطلاعاتت را حذف نمی‌کند.",
  "Note to display": "یادداشت مورد نمایش",
  "Latest notes": "آخرین یادداشت‌ها",
  "Latest handwritten note": "آخرین دست‌نوشته",
  "This note is no longer available.": "این یادداشت دیگر در دسترس نیست.",
  "No handwritten notes yet.": "هنوز دست‌نوشته‌ای نداری.",
  "Includes drawing": "دارای طراحی",
  "Due this month": "سررسید این ماه",
  "Account balance": "موجودی حساب‌ها",
  "No assets yet.": "هنوز دارایی ثبت نشده.",
  "No outstanding loans.": "طلب بازی نداری.",
  "No upcoming reminders.": "یادآور پیشِ رو نداری.",
  "Nothing here yet.": "هنوز چیزی اینجا نیست.",
  "Add an account to start.": "برای شروع، حساب اضافه کن.",
  "Create a monthly plan first.": "ابتدا برنامهٔ ماهانه بساز.",
  "Theme color": "رنگ پوسته",
  "Use color": "انتخاب رنگ",
  "Custom color": "رنگ دلخواه",
  "Color picker": "انتخاب‌گر رنگ",
  "Hex color": "کد رنگ",
  "Leave empty to follow the app theme.": "برای هماهنگی با پوسته، خالی بگذار.",
  Column: "ستون",
  Row: "ردیف",
  Width: "عرض",
  Height: "ارتفاع",
  "Initial size": "اندازهٔ اولیه",
  Small: "کوچک",
  Medium: "متوسط",
  Large: "بزرگ",
  Tiny: "خیلی کوچک",
  "Remove card": "حذف کارت",
  "That space is occupied.": "این خانه‌ها اشغال شده‌اند.",
  "That space is occupied. Choose another position or size.":
    "این خانه‌ها اشغال شده‌اند؛ جای دیگر یا اندازهٔ دیگری انتخاب کن.",
  "Not enough room. Try a smaller card, or resize an existing one.":
    "فضای کافی نیست؛ کارت کوچک‌تری انتخاب کن یا اندازهٔ کارت‌های میز را تغییر بده.",
  "Invalid workbench layout.": "چیدمان میز کار معتبر نیست.",
  "Invalid workbench card.": "تنظیمات کارت معتبر نیست.",
  "Only one workbench is allowed.": "برای هر حساب یک میز کار وجود دارد.",
});

Object.assign(fa, { Open: "باز کردن" });

Object.assign(fa,{
  "Appearance": "ظاهر",
  "Data and devices": "داده‌ها و دستگاه‌ها",
  "About": "دربارهٔ",
  "More info": "توضیح بیشتر",
  "Phone": "گوشی",
  "Tablet": "تبلت",
  "Desktop": "دسکتاپ",
  "Visible on devices": "نمایش در دستگاه‌ها",
  "No components for this device.": "برای این دستگاه کامپوننتی انتخاب نشده است.",
  "Arrange desktop cards here. Phone and tablet layouts fit automatically. Green is phone; yellow is tablet.": "چیدمان دسکتاپ را اینجا تنظیم کن؛ گوشی و تبلت خودکار مرتب می‌شوند. سبز: گوشی؛ زرد: تبلت.",
  "Calendar system": "نوع تقویم",
  "Solar Hijri": "شمسی",
  "Gregorian": "میلادی",
  "First day of week": "شروع هفته",
  "Weekend": "آخر هفته",
  "Iran holidays": "تعطیلات ایران",
  "Holiday source": "منبع تعطیلات",
  "Saturday": "شنبه",
  "Sunday": "یکشنبه",
  "Monday": "دوشنبه",
  "Tuesday": "سه‌شنبه",
  "Wednesday": "چهارشنبه",
  "Thursday": "پنجشنبه",
  "Friday": "جمعه",
  "Thursday and Friday": "پنجشنبه و جمعه",
  "Saturday and Sunday": "شنبه و یکشنبه",
  "Changes the app language and reading direction.": "زبان برنامه و جهت نمایش رابط را تغییر می‌دهد.",
  "Choose light, dark, or follow your device.": "ظاهر روشن، تیره یا هماهنگ با دستگاه را انتخاب کن.",
  "Calendar views and repeating events can use Persian or Gregorian months.": "نمای تقویم و تکرار ماهانهٔ رویدادها می‌تواند شمسی یا میلادی باشد.",
  "Sets the first column in week and month views.": "ستون اولِ نمای هفتگی و ماهانه را مشخص می‌کند.",
  "Marks your non-working days without changing event dates.": "روزهای غیرکاری تو را رنگی می‌کند؛ تاریخ رویدادها تغییر نمی‌کند.",
  "Shows holidays from the dated calendar dataset. Ad-hoc closures are not included.": "تعطیلات ثبت‌شده در دادهٔ همان سال را نشان می‌دهد؛ تعطیلی‌های موردی در آن نیست.",
  "Google identifies your account; records and drawings sync to your app server.": "گوگل هویت تو را تأیید می‌کند؛ اطلاعات و طراحی‌ها در سرور برنامه همگام می‌شوند.",
  "Changes waiting to be accepted by the server.": "تغییرهایی که هنوز سرور آن‌ها را نپذیرفته است.",
  "Copy local records into your signed-in workspace.": "اطلاعات محلی را به فضای حساب واردشده کپی می‌کند.",
  "Full backup": "بکاپ کامل",
  "Export backup": "دریافت بکاپ",
  "Import backup": "بازیابی بکاپ",
  "Restore backup": "بازیابی بکاپ",
  "Includes records, handwritten canvases, images and app preferences in one editable JSON file.": "اطلاعات، سندهای دست‌نوشته، تصاویر و تنظیمات برنامه را در یک فایل JSON قابل ویرایش قرار می‌دهد.",
  "Creates a separate local workspace from a validated backup. Your existing records are kept.": "از بکاپ معتبر یک فضای محلی جدا می‌سازد؛ داده‌های فعلی حفظ می‌شوند.",
  "Background notifications need permission, sign-in and the .NET reminder service.": "اعلان در پس‌زمینه به اجازهٔ اعلان، ورود و سرویس یادآور دات‌نت نیاز دارد.",
  "Install the same web app on your phone or desktop.": "همین برنامهٔ وب را روی گوشی یا کامپیوتر نصب کن.",
  "Signs this device out of your workspace.": "حساب را روی همین دستگاه خارج می‌کند.",
  "Arrange cards, choose colors and control which cards appear on each device. Green is phone; yellow is tablet.": "جای کارت‌ها، رنگ‌ها و دستگاه‌های نمایش هر کارت را تنظیم کن. سبز برای گوشی و زرد برای تبلت است.",
  "Restore creates a separate local workspace. Switch here to return to your other records.": "بازیابی، فضای محلی مستقلی می‌سازد. از اینجا به اطلاعات فضای قبلی برگرد.",
  "Open Google workspace": "باز کردن فضای گوگل",
  "YOUR DAYS, AT A GLANCE": "روزهایت، یک‌جا",
  "Create": "ساختن",
  "Events": "رویدادها",
  "Event": "رویداد",
  "Task": "کار",
  "Description": "توضیحات",
  "Unscheduled tasks": "کارهای بدون تاریخ",
  "Schedule": "زمان‌بندی",
  "All tasks have a date.": "همهٔ کارها تاریخ دارند.",
  "Show on calendar": "نمایش در تقویم",
  "All day": "تمام روز",
  "Today": "امروز",
  "Week": "هفته",
  "Previous": "قبلی",
  "Next": "بعدی",
  "more": "بیشتر",
  "Holiday data is unavailable outside the listed years.": "دادهٔ تعطیلات خارج از سال مشخص‌شده در دسترس نیست.",
  "Go to date": "رفتن به تاریخ",
  "Create calendar item": "رویداد یا کار جدید",
  "Edit calendar item": "ویرایش برنامه",
  "Start date": "تاریخ شروع",
  "End date": "تاریخ پایان",
  "Start time": "ساعت شروع",
  "End time": "ساعت پایان",
  "Type": "نوع",
  "Does not repeat": "بدون تکرار",
  "Repeat until": "پایان تکرار",
  "Monthly repeats follow the calendar chosen when the event is created. Editing changes the entire series.": "تکرار ماهانه از نوع تقویم هنگام ساخت پیروی می‌کند. ویرایش، کل سری را تغییر می‌دهد.",
  "Completed": "انجام‌شده",
  "This occurrence": "همین نوبت",
  "Delete series": "حذف سری",
  "Go": "برو",
  "Sage": "سبز",
  "Blue": "آبی",
  "Purple": "بنفش",
  "Gold": "طلایی",
  "Rose": "صورتی",
  "Teal": "سبزآبی",
  "Preparing full backup…": "در حال آماده‌سازی بکاپ کامل…",
  "Restore a backup copy": "بازیابی یک نسخهٔ بکاپ",
  "Restore": "بازیابی",
  "records": "رکورد",
  "canvases": "بوم",
  "A separate local workspace will be created. Your current records stay untouched.": "یک فضای محلی جدا ساخته می‌شود؛ اطلاعات فعلی حفظ می‌شوند.",
  "Backup copy": "نسخهٔ بکاپ",
  "Backup restored in a separate workspace.": "بکاپ در یک فضای جدا بازیابی شد.",
  "Invalid backup file.": "فایل بکاپ معتبر نیست.",
  "Invalid backup record.": "یکی از رکوردهای بکاپ معتبر نیست.",
  "Invalid backup canvases.": "سندهای دست‌نوشتهٔ بکاپ معتبر نیستند.",
  "This backup is missing a linked canvas.": "یکی از دست‌نوشته‌های یادداشت‌ها در بکاپ وجود ندارد.",
  "The backup exceeds 128 MB. Export canvases separately.": "حجم بکاپ بیشتر از ۱۲۸ مگابایت است؛ از بوم‌ها جداگانه خروجی بگیر.",
  "Resolve canvas conflicts before making a backup.": "پیش از بکاپ، تعارض سند دست‌نوشته را رفع کن.",
  "A canvas is unavailable. Open it online before backing up.": "یک بوم در دسترس نیست؛ قبل از بکاپ آن را با اتصال اینترنت باز کن.",
  "This older backup has no canvas files. A full backup is required.": "این بکاپ قدیمی فایل‌های بوم را ندارد؛ بکاپ کامل لازم است.",
  "Enter a valid calendar event.": "عنوان، تاریخ و تنظیمات برنامه را درست وارد کن.",
  "End time must follow start time.": "زمان پایان باید بعد از شروع باشد.",
  "Choose a valid task date and time.": "تاریخ و ساعت معتبر برای کار انتخاب کن.",
  "Invalid preferences.": "تنظیمات معتبر نیست.",
  "Add event": "افزودن رویداد",
  "Changes save automatically.": "تغییرات خودکار ذخیره می‌شوند."
});

Object.assign(fa,{"Reporting month":"ماه گزارش","Controls the period used by the financial components on your desk.":"بازهٔ گزارش در کامپوننت‌های مالی میز کار را تعیین می‌کند."});

Object.assign(fa, {"Calendar tasks":"کارهای تقویم", "All caught up.":"همه پرداخت شده‌اند.", "No goals yet.":"هنوز هدفی نداری."});

Object.assign(fa,{"Choose valid start and end dates.":"تاریخ شروع و پایان را کامل و معتبر انتخاب کن."});

Object.assign(fa,{"Goals":"هدف‌ها"});

Object.assign(fa, {
  "Edit workbench": "ویرایش میز کار",
  "Enable editing to move, resize and add cards directly on your workbench.": "با فعال‌کردن این گزینه، کادرها را در خود میز کار جابه‌جا کن، تغییر اندازه بده یا اضافه کن.",
  "Choose a background color for your workbench.": "رنگ پس‌زمینهٔ میز کار را انتخاب کن.",
  "Choose color": "انتخاب رنگ",
  "Open workbench": "رفتن به میز کار",
  "Place a whole card inside a region to choose where it appears.": "کادر را کامل داخل یک محدوده بگذار تا دستگاه‌های نمایش آن مشخص شوند.",
  "Green: phone, tablet and desktop": "سبز: موبایل، تبلت و دسکتاپ",
  "Yellow: tablet and desktop": "زرد: تبلت و دسکتاپ",
  "Other cells: desktop only": "بقیهٔ خانه‌ها: فقط دسکتاپ",
  "Changes are saved as you arrange cards.": "تغییرات خودکار ذخیره می‌شوند؛ با ذخیره از حالت ویرایش خارج شو.",
  "Editing": "حالت ویرایش",
});

Object.assign(fa, {
  "To-do": "تودو",
  "Choose which items appear on your calendar. This choice is saved on this device.": "انتخاب کن چه مواردی در تقویم نمایش داده شوند. انتخابت روی این دستگاه ذخیره می‌شود.",
});

Object.assign(fa, {
  'Sign in / sign up': 'ورود / ثبت‌نام',
  'Backups': 'بکاپ‌ها',
  'Notes backup': 'بکاپ یادداشت‌ها',
  'Financial backup': 'بکاپ اطلاعات مالی',
  'Export notes': 'دریافت بکاپ یادداشت‌ها',
  'Export finances': 'دریافت بکاپ مالی',
  'Export everything': 'دریافت بکاپ کامل',
  'Includes notes, handwriting, to-dos, calendar items, reminders and PDF files.': 'همهٔ یادداشت‌ها، دست‌نوشته‌ها، تودوها، رویدادها، یادآوری‌ها و فایل‌های PDF را شامل می‌شود.',
  'Includes accounts, transactions, installments, budgets, assets and financial plans.': 'حساب‌ها، تراکنش‌ها، اقساط، بودجه‌ها، دارایی‌ها و برنامه‌های مالی را شامل می‌شود.',
  'Includes both sections and all app preferences.': 'هر دو بخش و تنظیمات برنامه را یک‌جا دریافت کن.',
  'Preparing backup…': 'در حال آماده‌سازی بکاپ…',
  'Add PDF': 'افزودن PDF',
  'PDF attachments': 'فایل‌های PDF',
  'Remove PDF': 'حذف PDF',
  'PDFs stay on this device and are included in notes backups. Up to 25 MB per file.': 'PDFها روی این دستگاه ذخیره می‌شوند و داخل بکاپ یادداشت‌ها قرار می‌گیرند. هر فایل حداکثر ۲۵ مگابایت.',
  'Choose a valid PDF file (up to 25 MB).': 'یک فایل PDF معتبر با حجم حداکثر ۲۵ مگابایت انتخاب کن.',
  'Invalid PDF attachment.': 'فایل PDF معتبر نیست.',
  'You can attach up to 10 PDFs to a note.': 'به هر یادداشت حداکثر ۱۰ فایل PDF می‌توانی اضافه کنی.',
  'This PDF is unavailable on this device. Restore it from a notes backup.': 'این PDF روی دستگاه موجود نیست؛ آن را از بکاپ یادداشت‌ها بازیابی کن.',
  'This backup is missing a PDF attachment.': 'یکی از فایل‌های PDF در این بکاپ موجود نیست.',
  'Invalid backup section.': 'بخش انتخاب‌شدهٔ بکاپ معتبر نیست.',
  'Loading PDF…': 'در حال باز کردن PDF…',
  'Previous page': 'صفحهٔ قبل',
  'Next page': 'صفحهٔ بعد',
  'Download PDF': 'دریافت PDF',
  'PDF page': 'صفحهٔ PDF',
  'This PDF is password protected.': 'این فایل PDF رمز دارد. برای خواندن، فایل اصلی را دریافت و با رمز باز کن.',
  'The PDF could not be displayed. You can download the original file.': 'نمایش PDF ممکن نشد. می‌توانی فایل اصلی را دریافت کنی.',
});

Object.assign(fa, { 'Zoom in': 'بزرگ‌نمایی', 'Zoom out': 'کوچک‌نمایی', 'Quick actions': 'دسترسی سریع' });

Object.assign(fa, {
  'Other notes': 'سایر یادداشت‌ها',
  'Grid view': 'نمای شبکه‌ای',
  'List view': 'نمای لیستی',
  'Take a note…': 'یادداشت بنویس…',
  'New list': 'چک‌لیست جدید',
  'More items': 'مورد دیگر',
  'Completed items': 'مورد انجام‌شده',
  'No matching notes.': 'یادداشتی پیدا نشد.',
});

Object.assign(fa, {
 'Back to notes': 'بازگشت به یادداشت‌ها', 'Photo': 'عکس', 'Simple calendar': 'تقویم ساده',
 'Website link': 'لینک سایت', 'Calculator': 'ماشین‌حساب', 'Random key': 'کلید تصادفی',
 'Clock and date': 'ساعت و تاریخ', 'Desk pet': 'پت میز کار', 'Website address': 'آدرس سایت',
 'Clock style': 'نمای ساعت', 'Digital': 'دیجیتال', 'Analog': 'آنالوگ', 'Time zone': 'منطقهٔ زمانی',
 'Device time': 'زمان دستگاه', 'Tehran': 'تهران', 'Character': 'کاراکتر', 'Cat': 'گربه', 'Robot': 'ربات',
 'Play with pet': 'بازی با پت', 'Say hello': 'سلام کن', 'Calculation': 'محاسبه', 'Length': 'طول', 'Format': 'قالب',
 'Generated key': 'کلید تولیدشده', 'Generate': 'تولید', 'Copy': 'کپی', 'Copied.': 'کپی شد.',
 'Opens in a new tab': 'در تب جدید باز می‌شود', 'Previous month': 'ماه قبل', 'Next month': 'ماه بعد',
 'Generated keys are not saved or synced.': 'کلیدهای تولیدشده ذخیره یا همگام نمی‌شوند.',
 'Select and copy the key.': 'کلید را انتخاب و کپی کن.',
 'Up to 4 photos. Each file up to 5 MB; photos are resized before saving.': 'حداکثر ۴ عکس؛ هر فایل تا ۵ مگابایت. عکس‌ها پیش از ذخیره کوچک و فشرده می‌شوند.',
 'Choose a photo in card settings.': 'یک عکس برای این بخش انتخاب کن.',
 'Add a website address in card settings.': 'آدرس سایت را در تنظیمات بخش وارد کن.',
 'Enter a valid http or https link.': 'یک لینک معتبر با http یا https وارد کن.',
 'Invalid component settings.': 'تنظیمات بخش معتبر نیست.',
 'Choose a PNG, JPEG or WebP image up to 5 MB.': 'یک عکس PNG، JPEG یا WebP تا ۵ مگابایت انتخاب کن.',
 'Choose an image smaller than 24 megapixels.': 'عکسی کوچک‌تر از ۲۴ مگاپیکسل انتخاب کن.',
 'This image could not be made small enough. Choose another image.': 'فشرده‌سازی این عکس کافی نبود؛ عکس دیگری انتخاب کن.',
 'Enter a valid calculation.': 'یک عبارت محاسباتی معتبر وارد کن.',
 'Cannot divide by zero.': 'تقسیم بر صفر ممکن نیست.',
 'Choose a key length from 16 to 128.': 'طول کلید را بین ۱۶ تا ۱۲۸ انتخاب کن.',
});

Object.assign(fa, {'You can add up to 4 photos to your workbench.': 'می‌توانی حداکثر ۴ عکس به میز کار اضافه کنی.'});

Object.assign(fa, {
 'Drawings': 'طراحی‌ها', 'Search drawings': 'جست‌وجوی طراحی‌ها', 'Search tasks': 'جست‌وجوی تسک‌ها',
 'New task': 'تسک جدید', 'No tasks yet.': 'هنوز تسکی ثبت نشده است.',
 'Search the web': 'در وب جست‌وجو کن…', 'Search with Google': 'جست‌وجو با گوگل', 'Quick access': 'دسترسی سریع',
 'Everyday tools': 'ابزارهای روزمره', 'Writing and planning': 'نوشتن و برنامه‌ریزی', 'Finances': 'امور مالی',
 'Components': 'بخش‌ها', 'A little company': 'همراه کوچک تو', 'Show on devices': 'نمایش در دستگاه‌ها',
 'Includes notes, drawings, tasks, calendar items and reminders.': 'یادداشت‌ها، طراحی‌ها، تسک‌ها، رویدادهای تقویم و یادآوری‌ها را شامل می‌شود.',
});
