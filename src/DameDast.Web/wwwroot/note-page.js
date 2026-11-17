import { escapeHtml as esc, today } from "./finance.js";
import { t } from "./i18n.js";
import { textNotes, plainNoteDraft, notePayload } from "./notebook.js";

export const isNoteRoute = hash => /^note\/(new|[\da-f-]{36})$/i.test(hash);


export class NotePageController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.activeKey = null;
    document.addEventListener("input", event => { if (event.target.closest("#note-page-form")) this.capture(); });
    document.addEventListener("submit", event => {
      if (event.target.id !== "note-page-form") return;
      event.preventDefault();
      void this.save().catch(error => this.error(error));
    });
  }
  storageKey() { return `damedast-note-draft:${this.scope}:${this.route}`; }
  deactivate() { this.activeKey = null; this.draft = null; }
  capture() {
    if (this.skipCapture) { this.skipCapture = false; return; }
    const form = document.querySelector("#note-page-form");
    if (!form || !this.draft || form.dataset.noteKey !== this.activeKey) return;
    this.draft = { title: form.elements.title.value, body: form.elements.body.value };
    try { sessionStorage.setItem(this.storageKey(), JSON.stringify(this.draft)); } catch {}
  }
  open(id = null, preset = null) {
    this.capture();
    if (preset) this.preset = plainNoteDraft(preset);
    const route = `note/${id || "new"}`;
    if (location.hash !== `#${route}`) history.pushState(null, "", `#${route}`);
    if (preset) this.activeKey = null;
    this.skipCapture = true;
    this.callbacks.refresh();
  }
  render(context) {
    const route = location.hash.slice(1).split("/")[1], key = `${context.space}:${route}`;
    if (key !== this.activeKey) {
      this.activeKey = key; this.scope = context.space; this.route = route;
      this.base = textNotes(context.records).find(record => record.id === route);
      this.draft = null;
      this.id = this.base?.id || crypto.randomUUID();
      if (!this.base && route !== "new") return `<section class="panel empty"><h1>${t("This note is no longer available.")}</h1><a href="#notes">${t("Back to notes")}</a></section>`;
      let stored;
      try { stored = JSON.parse(sessionStorage.getItem(this.storageKey()) || "null"); } catch {}
      const source = this.preset || stored || this.base?.data || {};
      this.draft = plainNoteDraft(source);
      this.preset = null; this.focusOnAttach = true;
    }
    if (!this.draft) return `<section class="panel empty"><h1>${t("This note is no longer available.")}</h1><a href="#notes">${t("Back to notes")}</a></section>`;
    const d = this.draft;
    return `<section class="note-page"><header class="note-page-heading"><a class="secondary" href="#notes">← ${t("Back to notes")}</a><span>${t("Note")}</span><button type="submit" form="note-page-form" class="primary" ${this.saving ? "disabled" : ""}>${t("Save")}</button></header><form id="note-page-form" data-note-key="${esc(this.activeKey)}"><label class="sr-only" for="note-page-title">${t("Title")}</label><input id="note-page-title" name="title" class="note-page-title" placeholder="${t("Title")}" value="${esc(d.title)}" maxlength="80" required dir="auto"><label class="sr-only" for="note-page-body">${t("Content")}</label><textarea id="note-page-body" name="body" class="note-page-body" rows="10" maxlength="4000" placeholder="${t("Take a note…")}" dir="auto">${esc(d.body)}</textarea><output id="note-page-status" role="status"></output><p id="note-page-error" role="alert"></p></form></section>`;
  }
  attach() {
    const form = document.querySelector("#note-page-form");
    if (!form) return;
    if (this.focusOnAttach) { form.elements.title.focus({ preventScroll: true }); this.focusOnAttach = false; }
  }
  error(error) {
    const target = document.querySelector("#note-page-error");
    if (target) target.textContent = t(error.message);
    else this.callbacks.error(error);
  }
  async save() {
    if (this.saving) return;
    this.capture();
    const form = document.querySelector("#note-page-form");
    if (!form?.reportValidity()) return;
    const operation = { key: this.activeKey, route: location.hash, storageKey: this.storageKey(), scope: this.scope,
      id: this.id, base: this.base, draft: structuredClone(this.draft) };
    this.saving = true;
    form.querySelector("#note-page-error").textContent = "";
    try {
      if (operation.scope !== this.callbacks.context().space) throw Error("This record changed. Reopen the form.");
      const data = notePayload(operation.base?.data, operation.draft, today());
      await this.callbacks.save(data, operation.id, operation.base?.version || 0);
      try { sessionStorage.removeItem(operation.storageKey); } catch {}
      if (this.activeKey !== operation.key) return;
      this.base = this.callbacks.context().records.find(record => record.id === operation.id);
      this.draft = plainNoteDraft(data);
      if (location.hash !== operation.route) return;
      this.route = this.id; this.activeKey = `${this.scope}:${this.id}`;
      history.replaceState(null, "", `#note/${this.id}`);
      this.skipCapture = true;
      this.callbacks.refresh();
      const status = document.querySelector("#note-page-status");
      if (status) status.textContent = t("Saved.");
    } finally {
      this.saving = false;
      document.querySelector('.note-page-heading button[type="submit"]')?.removeAttribute("disabled");
    }
  }
}
