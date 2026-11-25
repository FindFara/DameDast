import { locale } from "./i18n.js";
import { paymentEffect } from "./installment-payment.js";
import { shiftDay, weekday } from "./planner.js";
import {
  addSolarMonths,
  solarText,
  monthOf,
  dateInMonth,
  shiftMonth,
  jalaliParts,
} from "./calendar.js";
export const categories = [
  "Food & drinks",
  "Shopping",
  "Transport",
  "Home",
  "Health",
  "Leisure",
  "Learning",
  "Salary",
  "Other income",
  "Other",
];
export const palette = [
  "#367c61",
  "#8fa684",
  "#b2bfa1",
  "#d1d6bb",
  "#dfd9c3",
  "#b2c9c5",
];
export const categoryIcon = {
  "Food & drinks": "♧",
  Shopping: "♙",
  Transport: "↗",
  Home: "⌂",
  Health: "♡",
  Leisure: "☕",
  Learning: "▤",
  Salary: "↙",
  "Other income": "↙",
  Other: "◈",
};
export function today() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}
export const money = (number, decimals = 0) =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(
    number || 0,
  );
export const dateText = (date, year = false) => solarText(date, year);
export const addMonths = addSolarMonths;
export function dueDays(date) {
  return Math.round(
    (new Date(date + "T12:00:00") - new Date(today() + "T12:00:00")) / 86400000,
  );
}
export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function materialize(state) {
  const records = new Map(
    state.snapshot.records.map((r) => [r.id, structuredClone(r)]),
  );
  for (const change of state.pending) {
    if (change.kind === "habit" && change.delete) for (const r of records.values())
      if (!r.deleted && r.kind === "habitLog" && r.data.habitId === change.id) records.set(r.id, { ...r, version: r.version + 1, deleted: true });
    const effect = paymentEffect([...records.values()], change);
    if (effect) records.set(effect.id, effect);
    const current = records.get(change.id);
    records.set(change.id, {
      id: change.id,
      kind: change.kind,
      version: (current?.version || 0) + 1,
      deleted: change.delete,
      data: change.delete ? current?.data : change.data,
    });
  }
  return [...records.values()];
}
export function balance(account, transactions) {
  return transactions.reduce(
    (sum, t) =>
      sum +
      (t.data.accountId === account.id
        ? t.data.type === "income"
          ? t.data.amount
          : -t.data.amount
        : 0) +
      (t.data.type === "transfer" && t.data.destinationId === account.id
        ? t.data.amount
        : 0),
    account.data.openingBalance,
  );
}
export function totals(transactions) {
  return {
    income: transactions
      .filter((t) => t.data.type === "income")
      .reduce((s, t) => s + t.data.amount, 0),
    expense: transactions
      .filter((t) => t.data.type === "expense")
      .reduce((s, t) => s + t.data.amount, 0),
  };
}
export const DEMO_VERSION = 5;
export function makeDemo() {
  const accounts = [
    {
      id: crypto.randomUUID(),
      kind: "account",
      version: 1,
      deleted: false,
      data: {
        name: "Everyday account",
        cardNumber: "0000000000000001",
        openingBalance: 18500000,
        color: "teal",
      },
    },
    {
      id: crypto.randomUUID(),
      kind: "account",
      version: 1,
      deleted: false,
      data: {
        name: "Savings account",
        cardNumber: "0000000000000002",
        openingBalance: 32000000,
        color: "blue",
      },
    },
    {
      id: crypto.randomUUID(),
      kind: "account",
      version: 1,
      deleted: false,
      data: { name: "Cash wallet", openingBalance: 1500000, color: "orange" },
    },
  ];
  const record = (kind, data) => ({
    id: crypto.randomUUID(),
    kind,
    version: 1,
    deleted: false,
    data,
  });
  const base = today();
  const day = jalaliParts(base).day;
  const tx = (amount, category, type, note, offset = 0) =>
    record("transaction", {
      accountId: accounts[0].id,
      destinationId: null,
      type,
      amount,
      category,
      date: dateInMonth(monthOf(base), Math.max(1, day - offset)),
      note,
    });
  const records = [
    ...accounts,
    tx(28000000, "Salary", "income", "Monthly salary", 5),
    tx(850000, "Food & drinks", "expense", "Weekly groceries", 0),
    tx(320000, "Transport", "expense", "Getting to work", 1),
    tx(480000, "Leisure", "expense", "Coffee with friends", 1),
    tx(2400000, "Shopping", "expense", "A little wardrobe refresh", 2),
    tx(5200000, "Home", "expense", "Monthly rent", 3),
    tx(1950000, "Food & drinks", "expense", "Grocery run", 4),
    tx(3000000, "Other income", "income", "Freelance project", 2),
    record("transaction", {
      accountId: accounts[0].id,
      destinationId: accounts[1].id,
      type: "transfer",
      amount: 5000000,
      category: "Investment",
      date: base,
      note: "Monthly savings",
    }),
  ];
  for (let i = 1; i < 6; i++) {
    const date = dateInMonth(shiftMonth(monthOf(base), -i), 10);
    records.push(
      record("transaction", {
        accountId: accounts[0].id,
        destinationId: null,
        type: "income",
        amount: 25000000 + i * 300000,
        category: "Salary",
        date,
        note: "Monthly salary",
      }),
      record("transaction", {
        accountId: accounts[0].id,
        destinationId: null,
        type: "expense",
        amount: 16000000 + i * 450000,
        category: "Home",
        date,
        note: "Monthly living costs",
      }),
    );
  }
  records.push(
    record("budget", {
      category: "Food & drinks",
      limit: 4000000,
      month: monthOf(base),
      calendar: "persian",
    }),
    record("budget", {
      category: "Shopping",
      limit: 3000000,
      month: monthOf(base),
      calendar: "persian",
    }),
    record("budget", {
      category: "Transport",
      limit: 1500000,
      month: monthOf(base),
      calendar: "persian",
    }),
    record("goal", {
      name: "A little escape",
      target: 20000000,
      saved: 12500000,
      deadline: null,
    }),
    record("goal", {
      name: "A new laptop",
      target: 80000000,
      saved: 32000000,
      deadline: null,
    }),
  );
  const after = days => shiftDay(base, days);
  for (let i = 0; i < 6; i++)
    records.push(
      record("installment", {
        title: `Laptop installment ${i + 1}/6`,
        amount: 3500000,
        dueDate: addMonths(after(2), i - 1),
        paid: i === 0,
        reminderDays: 3,
      }),
    );
  records.push(
    record("installment", {
      title: "Home deposit loan",
      amount: 2800000,
      dueDate: after(-3),
      paid: false,
      reminderDays: 3,
    }),
    record("receivable", {
      person: "Alex",
      amount: 12000000,
      returned: 4000000,
      lentOn: after(-20),
      dueDate: after(8),
      note: "Moving expenses",
    }),
    record("receivable", {
      person: "Sara",
      amount: 5000000,
      returned: 0,
      lentOn: after(-10),
      dueDate: after(15),
      note: "A little help",
    }),
    record("locked", {
      name: "Rental deposit",
      amount: 150000000,
      releaseDate: addMonths(base, 8),
      note: "Held until the rental agreement ends",
    }),
    record("locked", {
      name: "Loan collateral",
      amount: 25000000,
      releaseDate: addMonths(base, 4),
      note: "Blocked savings, already excluded from spending accounts",
    }),
  );
  records.push(
    record("allocationPlan", {
      month: monthOf(base),
      total: 40000000,
      rows: [
        { category: "Home", basisPoints: 3500 },
        { category: "Food & drinks", basisPoints: 2000 },
        { category: "Leisure", basisPoints: 1000 },
        { category: "Investment", basisPoints: 2000 },
        { category: "Shopping", basisPoints: 1000 },
        { category: "Transport", basisPoints: 500 },
      ],
    }),
    record("note", {
      title: "My money priorities",
      body: "Keep the emergency fund ready. Review the monthly plan before the next investment.",
      pinned: true,
      updatedOn: base,
      checklist: [
        {
          id: crypto.randomUUID(),
          text: "Review monthly spending",
          done: false,
        },
        {
          id: crypto.randomUUID(),
          text: "Set aside emergency savings",
          done: true,
        },
      ],
    }),
    record("monthlyExpense", {
      title: "Home rent",
      amount: 5200000,
      category: "Home",
      day: 5,
      startMonth: monthOf(base),
      endMonth: null,
      accountId: accounts[0].id,
    }),
    record("monthlyExpense", {
      title: "Internet subscription",
      amount: 700000,
      category: "Home",
      day: 12,
      startMonth: monthOf(base),
      endMonth: null,
      accountId: accounts[0].id,
    }),
  );
  const rent = records.find(
      (r) => r.kind === "monthlyExpense" && r.data.title === "Home rent",
    ),
    rentTx = records.find(
      (r) => r.kind === "transaction" && r.data.note === "Monthly rent",
    );
  if (rentTx) {
    rentTx.data.recurringExpenseId = rent.id;
    rentTx.data.recurringMonth = monthOf(rentTx.data.date);
  }
  records.push(
    record("investmentStep", {
      title: "First investment",
      amount: 5000000,
      date: dateInMonth(shiftMonth(monthOf(base), -3), 10),
      actualValue: null,
      valueDate: null,
    }),
    record("investmentStep", {
      title: "Second investment",
      amount: 3000000,
      date: dateInMonth(shiftMonth(monthOf(base), -1), 10),
      actualValue: null,
      valueDate: null,
    }),
  );
  const demoGoal = records.find((r) => r.kind === "goal");
  if (demoGoal) demoGoal.data.pinned = true;
  records.push(
    record("reminder", {
      title: "Weekly money check",
      body: "Review the plan and upcoming installments.",
      startDate: base,
      times: ["09:00", "18:00"],
      repeat: "weekly",
      interval: 1,
      endDate: null,
      maxOccurrences: null,
      pinned: true,
      completed: false,
    }),
  );
  const purchaseDate = dateInMonth(shiftMonth(monthOf(base), -1), 10);
  records.push(
    record("assetPosition", {
      name: "Gold savings",
      sourceKey: null,
      marketSymbol: "GOLD",
      lots: [
        {
          id: crypto.randomUUID(),
          quantity: "10",
          costToman: "210000000",
          boughtOn: purchaseDate,
        },
      ],
      valuations: [],
    }),
  );
  records.push(
    record("assetPosition", {
      name: "Dollar reserve",
      sourceKey: null,
      marketSymbol: "USD",
      lots: [
        {
          id: crypto.randomUUID(),
          quantity: "2000",
          costToman: "430000000",
          boughtOn: purchaseDate,
        },
      ],
      valuations: [],
    }),
  );
  addProductivitySamples(records, record, base, after);
  return { demoVersion: DEMO_VERSION, snapshot: { revision: 0, records }, pending: [] };
}

