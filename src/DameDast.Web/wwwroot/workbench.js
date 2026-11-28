export const DESK_COLUMNS = 24,
  DESK_ROWS = 12;
export const MAX_DESK_ROWS = 864;
export const WORKBENCH_ID = "dc7da320-bd12-4e87-a4fb-06b79f2b9f40";
export const widgetCatalog = [
  { type: "search", title: "Google search", glyph: "search" },
  { type: "googleServices", title: "Google services", glyph: "apps" },
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
  { type: "accounts", title: "Accounts", page: "accounts", glyph: "accounts" },
  {
    type: "installments",
    title: "Installments",
    page: "installments",
    glyph: "installments",
  },
  { type: "tasks", title: "Tasks", page: "tasks", glyph: "tasks" },
  { type: "goals", title: "Savings goals", page: "goals", glyph: "goals" },
  { type: "markets", title: "Selected prices", page: "market", glyph: "market" },
  {
    type: "allocation",
    title: "Monthly plan",
    page: "monthlyPlan",
    glyph: "monthlyPlan",
  },
  {
    type: "assets",
    title: "Assets",
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
  overview:"Overview", notes:"Notes", tasks:"Tasks", calendar:"Calendar", projects:"Projects", habits:"Routines", bookmarks:"Saved links", accounts:"Accounts", transactions:"Transactions", budgets:"Budgets", goals:"Savings goals", reminders:"Reminders", assets:"Assets", market:"Market", installments:"Installments and fixed expenses", monthlyPlan:"Monthly plan", monthlyExpenses:"Monthly expenses", receivables:"Money lent", connected:"Connected", suggestions:"Suggestions", locked:"Locked assets", reports:"Reports", settings:"Settings"
};
export function legacyStandardSize(type) {
  if (type === "shortcut") return { width: 1, height: 1 };
  if (type === "search") return { width: 8, height: 1 };
  return { width: 4, height: ["plainCalendar", "calculator", "keyGenerator", "allocation"].includes(type) ? 3 : 2 };
}
export function standardSize(type) {
  if (type === "shortcut") return { width: 2, height: 2 };
  const previous = legacyStandardSize(type);
  return { width: previous.width * 2, height: previous.height * 2 };
}
export const deskColors = ["#4338ca", "#ffdf00", "#d93d3d", "#f4f3ef", "#202124"];
export const deskColorNames = ["Indigo blue", "Canary yellow", "Red", "Matte white", "Matte black"];
export const shortcutColors = {
  overview:"#4f46e5", notes:"#d99b00", tasks:"#219f76", calendar:"#d95769", projects:"#8b5cf6", habits:"#367c61", bookmarks:"#b66c3d",
  accounts:"#3575e5", transactions:"#0f9488", budgets:"#ea8b26", goals:"#cf4f83", reminders:"#9b59b6",
  assets:"#5968d5", market:"#1f9ca3", installments:"#bf9b27", monthlyPlan:"#516be5", monthlyExpenses:"#cf7244",
  receivables:"#41a37a", connected:"#7887bd", suggestions:"#d59331", locked:"#768398", reports:"#6f82c7", settings:"#697686",
};
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
    rect.width <= (layout.columns || DESK_COLUMNS) &&
    rect.height <= (layout.rows || DESK_ROWS) &&
    rect.x <= (layout.columns || DESK_COLUMNS) - rect.width &&
    rect.y <= (layout.rows || DESK_ROWS) - rect.height &&
    !layout.widgets.some((w) => w && w.id !== exceptId && overlaps(w, rect))
  );
}
export function validateWorkbench(layout) {
  if (
    !layout ||
    ![1,2,3].includes(layout.version) ||
    layout.columns !== (layout.version === 3 ? DESK_COLUMNS : 12) ||
    (!Number.isInteger(layout.rows) || (layout.version === 1 ? layout.rows !== 6 : layout.rows < (layout.version === 3 ? 12 : 6) || layout.rows > (layout.version === 3 ? MAX_DESK_ROWS : 72))) ||
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
      (!widgetCatalog.some((c) => c.type === w.type) && w.type !== "canvas") ||
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
      (layout.version === 2 && (w.width !== legacyStandardSize(w.type).width || w.height !== legacyStandardSize(w.type).height)) ||
      (layout.version === 3 && w.height > DESK_ROWS) ||
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
export function packStandardWidgets(widgets, columns = DESK_COLUMNS) {
  const result = [];
  for (const widget of widgets) {
    const size = standardSize(widget.type), width = Math.min(columns, widget.width ?? size.width), height = widget.height ?? size.height;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || height > 12)
      throw Error("Enter a valid component size.");
    let placed = false;
    for (let y = 0; !placed && y <= MAX_DESK_ROWS * 3 - height; y++) for (let x = 0; x <= columns - width; x++) {
      const rect = { x, y, width, height };
      if (!result.some(other => overlaps(other, rect))) { result.push({ ...widget, ...rect }); placed = true; break; }
    }
    if (!placed) throw Error("Not enough room for this component.");
  }
  return result;
}
export function standardWorkbench(layout, includeLegacyTools = true) {
  validateWorkbench(layout);
  layout = { ...layout, widgets: layout.widgets.filter(widget => widget.type !== "canvas" && !(widget.type === "shortcut" && widget.options?.page === "canvas")) };
  const ordered = layout.version === 1 ? [...layout.widgets].sort((a,b)=>a.y-b.y||a.x-b.x) : layout.widgets;
  const widgets = ordered.map(widget => {
    if (layout.version === 3) return widget.type === "shortcut" && widget.width === 1 && widget.height === 1 ? {...widget,width:2,height:2} : {...widget};
    const size = layout.version === 1 ? legacyStandardSize(widget.type) : widget;
    return { ...widget, width: widget.type === "shortcut" ? 2 : size.width * 2, height: widget.type === "shortcut" ? 2 : size.height * 2 };
  });
  if (layout.version === 1 && includeLegacyTools) {
    const additions = [defaultCard(101,"search"), ...["notes","tasks","calendar","projects"].map((page,index)=>defaultCard(102+index,"shortcut",{page}))];
    widgets.unshift(...additions.filter(candidate => !widgets.some(widget=>widget.id===candidate.id)).slice(0,Math.max(0,72-widgets.length)));
  }
  const packed = packStandardWidgets(widgets);
  return validateWorkbench({ ...layout, version:3, columns:DESK_COLUMNS, rows:Math.max(DESK_ROWS,...packed.map(widget=>widget.y+widget.height)), widgets:packed });
}
export function resizeWorkbenchWidget(layout, id, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || width > DESK_COLUMNS || height < 1 || height > DESK_ROWS)
    throw Error("Enter a valid component size.");
  const base = standardWorkbench(layout);
  if (!base.widgets.some(widget=>widget.id === id)) throw Error("Invalid workbench card.");
  const widgets = packStandardWidgets(base.widgets.map(widget=>widget.id === id ? { ...widget, width, height } : widget));
  return validateWorkbench({ ...base, widgets, rows:Math.max(DESK_ROWS,...widgets.map(widget=>widget.y+widget.height)) });
}
export function defaultWorkbench() {
  const widgets = packStandardWidgets([
    defaultCard(101,"search"), ...["notes","tasks","calendar","projects"].map((page,index)=>defaultCard(102+index,"shortcut",{page})),
    defaultCard(108,"markets"),defaultCard(1,"clock"),defaultCard(2,"plainCalendar"),defaultCard(107,"googleServices"),defaultCard(3,"summary"),defaultCard(4,"pet"),defaultCard(5,"notes"),defaultCard(6,"tasks")
  ]);
  return standardWorkbench({version:3, columns:DESK_COLUMNS, rows:Math.max(DESK_ROWS,...widgets.map(widget=>widget.y+widget.height)), background:null, widgets});
}
export function firstFreeSpace(layout, width, height) {
  for (let y = 0; y <= layout.rows - height; y++)
    for (let x = 0; x <= layout.columns - width; x++)
      if (canPlace(layout, { x, y, width, height }))
        return { x, y, width, height };
  return null;
}
export function changedRectangle(widget, dx, dy, resize = false) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  return resize
    ? {
        ...widget,
        width: clamp(widget.width + dx, 1, 12 - widget.x),
        height: clamp(widget.height + dy, 1, 6 - widget.y),
      }
    : {
        ...widget,
        x: clamp(widget.x + dx, 0, 12 - widget.width),
        y: clamp(widget.y + dy, 0, 6 - widget.height),
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
  phone: { columns: 8, rows: 36 },
  tablet: { columns: 16, rows: 18 },
  desktop: { columns: 24, rows: 12 },
};
export const deviceForWidth = width => width < 600 ? "phone" : width < 1100 ? "tablet" : "desktop";
export function widgetVisibleOnDevice(widget, device) {
  return !!deskDevices[device] && widget.devices?.[device] !== false;
}
export function deviceWorkbench(layout, device = "desktop") {
  validateWorkbench(layout);
  if (!deskDevices[device]) throw Error("Invalid device.");
  const grid = layout.version === 3 ? deskDevices[device] : { columns:deskDevices[device].columns / 2, rows:deskDevices[device].rows / 2 },
    widgets = [];
  const candidates = layout.widgets.filter(
    (w) => widgetVisibleOnDevice(w, device),
  );
  if (layout.version === 3) {
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
