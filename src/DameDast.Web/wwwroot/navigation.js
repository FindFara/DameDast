export const navigationGroups = [
  { id: "exercise", label: "Exercise", color: "#658e88", items: ["developmentExercise", "workoutPrograms", "workoutTimer", "weightPlan"] },
  { id: "learning", label: "Learning hub", color: "#b78a43", items: ["learning"] },
  { id: "language", label: "Language", color: "#a47bc4", items: ["languageEssays", "languageLessons", "languageVocabulary"] },
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
    items: ["assets", "market", "suggestions"],
  },
  {
    id: "obligations",
    label: "Obligations",
    color: "#c58b48",
    items: ["installments"],
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

export const resolveLearningRoute = page => ["weeklyPlan", "developmentStudy"].includes(page) ? "learning" : page;

// Retain saved links while showing only the combined destinations in navigation.
export const resolveFinanceRoute = page => page === 'monthlyExpenses' ? 'installments' : ['receivables','locked','connected'].includes(page) ? 'assets' : page;
