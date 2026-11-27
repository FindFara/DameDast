import { validIso } from "./calendar.js";
import { developmentWeek, developmentKind, validateDevelopment } from "./development.js";

export function learningWeekDays(date) {
  if (!validIso(date)) throw Error("Enter a valid date.");
  const days = developmentWeek(date).slice(0, 6);
  if (days[0] < "2000-01-01" || days[5] > "2100-12-31") throw Error("Date must be before 2101.");
  return days;
}
export function learningWeekChanges(date, titles, ids, records = []) {
  const days = learningWeekDays(date);
  if (!Array.isArray(titles) || titles.length !== 6 || titles.some(title => typeof title !== "string" || title.length > 120))
    throw Error("Enter up to 120 characters per title.");
  if (!Array.isArray(ids) || ids.length !== 6 || new Set(ids).size !== 6 || ids.some(id => !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)))
    throw Error("This record changed. Reopen the form.");
  const entries = titles.flatMap((title, i) => title.trim() ? [{id: ids[i], data: {
    date: days[i], area: "study", title: title.trim(), minutes: 0, notes: "", done: false, resourceId: null,
  }}] : []);
  if (!entries.length) throw Error("Enter at least one title.");
  return entries.flatMap(entry => {
    validateDevelopment(developmentKind, entry.data);
    const current = records.find(record => record.id === entry.id);
    if (current) {
      if (current.deleted || current.kind !== developmentKind || current.data.date !== entry.data.date || current.data.title !== entry.data.title || current.data.area !== "study")
        throw Error("This record changed. Reopen the form.");
      return [];
    }
    return [{...entry, kind: developmentKind, operationId: crypto.randomUUID(), expectedVersion: 0, delete: false}];
  });
}
