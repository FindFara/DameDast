export function normalizeCardNumber(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
    .replace(/[\s-]/g, "");
}

export function parseCardNumber(value) {
  const digits = normalizeCardNumber(value);
  if (digits && !/^\d{16}$/.test(digits))
    throw Error("Enter a 16-digit card number.");
  return digits;
}

export function formatCardNumber(value) {
  const digits = normalizeCardNumber(value);
  return /^\d{16}$/.test(digits) ? digits.match(/.{4}/g).join(" ") : "";
}