function addProductivitySamples(records, record, base, after) {
  const project = record("project", { name: "توسعهٔ دم‌دست", description: "برنامه‌ریزی نسخهٔ بعدی، یادداشت‌ها و هزینه‌های پروژه در یک جا." });
  const trip = record("project", { name: "سفر آخر هفته", description: "برنامهٔ یک سفر کوتاه و مدیریت هزینه‌ها." });
  const learning = record("habit", { name: "مطالعهٔ روزانه", weeklyTarget: 5, color: "#367c61", startDate: after(-14) });
  const gym = record("habit", { name: "باشگاه", weeklyTarget: 3, color: "#829bc9", startDate: after(-14) });
  const task = (title, offset, done = false) => record("calendarEvent", {
    title, description: "این مورد برای آزمایش برنامه است.", startDate: after(offset), endDate: after(offset),
    allDay: true, kind: "task", done, color: "#72ab95", repeat: "none", repeatCalendar: "persian", completedDates: [], projectId: project.id,
  });
  const nextWeek = 7 - ((weekday(base) + 1) % 7);
  records.push(project, trip, learning, gym,
    task("بررسی رابط کاربری موبایل", -2), task("تکمیل صفحهٔ پروژه‌ها", 1), task("بررسی بکاپ‌ها", 0, true),
    record("calendarEvent", {
      title: "مرور هفتگی پروژه", description: "مرور تسک‌ها و برنامهٔ هفتهٔ بعد", startDate: after(1), endDate: after(1),
      allDay: false, startTime: "18:00", endTime: "19:00", kind: "event", done: false, color: "#829bc9",
      repeat: "none", repeatCalendar: "persian", completedDates: [], projectId: project.id,
    }),
    record("installment", { title: "قسط آزمایشی هفتهٔ بعد", amount: 1800000, dueDate: after(nextWeek + 2), paid: false, reminderDays: 3 }),
    record("note", {
      title: "برنامهٔ نسخهٔ بعدی", body: "## کارهای این هفته\n- [x] طراحی صفحهٔ پروژه‌ها\n- [ ] بررسی نسخهٔ موبایل\n\n> هر روز یک قدم کوچک\n\n:::toggle ایده‌ها\nمرتب‌سازی منوها و ساده‌تر کردن داشبورد\n:::",
      updatedOn: base, pinned: true, projectId: project.id,
    }),
    record("note", { title: "فهرست وسایل سفر", body: "## وسایل ضروری\n- [ ] شارژر و پاوربانک\n- [ ] کتاب\n- [x] رزرو اقامتگاه", updatedOn: base, pinned: false, projectId: trip.id }),
    record("bookmark", { title: "مستندات ASP.NET Core", url: "https://learn.microsoft.com/aspnet/core/", excerpt: "مرجع ساخت API و برنامه‌های وب با دات‌نت.", tags: ["دات‌نت", "Read later"], projectId: project.id }),
    record("bookmark", { title: "راهنمای React", url: "https://react.dev/learn", excerpt: "ساخت رابط کاربری با کامپوننت‌های قابل استفادهٔ مجدد.", tags: ["برنامه‌نویسی"] }),
  );
  for (const offset of [-6, -4, -2, 0])
    records.push(record("habitLog", { habitId: learning.id, date: after(offset), done: true }));
  for (const offset of [-5, -2])
    records.push(record("habitLog", { habitId: gym.id, date: after(offset), done: true }));
  const goal = records.find(row => row.kind === "goal");
  if (goal) goal.data.projectId = trip.id;
  const expense = records.find(row => row.kind === "transaction" && row.data.category === "Shopping");
  if (expense) expense.data.projectId = trip.id;
}
