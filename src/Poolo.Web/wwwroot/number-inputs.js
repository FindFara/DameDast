import { getLanguage } from "./i18n.js";
export function plainNumeric(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[,٬\s]/g, "")
    .replace(/٫/g, ".");
}
export function groupedNumeric(value, language = "en") {
  const plain = plainNumeric(value);
  if (!/^[+-]?\d*(?:\.\d*)?$/.test(plain)) return String(value ?? "");
  const [integer, fraction] = plain.split("."),
    sign = /^[+-]/.test(integer) ? integer[0] : "",
    digits = integer.replace(/^[+-]/, ""),
    group = language === "fa" ? "٬" : ",",
    decimal = language === "fa" ? "٫" : ".";
  let result =
    sign +
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, group) +
    (fraction !== undefined ? decimal + fraction : "");
  if (language === "fa")
    result = result.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
  return result;
}
export function numericField(input) {
  return (
    input instanceof HTMLInputElement &&
    input.type === "text" &&
    (["numeric", "decimal"].includes(input.inputMode) ||
      input.classList.contains("money-input"))
  );
}
export function formatNumericField(input) {
  if (!numericField(input)) return;
  const original = input.value,
    caret = input.selectionStart ?? original.length,
    logical = original.slice(0, caret).replace(/[,٬\s]/g, "").length,
    result = groupedNumeric(original, getLanguage());
  if (result === original) return;
  input.value = result;
  let seen = 0,
    index = 0;
  for (; index < result.length && seen < logical; index++)
    if (!/[,٬\s]/.test(result[index])) seen++;
  try {
    input.setSelectionRange(index, index);
  } catch {}
}
export function formatNumericFields(root = document) {
  root.querySelectorAll("input").forEach(formatNumericField);
}
export function installNumericFormatting() {
  document.addEventListener(
    "input",
    (event) => {
      if (numericField(event.target) && !event.isComposing)
        formatNumericField(event.target);
    },
    true,
  );
  document.addEventListener(
    "focusout",
    (event) => {
      if (numericField(event.target)) formatNumericField(event.target);
    },
    true,
  );
}
