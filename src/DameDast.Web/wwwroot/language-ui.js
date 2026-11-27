import { t, getLanguage, localizedNumber } from "./i18n.js";
import { escapeHtml as esc, today, dateText } from "./finance.js";
import { dateControl } from "./calendar.js";
import {
  dailyVocabulary,
  usedWords,
  wordCount,
  reviewedEssay,
} from "./language-model.js";
export const tr = (en, fa) => (getLanguage() === "fa" ? fa : en);
const n = localizedNumber;
export const langButton = (action, label, extra = "", style = "secondary") =>
  `<button type="button" class="${style}" data-lang-action="${action}" ${extra}>${label}</button>`;
export function wordChips(words, body = "") {
  const used = new Set(usedWords(body, words));
  return words
    .map(
      (w) =>
        `<span class="language-word-chip ${used.has(w.term) ? "is-used" : ""}" title="${esc(w.meaning)}"><bdi dir="ltr">${esc(w.term)}</bdi>${used.has(w.term) ? " ✓" : ""}</span>`,
    )
    .join("");
}
export function correctionList(corrections, editable = false) {
  return corrections
    .map(
      (c) =>
        `<article class="language-correction"><div><del dir="auto">${esc(c.original)}</del><strong dir="auto">${esc(c.replacement)}</strong>${c.explanation ? `<p dir="auto">${esc(c.explanation)}</p>` : ""}${c.start == null ? `<small>${tr("The text was edited; this correction is kept here.", "متن تغییر کرده؛ این اصلاح در فهرست حفظ شده است.")}</small>` : ""}</div>${editable ? langButton("remove-correction", tr("Remove", "برداشتن"), `data-correction="${c.id}"`, "text-button") : ""}</article>`,
    )
    .join("");
}
export function renderLanguagePage(c, ui) {
  const page = c.page,
    date = ui.date || today(),
    pack = dailyVocabulary(c.records, date),
    essay = c.records.find(
      (r) => !r.deleted && r.kind === "languageEssay" && r.data.date === date,
    );
  const headings = {
    languageEssays: "Daily essays",
    languageLessons: "Lesson notes",
    languageVocabulary: "Daily vocabulary",
  };
  const action =
    page === "languageLessons"
      ? langButton(
          "import",
          tr("Import Markdown", "ورود Markdown"),
          "",
          "primary",
        )
      : page === "languageVocabulary"
        ? langButton(
            "edit-vocabulary",
            tr(pack.id ? "Edit daily words" : "Add words", pack.id ? "ویرایش کلمات روز" : "افزودن کلمات"),
            "",
            "primary",
          )
        : langButton(
            "new-essay",
            tr(
              essay ? "Open essay" : "Write an essay",
              essay ? "بازکردن انشا" : "نوشتن انشا",
            ),
            "",
            "primary",
          );
  const tabs = Object.entries(headings)
    .map(
      ([key, label]) =>
        `<a href="#${key}" ${key === page ? 'aria-current="page"' : ""}>${t(label)}</a>`,
    )
    .join("");
  const heading = `<section class="language-page" data-language-page><div class="page-heading"><h1>${t(headings[page])}</h1><div class="heading-actions">${action}</div></div><nav class="language-tabs" aria-label="${t("Language")}">${tabs}</nav>`;
  if (page === "languageLessons") {
    const lessons = c.records.filter(
      (r) => !r.deleted && r.kind === "languageLesson",
    );
    return (
      heading +
      `<div class="language-tools"><input type="search" data-language-search aria-label="${tr("Search lessons", "جست‌وجوی جزوه‌ها")}" placeholder="${tr("Search lessons", "جست‌وجوی جزوه‌ها")}" value="${esc(ui.search || "")}"><input type="file" data-language-file accept=".md,.markdown,text/markdown,text/plain" multiple hidden></div><div class="language-lessons-list">${lessons.map((r) => `<article class="panel language-lesson-card" data-lesson-card="${r.id}"><span class="language-file-badge" aria-hidden="true">MD</span><div><h2 dir="auto">${esc(r.data.title)}</h2><small dir="auto">${esc(r.data.fileName)}</small></div><div class="language-row-actions">${langButton("read-lesson", tr("Read", "خواندن"), `data-id="${r.id}"`)}${langButton("edit-lesson", tr("Edit", "ویرایش"), `data-id="${r.id}"`, "text-button")}</div></article>`).join("")}</div><div class="panel language-empty" data-lessons-empty ${lessons.length ? "hidden" : ""}>${tr("No lessons yet.", "هنوز جزوه‌ای نیست.")}${langButton("import", tr("Import Markdown", "ورود Markdown"))}</div><p class="small-note" data-lessons-no-results hidden>${tr("No matching lessons.", "جزوه‌ای پیدا نشد.")}</p></section>`
    );
  }
  const daybar = `<div class="language-daybar">${langButton("previous-day", "‹", `aria-label="${tr("Previous day", "روز قبل")}"`, "icon-button")}${dateControl("Practice date", "language-day", date, true)}${langButton("next-day", "›", `aria-label="${tr("Next day", "روز بعد")}"`, "icon-button")}${langButton("today", tr("Today", "امروز"), "", "text-button")}</div>`;
  if (page === "languageVocabulary" && !pack.id)
    return heading + daybar + `<section class="panel language-empty"><p>${tr("No words entered yet.", "هنوز کلمه‌ای وارد نشده.")}</p>${langButton("edit-vocabulary", tr("Add words", "افزودن کلمات"), "", "primary")}</section></section>`;
  if (page === "languageVocabulary")
    return (
      heading +
      daybar +
      `<section class="panel language-assignment"><div><h2 dir="ltr">${esc(pack.data.title)}</h2><p dir="ltr">${esc(pack.data.topic)}</p></div><div class="language-row-actions">${langButton("read-words", tr(pack.data.read ? "Read today ✓" : "Mark as read", pack.data.read ? "امروز خواندم ✓" : "خواندم"), `aria-pressed="${pack.data.read}"`)}${langButton("new-essay", tr(essay ? "Open essay" : "Write with these words", essay ? "بازکردن انشا" : "انشا با این کلمات"), "", "primary")}</div></section>${vocabularySections(pack.data.words, essay?.data.body || "")}</section>`
    );
  const entries = c.records
    .filter((r) => !r.deleted && r.kind === "languageEssay")
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 6 + i);
    const key = d.toISOString().slice(0, 10),
      row = entries.find((r) => r.data.date === key);
    return langButton(
      "select-day",
      `${dateText(key)}<span aria-hidden="true">${row ? (row.data.reviewed ? "✓" : "✎") : "—"}</span>`,
      `data-date="${key}" aria-label="${dateText(key)} · ${row ? (row.data.reviewed ? tr("Reviewed", "بازبینی شده") : tr("To review", "نیازمند بازبینی")) : tr("No essay", "بدون انشا")}" ${key === date ? 'aria-current="date"' : ""}`,
      `language-day-status ${row ? (row.data.reviewed ? "is-reviewed" : "is-written") : ""}`,
    );
  }).join("");
  return (
    heading +
    daybar +
    `<div class="language-week" aria-label="${tr("Seven-day practice", "تمرین هفت روز")}">${days}</div>${!pack.id ? `<section class="panel language-assignment"><span>${tr("Add this day's words first.", "اول کلمات این روز را وارد کن.")}</span>${langButton("edit-vocabulary", tr("Add words", "افزودن کلمات"), "", "primary")}</section>` : `<section class="panel language-assignment"><div><h2 dir="ltr">${esc(pack.data.title)}</h2><p dir="ltr">${esc(pack.data.topic)}</p><div class="language-word-chips">${wordChips(essay?.data.assignedWords || pack.data.words, essay?.data.body || "")}</div></div>${langButton("new-essay", tr(essay ? "Open essay" : "Write essay", essay ? "بازکردن انشا" : "نوشتن انشا"), "", "primary")}</section>`}<div class="language-essay-list">${entries.map((r) => `<article class="panel language-essay-card"><header><time datetime="${r.data.date}">${dateText(r.data.date, true)}</time><span class="badge ${r.data.reviewed ? "is-reviewed" : "is-written"}">${r.data.reviewed ? tr("Reviewed", "بازبینی شده") : tr("To review", "نیازمند بازبینی")}</span></header><h2 dir="auto">${esc(r.data.title || dailyVocabulary(c.records, r.data.date).data.title)}</h2><div class="language-essay-preview" dir="auto">${reviewedEssay(r.data.body, r.data.corrections)}</div><footer><span>${n(wordCount(r.data.body))} ${tr("words", "کلمه")} · ${n(usedWords(r.data.body, r.data.assignedWords).length)}/${n(r.data.assignedWords.length)} ${tr("assigned words", "کلمهٔ تمرین")}</span>${langButton("open-essay", tr("Open", "بازکردن"), `data-id="${r.id}"`, "text-button")}</footer></article>`).join("") || `<section class="panel language-empty">${tr("No essays yet.", "هنوز انشایی نیست.")}</section>`}</div></section>`
  );
}

export function vocabularySections(words, body = "") {
  const used = new Set(usedWords(body, words));
  return `<div class="language-word-sections">${Array.from({length: Math.ceil(words.length / 10)}, (_, group) => {
    const start = group * 10, chunk = words.slice(start, start + 10);
    const label = `${tr("Words", "کلمات")} ${n(start + 1)}${chunk.length > 1 ? "–" + n(start + chunk.length) : ""}`;
    return `<section class="panel language-word-section"><h2>${label}</h2><table><caption class="sr-only">${label}</caption><colgroup><col class="word-term-column"><col class="word-meaning-column"><col></colgroup><thead><tr><th scope="col">${tr("Word", "کلمه")}</th><th scope="col">${tr("Meaning", "معنی")}</th><th scope="col">${tr("Example", "جمله")}</th></tr></thead><tbody>${chunk.map(w => `<tr><th scope="row" dir="ltr">${esc(w.term)}${used.has(w.term) ? ' <span aria-label="'+tr("Used", "استفاده شده")+'">✓</span>' : ''}</th><td dir="auto">${esc(w.meaning)}</td><td dir="ltr">${esc(w.example)}</td></tr>`).join("")}</tbody></table></section>`;
  }).join("")}</div>`;
}
