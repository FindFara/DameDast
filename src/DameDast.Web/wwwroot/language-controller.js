import { t } from "./i18n.js";
import { today, escapeHtml as esc } from "./finance.js";
import { shiftDay } from "./planner.js";
import {
  dailyVocabulary,
  validateLanguage,
  parseWordLines,
  rebaseCorrections,
  reviewedEssay,
  usedWords,
  wordCount,
} from "./language-model.js";
import {
  renderLanguagePage,
  tr,
  langButton,
  wordChips,
  correctionList,
} from "./language-ui.js";
import { renderMarkdown } from "./language-markdown.js";

export class LanguageController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.date = today();
    this.search = "";
    this.active = null;
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lang-action]");
      if (button) void this.action(button).catch((error) => this.error(error));
    });
    document.addEventListener("input", (event) => this.input(event));
    document.addEventListener("change", (event) => {
      if (event.target.matches("[data-language-file]"))
        void this.importFiles([...event.target.files]).catch((error) =>
          this.error(error),
        );
      if (event.target.name === "language-day") {
        this.date = event.target.value;
        this.callbacks.refresh();
      }
    });
    document.addEventListener("submit", (event) => {
      if (event.target.matches("[data-language-form]")) {
        event.preventDefault();
        void this.save().catch((error) => this.error(error));
      }
    });
    window.addEventListener("beforeunload", () => this.capture());
  }
  render(c) {
    return renderLanguagePage(c, this);
  }
  capture() {
    const a = this.active;
    if (!a || a.mode === "read" || !this.dialog?.open) return;
    const form = this.dialog.querySelector("form");
    if (!form) return;
    if (a.kind === "languageEssay") {
      const next = form.elements.body.value;
      a.data.corrections = rebaseCorrections(
        a.data.body,
        next,
        a.data.corrections,
      );
      if (a.pending)
        a.pending = rebaseCorrections(a.data.body, next, [a.pending])[0];
      a.data.body = next;
      a.data.title = form.elements.title.value.trim();
      a.data.reviewed = form.elements.reviewed.checked;
      if (a.pending) {
        a.pending.replacement =
          form.elements.replacement?.value ?? a.pending.replacement ?? "";
        a.pending.explanation =
          form.elements.explanation?.value ?? a.pending.explanation ?? "";
      }
    } else if (a.kind === "languageVocabulary") {
      a.data.title = form.elements.title.value.trim();
      a.data.topic = form.elements.topic.value;
      a.wordLines = form.elements.words.value;
    } else {
      a.data.title = form.elements.title.value.trim();
      a.data.markdown = form.elements.markdown.value;
    }
    try {
      localStorage.setItem(
        a.key,
        JSON.stringify({
          id: a.id,
          version: a.version,
          data: a.data,
          vocabulary: a.vocabulary,
          wordLines: a.wordLines,
          pending: a.pending,
        }),
      );
    } catch {
      this.status(
        tr(
          "Draft could not be saved on this device. Keep this window open until saving succeeds.",
          "پیش‌نویس روی دستگاه ذخیره نشد؛ تا ذخیرهٔ موفق این پنجره را باز نگه دار.",
        ),
        true,
      );
    }
    if (a.space !== this.callbacks.context().space) this.dialog.close();
  }
  input(event) {
    if (event.target.matches("[data-language-search]")) {
      this.search = event.target.value;
      this.filterLessons();
      return;
    }
    if (event.target.closest("[data-language-form]")) {
      this.capture();
      this.updateEssay();
    }
  }
  filterLessons() {
    const c = this.callbacks.context(),
      query = this.search.trim().toLowerCase();
    let count = 0;
    for (const card of document.querySelectorAll("[data-lesson-card]")) {
      const r = c.records.find((r) => r.id === card.dataset.lessonCard);
      card.hidden = !`${r?.data.title} ${r?.data.markdown}`
        .toLowerCase()
        .includes(query);
      if (!card.hidden) count++;
    }
    const empty = document.querySelector("[data-lessons-no-results]");
    if (empty) empty.hidden = count > 0 || !query;
  }
  async action(button) {
    const action = button.dataset.langAction,
      c = this.callbacks.context();
    if (
      action === "previous-day" ||
      action === "next-day" ||
      action === "today" ||
      action === "select-day"
    ) {
      this.date =
        action === "today"
          ? today()
          : action === "select-day"
            ? button.dataset.date
            : shiftDay(this.date, action === "previous-day" ? -1 : 1);
      this.callbacks.refresh();
      return;
    }
    if (action === "import") {
      document.querySelector("[data-language-file]")?.click();
      return;
    }
    if (action === "new-essay") {
      this.openEssay(this.date, button);
      return;
    }
    if (action === "open-essay") {
      const r = c.records.find((r) => r.id === button.dataset.id);
      if (r) this.openEssay(r.data.date, button);
      return;
    }
    if (action === "edit-vocabulary") {
      this.openVocabulary(button);
      return;
    }
    if (action === "read-words") {
      const r = dailyVocabulary(c.records, this.date);
      await this.callbacks.save(
        "languageVocabulary",
        { ...r.data, read: !r.data.read },
        r.id || crypto.randomUUID(),
        false,
        r.version,
        c.space,
      );
      return;
    }
    if (action === "read-lesson" || action === "edit-lesson") {
      const r = c.records.find((r) => r.id === button.dataset.id);
      if (r) this.openLesson(r, action === "read-lesson", button);
      return;
    }
    if (action === "close") {
      if (!this.saving) {
        this.capture();
        this.dialog.close();
      }
      return;
    }
    if (action === "write-mode" || action === "review-mode") {
      this.setEssayMode(action === "review-mode");
      return;
    }
    if (action === "mark-error") {
      this.markError();
      return;
    }
    if (action === "cancel-correction") {
      this.active.pending = null;
      this.renderPending();
      this.capture();
      return;
    }
    if (action === "add-correction") {
      this.addCorrection();
      return;
    }
    if (action === "remove-correction") {
      this.active.data.corrections = this.active.data.corrections.filter(
        (x) => x.id !== button.dataset.correction,
      );
      this.capture();
      this.updateEssay();
      return;
    }
    if (action === "download-lesson") {
      const r = c.records.find((r) => r.id === button.dataset.id);
      if (r) {
        const url = URL.createObjectURL(
            new Blob([r.data.markdown], {
              type: "text/markdown;charset=utf-8",
            }),
          ),
          link = document.createElement("a");
        link.href = url;
        link.download = r.data.fileName || `${r.data.title}.md`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      return;
    }
  }
  restoreDraft(a) {
    a.key = `damedast-language-draft:${encodeURIComponent(a.space)}:${a.kind}:${a.kind === "languageLesson" ? a.id : a.data.date}`;
    try {
      const saved = JSON.parse(localStorage.getItem(a.key) || "null");
      if (saved && saved.data && saved.id) {
        Object.assign(a, saved);
      }
    } catch {}
    return a;
  }
  openEssay(date, opener) {
    const c = this.callbacks.context(),
      record = c.records.find(
        (r) => !r.deleted && r.kind === "languageEssay" && r.data.date === date,
      ),
      vocabulary = dailyVocabulary(c.records, date);
    const a = this.restoreDraft({
      kind: "languageEssay",
      id: record?.id || crypto.randomUUID(),
      version: record?.version || 0,
      space: c.space,
      vocabulary: {
        ...structuredClone(vocabulary),
        id: record?.data.vocabularyId || vocabulary.id || crypto.randomUUID(),
      },
      data: record
        ? structuredClone(record.data)
        : {
            date,
            title: "",
            body: "",
            vocabularyId: vocabulary.id || null,
            assignedWords: structuredClone(vocabulary.data.words),
            corrections: [],
            reviewed: false,
          },
    });
    a.data.vocabularyId = a.vocabulary.id;
    this.show(
      a,
      `<div class="language-editor-assignment"><strong dir="ltr">${esc(a.vocabulary.data.title)}</strong><p dir="ltr">${esc(a.vocabulary.data.topic)}</p><div class="language-word-chips" data-editor-words></div></div><label class="field">${tr("Title (optional)", "عنوان (اختیاری)")}<input name="title" dir="auto" maxlength="120" value="${esc(a.data.title)}"></label><div class="language-editor-mode">${langButton("write-mode", tr("Write", "نوشتن"))}${langButton("review-mode", tr("Review", "بازبینی"))}<span data-language-count></span></div><label class="field" data-essay-write>${tr("Essay text", "متن انشا")}<textarea name="body" required dir="ltr" lang="en" maxlength="20000" rows="10" placeholder="${tr("Use today’s words in your own sentences…", "با کلمات امروز جمله‌های خودت را بنویس…")}">${esc(a.data.body)}</textarea></label><div class="language-reviewed-text" data-essay-review dir="auto" hidden></div><div class="language-review-tools">${langButton("mark-error", tr("Mark selected mistake", "علامت‌زدن اشتباه انتخاب‌شده"))}<small>${tr("Select a wrong word or phrase in the writing box, then add its correction.", "کلمه یا عبارت اشتباه را در کادر نوشتن انتخاب کن، سپس اصلاحش را اضافه کن.")}</small></div><div data-pending-correction></div><section class="language-corrections"><h3>${tr("My corrections", "اصلاحات من")}</h3><div data-corrections></div></section><label class="language-check"><input type="checkbox" name="reviewed" ${a.data.reviewed ? "checked" : ""}>${tr("I have reviewed this essay", "این انشا را بازبینی کردم")}</label>`,
      tr("Daily essay", "انشای روزانه"),
      opener,
    );
    this.renderPending();
    this.updateEssay();
    this.setEssayMode(a.data.reviewed);
  }
  openVocabulary(opener) {
    const c = this.callbacks.context(),
      r = dailyVocabulary(c.records, this.date),
      a = this.restoreDraft({
        kind: "languageVocabulary",
        id: r.id || crypto.randomUUID(),
        version: r.version,
        space: c.space,
        data: structuredClone(r.data),
        wordLines: r.data.words
          .map((w) => `${w.term} | ${w.meaning} | ${w.example}`)
          .join("\n"),
      });
    this.show(
      a,
      `<label class="field">${tr("Title", "عنوان")}<input name="title" maxlength="120" dir="auto" required value="${esc(a.data.title)}"></label><label class="field">${tr("Essay topic", "موضوع انشا")}<textarea name="topic" dir="ltr" maxlength="300" required>${esc(a.data.topic)}</textarea></label><label class="field">${tr("One word per line: word | meaning | example", "هر کلمه در یک خط: کلمه | معنی | مثال")}<textarea name="words" dir="ltr" rows="12" required>${esc(a.wordLines)}</textarea></label><p class="small-note">${tr("Use 1–30 unique words. Previously written essays keep their original word assignment.", "بین ۱ تا ۳۰ کلمهٔ غیرتکراری وارد کن. انشاهای قبلی کلمات زمان نوشتنشان را حفظ می‌کنند.")}</p>`,
      tr("Daily words", "کلمات روز"),
      opener,
    );
  }
  openLesson(r, read, opener) {
    const c = this.callbacks.context(),
      a = read
        ? {
            kind: r.kind,
            id: r.id,
            version: r.version,
            space: c.space,
            data: r.data,
            mode: "read",
          }
        : this.restoreDraft({
            kind: r.kind,
            id: r.id,
            version: r.version,
            space: c.space,
            data: structuredClone(r.data),
          });
    this.show(
      a,
      read
        ? `<article class="language-markdown">${renderMarkdown(r.data.markdown)}</article>`
        : `<label class="field">${tr("Title", "عنوان")}<input name="title" maxlength="120" dir="auto" required value="${esc(a.data.title)}"></label><label class="field">Markdown<textarea name="markdown" dir="auto" rows="16" maxlength="200000" required>${esc(a.data.markdown)}</textarea></label>`,
      a.data.title,
      opener,
    );
  }
  show(a, content, title, opener) {
    if (this.active) this.capture();
    if (!this.dialog) {
      this.dialog = document.createElement("dialog");
      this.dialog.className = "language-dialog";
      this.dialog.setAttribute("aria-labelledby", "language-dialog-title");
      document.body.append(this.dialog);
      this.dialog.addEventListener("close", () => {
        if (this.dialog.open) return;
        this.active = null;
        if (this.opener?.isConnected) this.opener.focus();
        else document.querySelector(".page-toolbar-toggle")?.focus();
      });
      this.dialog.addEventListener("cancel", (event) => {
        if (this.saving) event.preventDefault();
        else this.capture();
      });
      this.dialog.addEventListener("click", (event) => {
        if (event.target === this.dialog && !this.saving) {
          this.capture();
          this.dialog.close();
        }
      });
    }
    this.active = a;
    this.opener = opener;
    this.dialog.innerHTML = `<form data-language-form><header class="dialog-heading"><h2 id="language-dialog-title" dir="auto">${esc(title)}</h2>${langButton("close", "×", `aria-label="${t("Close")}"`, "icon-button")}</header><div class="language-dialog-body">${content}</div><footer class="language-dialog-footer"><span class="language-save-status" role="status">${a.mode === "read" ? "" : tr("Draft kept on this device until you save.", "پیش‌نویس تا زمان ذخیره روی این دستگاه حفظ می‌شود.")}</span><div class="language-row-actions">${a.mode === "read" ? langButton("download-lesson", tr("Download Markdown", "دریافت Markdown"), `data-id="${a.id}"`) : `<button type="submit" class="primary">${t("Save")}</button>`}${langButton("close", t("Close"), "", "secondary")}</div></footer></form>`;
    if (!this.dialog.open) this.dialog.showModal();
  }
  status(message, error = false) {
    const el = this.dialog?.querySelector(".language-save-status");
    if (el) {
      el.textContent = message;
      el.classList.toggle("negative", error);
    }
  }
  error(error) {
    if (this.dialog?.open) this.status(t(error.message), true);
    else this.callbacks.error(error);
  }
  updateEssay() {
    const a = this.active;
    if (!a || a.kind !== "languageEssay" || !this.dialog?.open) return;
    this.dialog.querySelector("[data-editor-words]").innerHTML = wordChips(
      a.data.assignedWords,
      a.data.body,
    );
    this.dialog.querySelector("[data-language-count]").textContent =
      `${wordCount(a.data.body)} ${tr("words", "کلمه")} · ${usedWords(a.data.body, a.data.assignedWords).length}/${a.data.assignedWords.length} ${tr("practice words used", "کلمهٔ تمرین استفاده شده")}`;
    this.dialog.querySelector("[data-essay-review]").innerHTML =
      reviewedEssay(a.data.body, a.data.corrections) ||
      tr("Start writing first.", "ابتدا متن انشا را بنویس.");
    this.dialog.querySelector("[data-corrections]").innerHTML =
      correctionList(a.data.corrections, true) ||
      `<p class="small-note">${tr("Corrections appear here below the essay.", "اصلاحات زیر انشا اینجا نمایش داده می‌شوند.")}</p>`;
  }
  setEssayMode(review) {
    this.dialog.querySelector("[data-essay-write]").hidden = review;
    this.dialog.querySelector("[data-essay-review]").hidden = !review;
    this.dialog.querySelector('[data-lang-action="mark-error"]').disabled =
      review;
    for (const b of this.dialog.querySelectorAll('[data-lang-action$="-mode"]'))
      b.setAttribute(
        "aria-pressed",
        String((b.dataset.langAction === "review-mode") === review),
      );
  }
  markError() {
    const area = this.dialog.querySelector('[name="body"]'),
      start = area.selectionStart,
      end = area.selectionEnd;
    this.capture();
    if (
      start === end ||
      end - start > 2000 ||
      this.active.data.corrections.some(
        (c) => c.start != null && start < c.end && end > c.start,
      )
    )
      throw Error("Select a different part of the essay.");
    this.active.pending = {
      id: crypto.randomUUID(),
      start,
      end,
      original: area.value.slice(start, end),
      replacement: "",
      explanation: "",
    };
    this.renderPending();
    this.capture();
  }
  renderPending() {
    const p = this.active.pending,
      slot = this.dialog.querySelector("[data-pending-correction]");
    slot.innerHTML = p
      ? `<div class="panel language-correction-form"><blockquote class="language-error" dir="auto">${esc(p.original)}</blockquote><label class="field">${tr("Correct version", "شکل درست")}<input name="replacement" dir="auto" maxlength="2000" value="${esc(p.replacement)}"></label><label class="field">${tr("Why was it wrong? (optional)", "دلیل اشتباه (اختیاری)")}<textarea name="explanation" dir="auto" maxlength="1000">${esc(p.explanation)}</textarea></label><div class="language-row-actions">${langButton("add-correction", tr("Add correction", "ثبت اصلاح"), "", "primary")}${langButton("cancel-correction", t("Cancel"))}</div></div>`
      : "";
    if (p) slot.querySelector("input").focus();
  }
  addCorrection() {
    this.capture();
    const p = this.active.pending;
    if (!p?.replacement.trim())
      throw Error("Enter the correction for the selected text.");
    this.active.data.corrections.push(p);
    this.active.pending = null;
    this.renderPending();
    this.capture();
    this.updateEssay();
    this.setEssayMode(true);
  }
  async save() {
    if (this.saving) return;
    this.capture();
    const a = this.active;
    if (!a || a.mode === "read") return;
    if (a.pending)
      throw Error("Finish or cancel the pending correction first.");
    if (a.kind === "languageVocabulary")
      a.data.words = parseWordLines(a.wordLines);
    this.saving = true;
    this.status(tr("Saving…", "در حال ذخیره…"));
    const form = this.dialog.querySelector("form");
    for (const el of form.querySelectorAll("input,textarea,button"))
      el.disabled = true;
    try {
      if (a.kind === "languageEssay") {
        const c = this.callbacks.context(),
          pack = c.records.find(
            (r) =>
              !r.deleted &&
              r.kind === "languageVocabulary" &&
              r.data.date === a.data.date,
          );
        if (!pack)
          await this.callbacks.save(
            "languageVocabulary",
            a.vocabulary.data,
            a.vocabulary.id,
            false,
            0,
            a.space,
          );
        else if (pack.id !== a.data.vocabularyId)
          throw Error("The assigned words changed. Reopen the essay.");
      }
      validateLanguage(a.kind, a.data, this.callbacks.context().records, a.id);
      await this.callbacks.save(
        a.kind,
        a.data,
        a.id,
        false,
        a.version,
        a.space,
      );
      localStorage.removeItem(a.key);
      this.active = null;
      this.dialog.close();
    } finally {
      this.saving = false;
      for (const el of form.querySelectorAll("input,textarea,button"))
        el.disabled = false;
    }
  }
  async importFiles(files) {
    if (files.length > 10)
      throw Error("Import up to 10 Markdown files at a time.");
    const scope = this.callbacks.context().space;
    let last;
    for (const file of files) {
      if (!/\.(md|markdown)$/i.test(file.name) || file.size > 200000)
        throw Error("Choose a Markdown file under 200 KB.");
      const markdown = (await file.text()).replace(/^\uFEFF/, "");
      const title = (
        /^#\s+(.+)$/m.exec(markdown)?.[1] ||
        file.name.replace(/\.(md|markdown)$/i, "")
      ).slice(0, 120);
      const data = { title, markdown, fileName: file.name };
      validateLanguage("languageLesson", data);
      const id = crypto.randomUUID();
      await this.callbacks.save("languageLesson", data, id, false, 0, scope);
      last = id;
    }
    const r = this.callbacks.context().records.find((r) => r.id === last);
    if (r) this.openLesson(r, true, null);
  }
}
