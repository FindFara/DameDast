import { tehranParts } from "./organizer.js";
import { nextCalendarOccurrence } from "./planner.js";

export const isDrawingNote = record => record?.kind === "note" && !!(record.data.drawing || record.data.whiteboardId);
export const textNotes = records => records.filter(record => !record.deleted && record.kind === "note" && !isDrawingNote(record));
export const plainNoteDraft = data => ({ title: typeof data?.title === "string" ? data.title : "", body: typeof data?.body === "string" ? data.body : "" });
export const notePayload = (previous, draft, date) => ({ pinned: false, ...previous, ...plainNoteDraft(draft), title: plainNoteDraft(draft).title.trim(), updatedOn: date });

// Old checklist items remain usable from Tasks; new tasks are independent records.
export function taskEntries(records, now = new Date()) {
  const date = tehranParts(now).date;
  return records.filter(record => !record.deleted).flatMap(record => {
    if (record.kind === "calendarEvent" && record.data.kind === "task") {
      const occurrence = record.data.repeat === "none" ? record.data.startDate : nextCalendarOccurrence(record.data, date);
      if (!occurrence) return [];
      return [{ record, id: record.id, title: record.data.title, date: occurrence,
        done: record.data.repeat === "none" ? record.data.done : !!record.data.completedDates?.includes(occurrence),
        source: "calendarEvent", occurrence }];
    }
    if (record.kind === "note") return (record.data.checklist || []).map(item => ({
      record, item, id: item.id, title: item.text, date: item.dueDate || "", done: item.done, source: "noteTask",
    }));
    return [];
  });
}
export function toggleTask(data, occurrence) {
  if (data.repeat === "none") return { ...data, done: !data.done };
  const dates = data.completedDates || [];
  return { ...data, completedDates: dates.includes(occurrence) ? dates.filter(date => date !== occurrence) : [...dates, occurrence] };
}
