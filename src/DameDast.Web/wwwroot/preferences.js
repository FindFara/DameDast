const key = "damdast-preferences-v2";
export const calendarVisibilityOptions = [
  ["event", "Events"],
  ["task", "Tasks"],
  ["reminder", "Reminders"],
  ["installment", "Installments"],
  ["goal", "Goals"],
];
const defaults = {
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
      ...JSON.parse(localStorage.getItem(key) || "{}"),
    });
  } catch {
    return { ...defaults };
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
  return value;
}
export function savePreferences(value) {
  const next = validatePreferences({ ...preferences(), ...value });
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
