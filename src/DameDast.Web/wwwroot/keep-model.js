import { validateReminder } from "./organizer.js";
import { today, escapeHtml } from "./finance.js";

export const noteColors = [
  "default",
  "sand",
  "yellow",
  "sage",
  "mint",
  "blue",
  "lavender",
  "rose",
];
export const normalizeNoteSearch = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
export const noteContent = (data) =>
  JSON.stringify([
    data.title || "",
    data.body || "",
    data.richText || "",
    data.noteType || "text",
    data.checklist || [],
  ]);
export function normalizeNote(data = {}) {
  return {
    ...structuredClone(data),
    title: data.title || "",
    body: data.body || "",
    richText: data.richText || "",
    noteType: data.noteType || (data.checklist?.length ? "checklist" : "text"),
    checklist: (data.checklist || []).map((item) => ({
      ...item,
      indent: item.indent === 1 ? 1 : 0,
    })),
    pinned: !!data.pinned,
    color: noteColors.includes(data.color) ? data.color : "default",
    labels: [...new Set(data.labels || [])],
    status: ["archived", "trashed"].includes(data.status)
      ? data.status
      : "active",
    trashedAt: data.trashedAt || null,
    reminder: data.reminder || null,
    history: data.history || [],
    projectId: data.projectId || null,
  };
}
export const emptyNote = (data) =>
  !data.title?.trim() &&
  !data.body?.trim() &&
  !(data.checklist || []).some((item) => item.text.trim());
