import { defaultNotificationKinds, normalizeNotificationKinds } from "./notification-preferences.js";
import { defaultDashboardLayout, normalizeDashboardLayout } from "./dashboard-layout.js";
import { scopedStorageKey } from "./account-scope.js";
const key = "damdast-preferences-v2";
export const calendarVisibilityOptions = [
  ["event", "Events"],
  ["task", "Tasks"],
  ["reminder", "Reminders"],
  ["installment", "Installments"],
  ["goal", "Goals"],
];
const defaults = {
  dashboardLayout: defaultDashboardLayout(),
  notificationKinds: defaultNotificationKinds(),
  calendar: "persian",
  weekStart: 6,
  weekend: "friday",
  holidays: true,
  workbenchEditing: false,
  calendarItems: calendarVisibilityOptions.map(([kind]) => kind),
};
export function preferences() {
  try {
    return validatePreferences({
      ...defaults,
      ...JSON.parse(localStorage.getItem(scopedStorageKey(key)) || "{}"),
    });
  } catch {
    return { ...defaults, dashboardLayout: defaultDashboardLayout(), notificationKinds: defaultNotificationKinds() };
  }
}
export function validatePreferences(value) {
  if (
    !value ||
    !["persian", "gregory"].includes(value.calendar) ||
    ![0, 1, 6].includes(value.weekStart) ||
    !["friday", "thursday-friday", "saturday-sunday"].includes(value.weekend) ||
    typeof value.holidays !== "boolean" ||
    (value.workbenchEditing !== undefined &&
      typeof value.workbenchEditing !== "boolean") ||
    (value.calendarItems !== undefined &&
      (!Array.isArray(value.calendarItems) ||
        value.calendarItems.some((kind) =>
          !calendarVisibilityOptions.some(([allowed]) => kind === allowed)) ||
        new Set(value.calendarItems).size !== value.calendarItems.length))
  )
    throw Error("Invalid preferences.");
  const current = { ...value, dashboardLayout: normalizeDashboardLayout(value.dashboardLayout), notificationKinds: normalizeNotificationKinds(value.notificationKinds) };
  delete current.mainBackground; // Ignore the retired background override in old settings and backups.
  return current;
}
export function savePreferences(value) {
  const next = validatePreferences({ ...preferences(), ...value });
  localStorage.setItem(scopedStorageKey(key), JSON.stringify(next));
  return next;
}
