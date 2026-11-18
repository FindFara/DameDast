export const DESK_COLUMNS = 12,
  DESK_ROWS = 6;
export const WORKBENCH_ID = "dc7da320-bd12-4e87-a4fb-06b79f2b9f40";
export const widgetCatalog = [
  { type: "search", title: "Google search", glyph: "search" },
  { type: "shortcut", title: "App shortcut", glyph: "link" },
  { type: "image", title: "Photo", glyph: "photo" },
  { type: "plainCalendar", title: "Simple calendar", glyph: "calendar" },
  { type: "link", title: "Website link", glyph: "link" },
  { type: "calculator", title: "Calculator", glyph: "calculator" },
  { type: "keyGenerator", title: "Random key", glyph: "key" },
  { type: "clock", title: "Clock and date", glyph: "clock" },
  { type: "pet", title: "Desk pet", glyph: "pet" },
  {
    type: "summary",
    title: "Money overview",
    page: "overview",
    glyph: "wallet",
  },
  { type: "notes", title: "Notes", page: "notes", glyph: "notes" },
  {
    type: "canvas",
    title: "Handwritten notes",
    page: "canvas",
    glyph: "canvas",
  },
  { type: "accounts", title: "Accounts", page: "accounts", glyph: "accounts" },
  {
    type: "installments",
    title: "Installments",
    page: "installments",
    glyph: "installments",
  },
  { type: "tasks", title: "Tasks", page: "tasks", glyph: "tasks" },
  { type: "goals", title: "Savings goals", page: "goals", glyph: "goals" },
  { type: "markets", title: "Market", page: "market", glyph: "market" },
  {
    type: "allocation",
    title: "Monthly plan",
    page: "monthlyPlan",
    glyph: "monthlyPlan",
  },
  {
    type: "assets",
    title: "Asset performance",
    page: "assets",
    glyph: "assets",
  },
  {
    type: "receivables",
    title: "Money lent",
    page: "receivables",
    glyph: "receivables",
  },
  {
    type: "reminders",
    title: "Reminders",
    page: "reminders",
    glyph: "reminders",
  },
];
export const shortcutPages = {
  overview:"Overview", notes:"Notes", tasks:"Tasks", calendar:"Calendar", canvas:"Drawings", accounts:"Accounts", transactions:"Transactions", budgets:"Budgets", goals:"Savings goals", reminders:"Reminders", assets:"Asset performance", market:"Market", installments:"Installments", monthlyPlan:"Monthly plan", monthlyExpenses:"Monthly expenses", receivables:"Money lent", connected:"Connected", suggestions:"Suggestions", locked:"Locked assets", reports:"Reports", settings:"Settings"
};
export function standardSize(type) {
  if (type === "shortcut") return { width: 1, height: 1 };
  if (type === "search") return { width: 8, height: 1 };
  return { width: 4, height: ["plainCalendar", "calculator", "keyGenerator", "allocation"].includes(type) ? 3 : 2 };
}
export const deskColors = [
  "#f2f5f1",
  "#f4eddf",
  "#e3eeea",
  "#e5edf8",
  "#f0e6f1",
  "#182b2d",
  "#24344b",
  "#3f2c38",
];
const validId = (id) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) &&
  !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(id);
export const validDeskColor = (color) =>
  color === null || /^#[0-9a-f]{6}$/i.test(color ?? "");
