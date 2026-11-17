import { escapeHtml as esc, today } from "./finance.js";
import { t } from "./i18n.js";
import { notePdfEditor } from "./note-pdfs.js";

export const isNoteRoute = hash => /^note\/(new|[\da-f-]{36})$/i.test(hash);
const row = item => `<div class="checklist-editor-row" data-note-task="${esc(item.id)}"><input type="checkbox" data-note-done ${item.done ? "checked" : ""} aria-label="${t("Completed")}"><input data-note-text value="${esc(item.text)}" maxlength="200" placeholder="${t("Task")}" aria-label="${t("Task")}"><button type="button" class="icon-button" data-note-action="remove-task" aria-label="${t("Remove task")}">×</button></div>`;

export class NotePageController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.activeKey = null;
    document.addEventListener("input", event => { if (event.target.closest("#note-page-form")) this.capture(); });
    document.addEventListener("change", event => { if (event.target.closest("#note-page-form")) this.capture(); });
    document.addEventListener("submit", event => {
      if (event.target.id !== "note-page-form") return;
      event.preventDefault();
      void this.save().catch(error => this.error(error));
    });
    document.addEventListener("click", event => void this.click(event).catch(error => this.error(error)));
  }
  storageKey() { return `damedast-note-draft:${this.scope}:${this.route}`; }
  deactivate() { this.activeKey = null; this.draft = null; }
  capture() {
    if (this.skipCapture) { this.skipCapture = false; return; }
    const form = document.querySelector("#note-page-form");
    if (!form || !this.draft || form.dataset.noteKey !== this.activeKey) return;
    this.draft = {
      title: form.elements.title.value, body: form.elements.body.value, pinned: form.elements.pinned.checked,
      checklist: [...form.querySelectorAll("[data-note-task]")].map(element => ({
        ...(this.draft.checklist.find(item => item.id === element.dataset.noteTask) || {}),
        id: element.dataset.noteTask, text: element.querySelector("[data-note-text]").value,
        done: element.querySelector("[data-note-done]").checked,
      })),
    };
    try { sessionStorage.setItem(this.storageKey(), JSON.stringify(this.draft)); } catch {}
  }
  open(id = null, preset = null, pickPdf = false) {
    this.capture();
    if (preset) this.preset = preset;
    this.pickPdf = pickPdf;
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
      this.base = context.records.find(record => record.kind === "note" && record.id === route);
      this.draft = null;
      this.id = this.base?.id || crypto.randomUUID();
      if (!this.base && route !== "new") return `<section class="panel empty"><h1>${t("This note is no longer available.")}</h1><a href="#notes">${t("Back to notes")}</a></section>`;
      let stored;
      try { stored = JSON.parse(sessionStorage.getItem(this.storageKey()) || "null"); } catch {}
      const source = this.preset || stored || this.base?.data || {};
      this.draft = { title: source.title || "", body: source.body || "", pinned: !!source.pinned, checklist: structuredClone(source.checklist || []) };
      this.preset = null; this.initializePdfs = true; this.focusOnAttach = true;
    }
    if (!this.draft) return `<section class="panel empty"><h1>${t("This note is no longer available.")}</h1><a href="#notes">${t("Back to notes")}</a></section>`;
    const d = this.draft;
    return `<section class="note-page"><header class="note-page-heading"><a class="secondary" href="#notes">← ${t("Back to notes")}</a><span>${t("Note")}</span><button type="submit" form="note-page-form" class="primary" ${this.saving ? "disabled" : ""}>${t("Save")}</button></header><form id="note-page-form" data-note-key="${esc(this.activeKey)}"><label class="sr-only" for="note-page-title">${t("Title")}</label><input id="note-page-title" name="title" class="note-page-title" placeholder="${t("Title")}" value="${esc(d.title)}" maxlength="80" required dir="auto"><label class="sr-only" for="note-page-body">${t("Content")}</label><textarea id="note-page-body" name="body" class="note-page-body" rows="10" maxlength="4000" placeholder="${t("Take a note…")}" dir="auto">${esc(d.body)}</textarea><div class="checklist-editor-head"><strong>${t("Checklist")}</strong><button type="button" class="text-button" data-note-action="add-task">+ ${t("Add task")}</button></div><div class="note-page-tasks">${d.checklist.map(row).join("")}</div>${notePdfEditor()}<label class="checkbox-field"><input type="checkbox" name="pinned" ${d.pinned ? "checked" : ""}>${t("Pin to dashboard")}</label><div class="note-page-actions"><button type="button" class="secondary" data-note-action="drawing">${t(this.base?.data.drawing || this.base?.data.whiteboardId ? "Open canvas" : "Add drawing")}</button><output id="note-page-status" role="status"></output></div><p id="note-page-error" role="alert"></p></form></section>`;
  }
  attach() {
    const form = document.querySelector("#note-page-form");
    if (!form) return;
    if (this.initializePdfs) { this.callbacks.pdfs.begin(this.base?.data); this.initializePdfs = false; }
    else this.callbacks.pdfs.paintDraft();
    if (this.focusOnAttach) { form.elements.title.focus({ preventScroll: true }); this.focusOnAttach = false; }
    if (this.pickPdf) { this.pickPdf = false; form.querySelector("#note-pdf-input").click(); }
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
      const attachments = await this.callbacks.pdfs.saveAttachments(operation.scope);
      if (operation.scope !== this.callbacks.context().space) throw Error("This record changed. Reopen the form.");
      const data = {
        ...operation.base?.data, ...operation.draft, title: operation.draft.title.trim(), updatedOn: today(),
        checklist: operation.draft.checklist.map(item => ({ ...item, text: item.text.trim() })).filter(item => item.text), attachments,
      };
      await this.callbacks.save(data, operation.id, operation.base?.version || 0);
      try { sessionStorage.removeItem(operation.storageKey); } catch {}
      if (this.activeKey !== operation.key) return;
      this.base = this.callbacks.context().records.find(record => record.id === operation.id);
      this.draft = { title: data.title, body: data.body, pinned: data.pinned, checklist: structuredClone(data.checklist) };
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
  async click(event) {
    const button = event.target.closest("[data-note-action]");
    if (!button || !this.draft) return;
    this.capture();
    if (button.dataset.noteAction === "add-task") {
      if (this.draft.checklist.length >= 50) throw Error("Use up to 50 unique tasks, with text up to 200 characters.");
      const item = { id: crypto.randomUUID(), text: "", done: false };
      this.draft.checklist.push(item);
      document.querySelector(".note-page-tasks").insertAdjacentHTML("beforeend", row(item));
      document.querySelector('.note-page-tasks > :last-child [data-note-text]').focus();
    } else if (button.dataset.noteAction === "remove-task") button.closest("[data-note-task]").remove();
    else if (button.dataset.noteAction === "drawing") { await this.save(); if (this.base) await this.callbacks.drawing(this.id); }
    this.capture();
  }
}
