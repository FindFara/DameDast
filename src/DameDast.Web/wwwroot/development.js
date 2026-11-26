import { validIso, monthOf, monthBounds } from "./calendar.js";
import { today } from "./finance.js";
import { shiftDay, weekday } from "./planner.js";

export const developmentKind = "developmentEntry";
export const developmentPages = [
  "developmentStudy",
  "weeklyPlan",
  "developmentExercise",
];
export const developmentAreas = [
  "study",
  "exercise",
  "essay",
  "vocabulary",
  "lesson",
  "plan",
];
export function validateDevelopment(
  kind,
  data,
  currentDate = today(),
  records = null,
) {
  if (kind !== developmentKind) return;
  if (
    !data ||
    !validIso(data.date) ||
    data.date < "2000-01-01" ||
    data.date > "2100-12-31" ||
    !developmentAreas.includes(data.area) ||
    typeof data.title !== "string" ||
    !data.title.trim() ||
    data.title.length > 120 ||
    !Number.isInteger(data.minutes) ||
    data.minutes < 0 ||
    data.minutes > 1440 ||
    typeof data.notes !== "string" ||
    data.notes.length > 4000 ||
    typeof data.done !== "boolean"
  )
    throw Error("Enter a title, date and duration from 0 to 1440 minutes.");
  if (records && data.area === "lesson" && !data.resourceId)
    throw Error("Choose an existing lesson.");
  if (
    data.resourceId != null &&
    (data.area !== "lesson" ||
      !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(data.resourceId) ||
      (records &&
        !records.some(
          (r) =>
            !r.deleted &&
            r.kind === "languageLesson" &&
            r.id === data.resourceId,
        )))
  )
    throw Error("Choose an existing lesson.");
  if (data.done && data.date > currentDate)
    throw Error("Future activities cannot be completed yet.");
}
export function developmentEntries(records, area = null) {
  return records
    .filter(
      (r) =>
        !r.deleted &&
        r.kind === developmentKind &&
        (!area || r.data.area === area),
    )
    .map((r) => {
      const linked =
        r.data.area === "essay"
          ? records.find(
              (e) =>
                !e.deleted &&
                e.kind === "languageEssay" &&
                e.data.date === r.data.date,
            )?.data.reviewed
          : r.data.area === "vocabulary"
            ? records.find(
                (e) =>
                  !e.deleted &&
                  e.kind === "languageVocabulary" &&
                  e.data.date === r.data.date,
              )?.data.read
            : r.data.done;
      return {
        ...r,
        data: { ...r.data, done: r.data.date <= today() && !!linked },
      };
    })
    .sort(
      (a, b) =>
        a.data.date.localeCompare(b.data.date) || a.id.localeCompare(b.id),
    );
}
export function developmentWeek(date) {
  const start = shiftDay(date, -((weekday(date) + 1) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
}
export function developmentMonth(date) {
  const { start, end } = monthBounds(monthOf(date));
  const cells = Array((weekday(start) + 1) % 7).fill(null);
  for (let day = start; day < end; day = shiftDay(day, 1)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function developmentProgress(entries) {
  const completed = entries.filter((r) => r.data.done);
  return {
    total: entries.length,
    done: completed.length,
    minutes: completed.reduce((n, r) => n + r.data.minutes, 0),
    days: new Set(completed.map((r) => r.data.date)).size,
  };
}
