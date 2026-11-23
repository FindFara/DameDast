import { t } from "./i18n.js";

// Bundled vector marks keep the launcher available without third-party image requests.
const marks = {
  google: '<path fill="#4285f4" d="M22 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.6a4.8 4.8 0 0 1-2.1 3.2v2.6h3.4c2-1.8 3.1-4.5 3.1-7.7Z"/><path fill="#34a853" d="M12 22c2.8 0 5.1-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1.9-3.5.9a6 6 0 0 1-5.7-4.2H2.8v2.7A10.4 10.4 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.3 13.6a6.3 6.3 0 0 1 0-3.2V7.7H2.8a10 10 0 0 0 0 8.6l3.5-2.7Z"/><path fill="#ea4335" d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10.4 10.4 0 0 0-9.2 5.7l3.5 2.7A6 6 0 0 1 12 6.2Z"/>',
  gmail: '<path fill="#4285f4" d="M2 5h4v14H3a1 1 0 0 1-1-1Z"/><path fill="#34a853" d="M18 5h4v13a1 1 0 0 1-1 1h-3Z"/><path fill="#ea4335" d="m2 5 3-2 7 5 7-5 3 2-10 8Z"/><path fill="#fbbc04" d="m18 4 4 1v6l-4 3Z"/><path fill="#c5221f" d="M2 5v6l4 3V4L5 3Z"/>',
  drive: '<path fill="#34a853" d="m9 2 4 7-7 12-4-7Z"/><path fill="#fbbc04" d="m9 2 7 0 7 12-8 0Z"/><path fill="#4285f4" d="m2 14 6 0 8 0 7 0-4 7H6Z"/><path fill="#188038" d="m2 14 4 7 4-7Z"/><path fill="#ea4335" d="m16 2-3 7 3 5h7Z"/>',
  calendar: '<rect x="3" y="3" width="18" height="18" rx="3" fill="#4285f4"/><path fill="#34a853" d="M17 3h4v14h-4Z"/><path fill="#fbbc04" d="M3 17h14v4H3Z"/><path fill="#ea4335" d="M17 17h4l-4 4Z"/><path fill="#fff" d="M7 7h10v10H7Z"/><text x="12" y="14.2" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" font-weight="700" fill="#4285f4">31</text>',
  meet: '<path fill="#34a853" d="M6 5h10v14H6Z"/><path fill="#00832d" d="m16 9 6-4v14l-6-4Z"/><path fill="#fbbc04" d="M2 5h7v7H2Z"/><path fill="#4285f4" d="M2 12h7v7H4a2 2 0 0 1-2-2Z"/><path fill="#ea4335" d="M2 5h7l-7 7Z"/>',
  docs: '<path fill="#4285f4" d="M5 2h10l5 5v15H5Z"/><path fill="#a1c2fa" d="M15 2v5h5Z"/><path fill="#fff" d="M8 10h9v1.5H8Zm0 4h9v1.5H8Zm0 4h6v1.5H8Z"/>',
  sheets: '<path fill="#34a853" d="M5 2h10l5 5v15H5Z"/><path fill="#a8dab5" d="M15 2v5h5Z"/><path fill="#fff" d="M8 10h9v9H8Zm1.5 1.5V14h2v-2.5Zm3.5 0V14h2.5v-2.5ZM9.5 15.5v2h2v-2Zm3.5 0v2h2.5v-2Z"/>',
  translate: '<path fill="#4285f4" d="M2 3h11l3 15H4Z"/><path fill="#e8eaed" d="M11 6h11v15H14Z"/><path fill="#5f6368" d="m15 11-3 8h1.6l.6-1.8h3l.6 1.8H20l-3-8Zm.3 4.8 1-2.8 1 2.8Z"/><path fill="#fff" d="M5 7h7v1.4H9.5a9 9 0 0 1-1 3.2l2 1.3-.7 1.2-2.1-1.4-2 1.5-.8-1.2 1.9-1.4a8 8 0 0 1-1.1-2h1.5l.5.9.5-2.1H5Zm2-2h1.5v2H7Z"/>',
};

export const googleServices = Object.freeze([
  { id: "gmail", name: "Gmail", url: "https://mail.google.com/" },
  { id: "drive", name: "Google Drive", url: "https://drive.google.com/" },
  { id: "calendar", name: "Google Calendar", url: "https://calendar.google.com/" },
  { id: "meet", name: "Google Meet", url: "https://meet.google.com/" },
  { id: "docs", name: "Google Docs", url: "https://docs.google.com/document/" },
  { id: "sheets", name: "Google Sheets", url: "https://docs.google.com/spreadsheets/" },
  { id: "translate", name: "Google Translate", url: "https://translate.google.com/" },
  { id: "google", name: "Google search", url: "https://www.google.com/" },
].map(Object.freeze));

export function googleServiceIcon(id) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${marks[id] || marks.google}</svg>`;
}

export function googleServicesMarkup() {
  return `<nav class="desk-google-services" aria-label="${t("Google services")}">${googleServices.map(service =>
    `<a href="${service.url}" target="_blank" rel="noopener noreferrer" title="${t(service.name)} · ${t("Opens in a new tab")}"><span class="desk-service-icon">${googleServiceIcon(service.id)}</span><span>${t(service.name)}</span></a>`
  ).join("")}</nav>`;
}
