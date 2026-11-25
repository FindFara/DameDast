export const navigationGroups = [
  {
    id: "money",
    label: "Money",
    color: "#367c61",
    items: ["monthlyPlan", "transactions", "accounts", "budgets"],
  },
  {
    id: "planning",
    label: "Plan & remember",
    color: "#658dc4",
    items: ["notes", "projects", "habits", "bookmarks", "calendar", "tasks", "reminders", "goals"],
  },
  {
    id: "investing",
    label: "Investing",
    color: "#a47bc4",
    items: ["assets", "market", "suggestions", "connected", "locked"],
  },
  {
    id: "obligations",
    label: "Obligations",
    color: "#c58b48",
    items: ["installments", "monthlyExpenses", "receivables"],
  },
];
export function navigationColor(page) {
  return navigationGroups.find(group => group.items.includes(page))?.color;
}
export const plannerPages = [
  "organizer",
  "notes",
  "projects",
  "habits",
  "bookmarks",
  "calendar",
  "tasks",
  "reminders",
  "goals",
];