export const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
export function canPlace(layout, rect, exceptId = null) {
  return (
    [rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.width >= 1 &&
    rect.height >= 1 &&
    rect.width <= DESK_COLUMNS &&
    rect.height <= (layout.rows || DESK_ROWS) &&
    rect.x <= DESK_COLUMNS - rect.width &&
    rect.y <= (layout.rows || DESK_ROWS) - rect.height &&
    !layout.widgets.some((w) => w && w.id !== exceptId && overlaps(w, rect))
  );
}
export function validateWorkbench(layout) {
  if (
    !layout ||
    ![1,2].includes(layout.version) ||
    layout.columns !== DESK_COLUMNS ||
    (layout.version === 1 ? layout.rows !== DESK_ROWS : !Number.isInteger(layout.rows) || layout.rows < 6 || layout.rows > 72) ||
    !validDeskColor(layout.background) ||
    !Array.isArray(layout.widgets) ||
    layout.widgets.length > 72 || layout.widgets.filter(w => w?.type === "image").length > MAX_DESK_IMAGES
  )
    throw Error("Invalid workbench layout.");
  const ids = new Set();
  for (const w of layout.widgets) {
    if (
      !w ||
      !validId(w.id) ||
      ids.has(w.id) ||
      !widgetCatalog.some((c) => c.type === w.type) ||
      !validDeskColor(w.background) ||
      (w.title != null &&
        (typeof w.title !== "string" ||
          w.title.length > 60 ||
          w.title !== w.title.trim())) ||
      (w.referenceId != null &&
        (!validId(w.referenceId) || !["notes", "canvas"].includes(w.type))) ||
      (w.devices != null &&
        (typeof w.devices !== "object" ||
          Object.keys(w.devices).some(
            (k) => !["phone", "tablet", "desktop"].includes(k),
          ) ||
          Object.values(w.devices).some((v) => typeof v !== "boolean"))) ||
      (layout.version === 2 && (w.width !== standardSize(w.type).width || w.height !== standardSize(w.type).height)) ||
      !canPlace(layout, w, w.id)
    )
      throw Error("Invalid workbench card.");
    ids.add(w.id);
    validateToolOptions(w.type, w.options);
  }
  return layout;
}
const defaultCard = (n, type, options = null) => ({
  id: `735adba9-2173-4dc3-899b-${String(n).padStart(12,"0")}`, type, x:0, y:0, ...standardSize(type), background:null, title:null, referenceId:null, options,
});
export function packStandardWidgets(widgets, columns = 12) {
  const result = [];
  for (const widget of widgets) {
    const size = standardSize(widget.type), width = Math.min(columns, size.width), height = size.height;
    let placed = false;
    for (let y = 0; !placed && y < 216; y++) for (let x = 0; x <= columns - width; x++) {
      const rect = { x, y, width, height };
      if (!result.some(other => overlaps(other, rect))) { result.push({ ...widget, ...rect }); placed = true; break; }
    }
  }
  return result;
}
export function standardWorkbench(layout, includeLegacyTools = true) {
  validateWorkbench(layout);
  const widgets = layout.version === 1 ? [...layout.widgets].sort((a,b)=>a.y-b.y||a.x-b.x) : [...layout.widgets];
  if (layout.version === 1 && includeLegacyTools) {
    const additions = [defaultCard(101,"search"), ...["notes","tasks","calendar","canvas"].map((page,index)=>defaultCard(102+index,"shortcut",{page}))];
    widgets.unshift(...additions.filter(candidate => !widgets.some(widget=>widget.id===candidate.id)).slice(0,Math.max(0,72-widgets.length)));
  }
  const packed = packStandardWidgets(widgets);
  return validateWorkbench({ ...layout, version:2, columns:12, rows:Math.max(6,...packed.map(widget=>widget.y+widget.height)), widgets:packed });
}
export function defaultWorkbench() {
  return standardWorkbench({version:2, columns:12, rows:6, background:null, widgets:packStandardWidgets([
      defaultCard(101,"search"), ...["notes","tasks","calendar","canvas"].map((page,index)=>defaultCard(102+index,"shortcut",{page})),
      defaultCard(1,"clock"),defaultCard(3,"summary"),defaultCard(4,"pet"),defaultCard(2,"plainCalendar"),defaultCard(5,"notes"),defaultCard(6,"tasks")
    ])});
}
export function firstFreeSpace(layout, width, height) {
  for (let y = 0; y <= DESK_ROWS - height; y++)
    for (let x = 0; x <= DESK_COLUMNS - width; x++)
      if (canPlace(layout, { x, y, width, height }))
        return { x, y, width, height };
  return null;
}
export function changedRectangle(widget, dx, dy, resize = false) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  return resize
    ? {
        ...widget,
        width: clamp(widget.width + dx, 1, DESK_COLUMNS - widget.x),
        height: clamp(widget.height + dy, 1, DESK_ROWS - widget.y),
      }
    : {
        ...widget,
        x: clamp(widget.x + dx, 0, DESK_COLUMNS - widget.width),
        y: clamp(widget.y + dy, 0, DESK_ROWS - widget.height),
      };
}
export function replaceWidget(layout, widget) {
  if (!canPlace(layout, widget, widget.id))
    throw Error("That space is occupied. Choose another position or size.");
  return validateWorkbench({
    ...layout,
    widgets: layout.widgets.map((w) => (w.id === widget.id ? widget : w)),
  });
}
export function deskContrast(color) {
  if (!color) return null;
  const rgb = [1, 3, 5]
    .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#18392e"
    : "#f2f6f3";
}
export function workbenchRecord(records) {
  return records.find((r) => !r.deleted && r.kind === "workbench") || null;
}

export const deskDevices = {
  phone: { columns: 4, rows: 18 },
  tablet: { columns: 8, rows: 9 },
  desktop: { columns: 12, rows: 6 },
};
export const deviceForWidth = (width) =>
  width < 600 ? "phone" : width < 1100 ? "tablet" : "desktop";
export function widgetVisibleOnDevice(widget, device) {
  return !!deskDevices[device] && widget.devices?.[device] !== false;
}
export function deviceWorkbench(layout, device = "desktop") {
  validateWorkbench(layout);
  if (!deskDevices[device]) throw Error("Invalid device.");
  const grid = deskDevices[device],
    widgets = [];
  const candidates = layout.widgets.filter(
    (w) => widgetVisibleOnDevice(w, device),
  );
  if (layout.version === 2) {
    const packed = packStandardWidgets(candidates, grid.columns);
    return { ...layout, columns:grid.columns, rows:Math.max(1,...packed.map(widget=>widget.y+widget.height)), widgets:packed, device };
  }
  if (device === "desktop") return { ...layout, widgets: candidates, device };
  for (const w of candidates) {
    const width = Math.min(grid.columns, w.width),
      height = w.height;
    let found = null;
    for (let y = 0; y <= grid.rows - height && !found; y++)
      for (let x = 0; x <= grid.columns - width; x++) {
        const rect = { x, y, width, height };
        if (!widgets.some((a) => overlaps(a, rect))) {
          found = rect;
          break;
        }
      }
    // Use extra rows if a narrow-screen packing has gaps; never silently drop a card.
    if (!found)
      found = {
        x: 0,
        y: Math.max(0, ...widgets.map((a) => a.y + a.height)),
        width,
        height,
      };
    widgets.push({ ...w, ...found });
  }
  return {
    ...layout,
    ...grid,
    rows: Math.max(grid.rows, ...widgets.map((w) => w.y + w.height)),
    widgets,
    device,
  };
}
import { validateToolOptions, MAX_DESK_IMAGES } from "./desk-tools.js";
