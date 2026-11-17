import { escapeHtml as esc } from "./finance.js";
export const drawingTools = [
  "pen",
  "marker",
  "eraser",
  "select",
  "pan",
  "line",
  "arrow",
  "rectangle",
  "ellipse",
  "text",
];
export const drawingColors = [
  "#203b35",
  "#24785e",
  "#3d6db5",
  "#ac5eab",
  "#cc6b4b",
  "#d4b451",
];
export const emptyDrawing = () => ({
  version: 1,
  width: 1600,
  height: 1000,
  elements: [],
});
export function validateDrawing(d) {
  const bounded = (x, a, b) => Number.isFinite(x) && x >= a && x <= b;
  if (
    !d ||
    d.version !== 1 ||
    !bounded(d.width, 320, 8000) ||
    !bounded(d.height, 320, 8000) ||
    !Array.isArray(d.elements) ||
    d.elements.length > 500
  )
    throw Error("Invalid drawing document.");
  const ids = new Set();
  let count = 0;
  for (const e of d.elements) {
    if (
      !e ||
      typeof e.id !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        e.id,
      ) ||
      ids.has(e.id) ||
      !drawingTools
        .filter((t) => !["eraser", "select", "pan"].includes(t))
        .includes(e.type) ||
      !bounded(e.x, 0, d.width) ||
      !bounded(e.y, 0, d.height) ||
      !bounded(e.width, -d.width, d.width) ||
      !bounded(e.height, -d.height, d.height) ||
      !/^#[0-9a-fA-F]{6}$/.test(e.color) ||
      !bounded(e.strokeWidth, 1, 32) ||
      (e.text != null &&
        (typeof e.text !== "string" || e.text.length > 1000)) ||
      (e.type === "text" && !e.text?.trim())
    )
      throw Error("Invalid drawing element.");
    ids.add(e.id);
    if (e.points) {
      if (
        !Array.isArray(e.points) ||
        e.points.length > 4000 ||
        (count += e.points.length) > 20000 ||
        e.points.some(
          (p) =>
            !bounded(p.x, 0, d.width) ||
            !bounded(p.y, 0, d.height) ||
            !bounded(p.pressure, 0, 1),
        )
      )
        throw Error("Drawing is too large or contains invalid points.");
    }
    if (["pen", "marker"].includes(e.type) && !e.points?.length)
      throw Error("A pen stroke needs points.");
  }
  return d;
}
const n = (v) => Math.round(v * 100) / 100;
export function elementSvg(e) {
  const attrs = `stroke="${e.color}" stroke-width="${e.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (["pen", "marker"].includes(e.type)) {
    const points = e.points || [],
      pressure =
        points.reduce((s, p) => s + p.pressure, 0) / Math.max(1, points.length);
    return `<polyline points="${points.map((p) => `${n(p.x)},${n(p.y)}`).join(" ")}" ${attrs} ${e.type === "marker" ? 'opacity=".3"' : `style="stroke-width:${n(e.strokeWidth * (0.5 + pressure))}"`}/>`;
  }
  if (e.type === "text")
    return `<text x="${n(e.x)}" y="${n(e.y)}" fill="${e.color}" font-size="${Math.max(30, e.strokeWidth * 5)}" style="fill:${e.color};font-size:${Math.max(30, e.strokeWidth * 5)}px;stroke:none" font-family="Vazir,Manrope,sans-serif" direction="auto" unicode-bidi="plaintext">${esc(e.text)}</text>`;
  if (e.type === "rectangle")
    return `<rect x="${n(Math.min(e.x, e.x + e.width))}" y="${n(Math.min(e.y, e.y + e.height))}" width="${n(Math.abs(e.width))}" height="${n(Math.abs(e.height))}" rx="4" ${attrs}/>`;
  if (e.type === "ellipse")
    return `<ellipse cx="${n(e.x + e.width / 2)}" cy="${n(e.y + e.height / 2)}" rx="${n(Math.abs(e.width) / 2)}" ry="${n(Math.abs(e.height) / 2)}" ${attrs}/>`;
  const line = `<path d="M${n(e.x)} ${n(e.y)}l${n(e.width)} ${n(e.height)}" ${attrs}/>`;
  if (e.type !== "arrow") return line;
  const angle = Math.atan2(e.height, e.width),
    len = 18 + e.strokeWidth * 2,
    x = e.x + e.width,
    y = e.y + e.height;
  return (
    line +
    `<path d="M${n(x - len * Math.cos(angle - 0.45))} ${n(y - len * Math.sin(angle - 0.45))}L${n(x)} ${n(y)}L${n(x - len * Math.cos(angle + 0.45))} ${n(y - len * Math.sin(angle + 0.45))}" ${attrs}/>`
  );
}
export function drawingSvg(d, preview = false) {
  validateDrawing(d);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.width} ${d.height}" ${preview ? 'aria-hidden="true"' : ""}><rect width="${d.width}" height="${d.height}" fill="#faf9f4"/>${d.elements.map((e) => `<g data-element-id="${e.id}">${elementSvg(e)}</g>`).join("")}</svg>`;
}
export function hitElement(e, p, tolerance = 15) {
  if (e.points)
    return e.points.some(
      (q) =>
        Math.hypot(q.x - p.x, q.y - p.y) < Math.max(tolerance, e.strokeWidth),
    );
  const a = Math.min(e.x, e.x + e.width),
    b = Math.max(e.x, e.x + e.width),
    c = Math.min(e.y, e.y + e.height),
    d = Math.max(e.y, e.y + e.height);
  return e.type === "text"
    ? Math.hypot(p.x - e.x, p.y - e.y) < Math.max(60, e.text.length * 8)
    : p.x >= a - tolerance &&
        p.x <= b + tolerance &&
        p.y >= c - tolerance &&
        p.y <= d + tolerance;
}
export function translateElement(e, dx, dy, d) {
  const points = e.points || [
      { x: e.x, y: e.y },
      { x: e.x + e.width, y: e.y + e.height },
    ],
    xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  dx = Math.max(-Math.min(...xs), Math.min(d.width - Math.max(...xs), dx));
  dy = Math.max(-Math.min(...ys), Math.min(d.height - Math.max(...ys), dy));
  return {
    ...e,
    x: e.x + dx,
    y: e.y + dy,
    ...(e.points
      ? { points: e.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) }
      : {}),
  };
}
