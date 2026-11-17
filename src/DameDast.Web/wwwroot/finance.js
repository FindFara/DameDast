import { locale } from "./i18n.js";
import {
  addSolarMonths,
  solarText,
  monthOf,
  dateInMonth,
  shiftMonth,
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
export function makeDemo() {
  const accounts = [
    {
      id: crypto.randomUUID(),
      kind: "account",
      version: 1,
      deleted: false,
      data: {
        name: "Everyday account",
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
  const day = Number(base.slice(-2));
  const tx = (amount, category, type, note, offset = 0) =>
    record("transaction", {
      accountId: accounts[0].id,
      destinationId: null,
      type,
      amount,
      category,
      date:
        base.slice(0, 8) + String(Math.max(1, day - offset)).padStart(2, "0"),
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
  const after = (days) => {
    const d = new Date(base + "T12:00:00");
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
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
  const element = (
    type,
    x,
    y,
    width,
    height,
    color = "#24785e",
    text = null,
  ) => ({
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width,
    height,
    color,
    strokeWidth: 3,
    ...(text ? { text } : {}),
  });
  records.push(
    record("note", {
      title: "My investment map",
      body: "",
      pinned: false,
      updatedOn: base,
      checklist: [],
      drawing: {
        version: 1,
        width: 1600,
        height: 1000,
        elements: [
          element("rectangle", 180, 220, 340, 200),
          element("rectangle", 850, 220, 400, 200),
          element("text", 230, 310, 0, 0, "#203b35", "Save with a purpose"),
          element("text", 920, 310, 0, 0, "#203b35", "Invest in small steps"),
          element("arrow", 550, 310, 260, 0),
          element("ellipse", 520, 590, 500, 220, "#3d6db5"),
          element("text", 610, 690, 0, 0, "#3d6db5", "Review each month"),
          element("arrow", 1050, 460, -190, 100, "#3d6db5"),
        ],
      },
    }),
  );
  return { demoVersion: 4, snapshot: { revision: 0, records }, pending: [] };
}