export function validateNote(data) {
  if (
    typeof data.title !== "string" ||
    typeof data.body !== "string" ||
    data.title.length > 80 ||
    data.body.length > 4000 ||
    emptyNote(data)
  )
    throw Error("Add text or a checklist item before saving.");
  if (
    !noteColors.includes(data.color || "default") ||
    !["active", "archived", "trashed"].includes(data.status || "active")
  )
    throw Error("Invalid note settings.");
  if (
    data.richText &&
    (typeof data.richText !== "string" || data.richText.length > 32000)
  )
    throw Error("Note formatting is too large.");
  if (
    !Array.isArray(data.labels || []) ||
    data.labels?.length > 30 ||
    new Set(data.labels).size !== data.labels.length
  )
    throw Error("Invalid note labels.");
  const items = data.checklist || [];
  if (
    !Array.isArray(items) ||
    items.length > 50 ||
    items.some(
      (item, i) =>
        !item.id ||
        typeof item.text !== "string" ||
        !item.text.trim() ||
        item.text.length > 200 ||
        ![0, 1, undefined].includes(item.indent) ||
        (i === 0 && item.indent === 1),
    ) ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    throw Error("Use up to 50 unique tasks, with text up to 200 characters.");
  if (data.status === "trashed" && !Number.isFinite(Date.parse(data.trashedAt)))
    throw Error("Invalid deletion date.");
  if (
    (data.history || []).length > 40 ||
    new TextEncoder().encode(JSON.stringify(data)).length > 750000
  )
    throw Error("Note history is too large.");
  if (data.reminder) validateReminder(data.reminder);
  return data;
}
export function noteRevision(data, savedAt = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    savedAt,
    title: data.title || "",
    body: data.body || "",
    richText: data.richText || "",
    noteType: data.noteType || "text",
    checklist: structuredClone(data.checklist || []),
  };
}
export function prepareNoteSave(
  previous,
  draft,
  now = new Date().toISOString(),
) {
  const next = normalizeNote(draft);
  next.title = next.title.trim();
  next.checklist = next.checklist
    .filter((item) => item.text.trim())
    .map((item) => ({ ...item, text: item.text.trim() }));
  if (next.checklist.length) next.checklist[0].indent = 0;
  next.createdAt =
    previous?.createdAt ||
    (previous?.updatedOn ? previous.updatedOn + "T12:00:00Z" : now);
  next.updatedOn = today();
  next.editedAt = now;
  next.history = structuredClone(previous?.history || []);
  if (
    previous &&
    noteContent(previous) !== noteContent(next) &&
    !emptyNote(previous)
  )
    next.history.push(
      noteRevision(
        previous,
        previous.editedAt ||
          (previous.updatedOn ? previous.updatedOn + "T12:00:00Z" : now),
      ),
    );
  next.history = next.history.slice(-40);
  while (
    next.history.length &&
    new TextEncoder().encode(JSON.stringify(next)).length > 700000
  )
    next.history.shift();
  return validateNote(next);
}
export function convertNote(data, type) {
  const next = normalizeNote(data);
  if (type === next.noteType) return next;
  if (type === "checklist") {
    const lines = next.body.split("\n").filter((line) => line.trim());
    next.checklist = lines.map((line) => ({
      id: crypto.randomUUID(),
      text: line.replace(/^\s*[-*]\s*\[[ xX]\]\s*/, "").slice(0, 200),
      done: /^\s*[-*]\s*\[[xX]\]/.test(line),
      indent: /^ {2,}|^\t/.test(line) ? 1 : 0,
    }));
    if (next.checklist[0]) next.checklist[0].indent = 0;
    next.checklist = next.checklist.map((item) => ({
      ...item,
      text: item.text.trim(),
    }));
    if (next.checklist.length > 50 || lines.some((line) => line.length > 200))
      throw Error("Use up to 50 unique tasks, with text up to 200 characters.");
    next.body = "";
    next.richText = "";
  } else {
    next.body = [
      next.body,
      ...next.checklist.map((item) => (item.indent ? "  " : "") + item.text),
    ]
      .filter(Boolean)
      .join("\n");
    if (next.body.length > 4000)
      throw Error("Note text must not exceed 4000 characters.");
    next.richText = "";
    next.checklist = [];
  }
  next.noteType = type;
  return next;
}
export function moveChecklist(items, id, offset) {
  const result = structuredClone(items),
    index = result.findIndex((item) => item.id === id);
  if (index < 0) return result;
  if (result[index].indent === 1) {
    const target = index + offset;
    if (target <= 0 || target >= result.length) return result;
    [result[index], result[target]] = [result[target], result[index]];
    if (result[0]) result[0].indent = 0;
    return result;
  }
  const groups = [];
  for (const item of result) {
    if (!item.indent || !groups.length) groups.push([]);
    groups.at(-1).push(item);
  }
  const source = groups.findIndex((group) => group[0].id === id),
    target = source + offset;
  if (target < 0 || target >= groups.length) return result;
  [groups[source], groups[target]] = [groups[target], groups[source]];
  return groups.flat();
}
export function labelName(value) {
  const name = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name || name.length > 40)
    throw Error("Use a label name from 1 to 40 characters.");
  return name;
}
export function checkLabelName(name, records, id = null) {
  const clean = labelName(name);
  if (
    records.some(
      (record) =>
        !record.deleted &&
        record.kind === "noteLabel" &&
        record.id !== id &&
        normalizeNoteSearch(record.data.name) === normalizeNoteSearch(clean),
    )
  )
    throw Error("This label already exists.");
  return clean;
}
export function noteMatches(record, filters = {}) {
  const d = normalizeNote(record.data),
    query = normalizeNoteSearch(filters.search);
  const status =
    filters.route === "trash"
      ? "trashed"
      : filters.route === "archive"
        ? "archived"
        : "active";
  if (
    record.deleted ||
    record.kind !== "note" ||
    d.drawing ||
    d.whiteboardId ||
    (filters.route === "reminders"
      ? d.status === "trashed" || !d.reminder
      : filters.includeArchived && status === "active"
        ? d.status === "trashed"
        : d.status !== status)
  )
    return false;
  if (filters.label && !d.labels.includes(filters.label)) return false;
  if (filters.color && d.color !== filters.color) return false;
  if (filters.type && d.noteType !== filters.type) return false;
  if (filters.reminder && !d.reminder) return false;
  return (
    !query ||
    normalizeNoteSearch(
      [d.title, d.body, ...d.checklist.map((item) => item.text)].join(" "),
    ).includes(query)
  );
}
export function trashDaysLeft(data, now = new Date()) {
  return Math.max(
    0,
    Math.ceil(
      (Date.parse(data.trashedAt) + 7 * 86400000 - new Date(now).getTime()) /
        86400000,
    ),
  );
}
export function sanitizeNoteHtml(html) {
  if (typeof document === "undefined") return escapeHtml(html);
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowed = new Set([
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "H1",
    "H2",
    "P",
    "DIV",
    "BR",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "CODE",
    "PRE",
    "A",
  ]);
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) continue;
      if (child.nodeType !== 1) {
        child.remove();
        continue;
      }
      if (
        [
          "SCRIPT",
          "STYLE",
          "IFRAME",
          "OBJECT",
          "SVG",
          "IMG",
          "VIDEO",
          "AUDIO",
        ].includes(child.tagName)
      ) {
        child.remove();
        continue;
      }
      clean(child);
      if (!allowed.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      const href = child.tagName === "A" ? child.getAttribute("href") : null;
      for (const attribute of [...child.attributes])
        child.removeAttribute(attribute.name);
      if (href) {
        try {
          const url = new URL(href);
          if (
            ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          ) {
            child.href = url.href;
            child.rel = "noopener noreferrer";
            child.target = "_blank";
          }
        } catch {}
      }
    }
  };
  clean(template.content);
  return template.innerHTML;
}
export function noteTextFile(data) {
  return [
    data.title,
    ...(data.noteType === "checklist"
      ? [
          data.body || "",
          ...(data.checklist || []).map(
            (item) =>
              (item.indent ? "  " : "") +
              (item.done ? "[x] " : "[ ] ") +
              item.text,
          ),
        ]
      : [data.body]),
  ]
    .filter(Boolean)
    .join("\n\n");
}
