export const MAX_DESK_IMAGES = 4;
export const MAX_IMAGE_DATA = 120000;
export const toolTypes = ["search", "googleServices", "shortcut", "image", "plainCalendar", "link", "calculator", "keyGenerator", "clock", "pet"];

export function safeLink(value) {
  if (typeof value !== "string" || value.length > 2000 || /[\s\u0000-\u001f\u007f]/.test(value)) throw Error("Enter a valid http or https link.");
  let url;
  try { url = new URL(value); } catch { throw Error("Enter a valid http or https link."); }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password)
    throw Error("Enter a valid http or https link.");
  return url.href;
}
export function validImageData(value) {
  if (typeof value !== "string" || value.length > MAX_IMAGE_DATA) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4) return false;
  try {
    const bytes = atob(match[2]);
    return match[1] === "png" ? bytes.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "jpeg" ? bytes.startsWith("\xff\xd8\xff")
      : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
  } catch { return false; }
}
const optionKeys = {
  search: [], googleServices: [], shortcut: ["page"], image: ["imageData", "description"], plainCalendar: ["calendar"], link: ["url", "description"],
  clock: ["clockStyle", "timeZone"], pet: ["petStyle"], calculator: [], keyGenerator: [],
};
export function validateToolOptions(type, options) {
  if (options == null) return;
  if (!toolTypes.includes(type) || typeof options !== "object" || Array.isArray(options)
    || Object.entries(options).some(([key, value]) => value != null && (!optionKeys[type].includes(key) || typeof value !== "string")))
    throw Error("Invalid component settings.");
  if (options.description != null && (options.description.length > 200 || options.description !== options.description.trim())) throw Error("Invalid component settings.");
  if (options.imageData != null && !validImageData(options.imageData)) throw Error("Choose a PNG, JPEG or WebP image up to 5 MB.");
  if (options.url != null) safeLink(options.url);
  if (options.page != null && !["overview","notes","tasks","calendar","canvas","accounts","transactions","budgets","goals","reminders","assets","market","installments","monthlyPlan","monthlyExpenses","receivables","connected","suggestions","locked","reports","settings"].includes(options.page)) throw Error("Invalid component settings.");
  for (const [key, values] of Object.entries({ calendar: ["persian", "gregory"], clockStyle: ["digital", "analog"], timeZone: ["local", "Asia/Tehran", "UTC"], petStyle: ["dog", "cat", "robot"] }))
    if (options[key] != null && !values.includes(options[key])) throw Error("Invalid component settings.");
}

export async function prepareDeskImage(file) {
  if (!file || file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Choose a PNG, JPEG or WebP image up to 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 24000000) throw Error("Choose an image smaller than 24 megapixels.");
    const canvas = document.createElement("canvas");
    for (const size of [1200, 800, 500]) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [.82, .6, .38]) {
        const data = canvas.toDataURL("image/webp", quality);
        if (validImageData(data)) return data;
      }
    }
    throw Error("This image could not be made small enough. Choose another image.");
  } finally { bitmap.close(); }
}

// A small arithmetic parser: user input is never executed as JavaScript.
export function calculate(expression) {
  const source = String(expression).replace(/[۰-۹]/g, c => "۰۱۲۳۴۵۶۷۸۹".indexOf(c)).replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/٫/g, ".").replace(/×/g, "*").replace(/÷/g, "/");
  if (!source.trim() || source.length > 160) throw Error("Enter a valid calculation.");
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/%\-]|\S/g) || [];
  let index = 0;
  const atom = () => {
    const token = tokens[index++];
    if (token === "+") return atom();
    if (token === "-") return -atom();
    if (token === "(") { const value = sum(); if (tokens[index++] !== ")") throw Error("Enter a valid calculation."); return value; }
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token || "")) throw Error("Enter a valid calculation.");
    return Number(token);
  };
  const product = () => {
    let value = atom();
    while (["*", "/", "%"].includes(tokens[index])) {
      const op = tokens[index++], right = atom();
      if (right === 0 && op !== "*") throw Error("Cannot divide by zero.");
      value = op === "*" ? value * right : op === "/" ? value / right : value % right;
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (["+", "-"].includes(tokens[index])) { const op = tokens[index++], right = product(); value = op === "+" ? value + right : value - right; }
    return value;
  };
  const result = sum();
  if (index !== tokens.length || !Number.isFinite(result) || Math.abs(result) > 1e15) throw Error("Enter a valid calculation.");
  return Number(result.toPrecision(12));
}
export function randomKey(length = 32, format = "base64url", random = globalThis.crypto) {
  if (!Number.isInteger(length) || length < 16 || length > 128 || !["hex", "base64url"].includes(format)) throw Error("Choose a key length from 16 to 128.");
  const alphabet = format === "hex" ? "0123456789abcdef" : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  return [...random.getRandomValues(new Uint8Array(length))].map(byte => alphabet[byte % alphabet.length]).join("");
}
