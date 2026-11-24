import { escapeHtml as esc, today } from "./finance.js";
import { t } from "./i18n.js";
import { textNotes, plainNoteDraft, notePayload } from "./notebook.js";
import { projectField } from "./productivity-ui.js";
import { slashCommands, insertNoteBlock, renderNoteBlocks } from "./note-blocks.js";

export const isNoteRoute = hash => /^note\/(new|[\da-f-]{36})$/i.test(hash);
export class NotePageController {
  constructor(callbacks) {
    this.callbacks = callbacks; this.drafts = new Map(); this.previews = new Set(); this.tabs = []; this.busy = new Set();
    document.addEventListener("input", e => { if (e.target.closest("[data-note-form]")) { this.capture(); if (e.target.name === "body") this.slash(e.target); } });
    document.addEventListener("submit", e => { if (e.target.matches("[data-note-form]")) { e.preventDefault(); void this.save(e.target).catch(error => this.error(error, e.target)); } });
    document.addEventListener("click", e => this.click(e));
    document.addEventListener("change", e => this.change(e));
    document.addEventListener("keydown", e => this.keydown(e));
  }
  storageKey(route) { return `damedast-note-draft:${this.scope}:${route}`; }
  tabsKey() { return `damedast-note-tabs:${this.scope}`; }
  persistTabs() { try { localStorage.setItem(this.tabsKey(), JSON.stringify({ tabs: this.tabs, side: this.side })); } catch {} }
  capture() {
    for (const form of document.querySelectorAll("[data-note-form]")) {
      if (form.dataset.scope !== this.scope) continue;
      const draft = this.drafts.get(form.dataset.route); if (!draft) continue;
      draft.title = form.elements.title.value; draft.body = form.elements.body.value; draft.projectId = form.elements.projectId.value || null;
      try { sessionStorage.setItem(this.storageKey(form.dataset.route), JSON.stringify(draft)); } catch {}
    }
  }
  deactivate() { this.capture(); }
  open(id = null, preset = null) {
    this.capture();
    this.activateScope(this.callbacks.context());
    if (!id) {
      id = crypto.randomUUID();
      this.drafts.set(id, { ...plainNoteDraft(preset), projectId: preset?.projectId || null, baseVersion: 0, id });
      try { sessionStorage.setItem(this.storageKey(id), JSON.stringify(this.drafts.get(id))); } catch {}
    }
    const route = `note/${id}`;
    if (location.hash !== `#${route}`) history.pushState(null, "", `#${route}`);
    this.callbacks.refresh();
  }
  draft(route, records) {
    if (this.drafts.has(route)) return this.drafts.get(route);
    const base = textNotes(records).find(r => r.id === route);
    let stored; try { stored = JSON.parse(sessionStorage.getItem(this.storageKey(route)) || "null"); } catch {}
    if (!base && route !== "new" && !stored) return null;
    const source = stored || base?.data || {};
    const draft = { ...plainNoteDraft(source), projectId: source.projectId || null, baseVersion: stored?.baseVersion ?? base?.version ?? 0, id: base?.id || stored?.id || (route === "new" ? crypto.randomUUID() : route) };
    this.drafts.set(route, draft); return draft;
  }
  hasDraft(id) { try { return !!sessionStorage.getItem(this.storageKey(id)); } catch { return false; } }
  activateScope(c) {
    if (this.scope !== c.space) {
      this.scope = c.space; this.drafts.clear(); this.previews.clear();
      let stored; try { stored = JSON.parse(localStorage.getItem(this.tabsKey()) || "null"); } catch {}
      this.tabs = Array.isArray(stored?.tabs) ? stored.tabs.filter(tab => textNotes(c.records).some(r => r.id === tab.id) || this.hasDraft(tab.id)).map(tab => ({ id: tab.id, pinned: !!tab.pinned })) : [];
      this.side = textNotes(c.records).some(r => r.id === stored?.side) ? stored.side : null;
    }
  }
  render(c) {
    this.activateScope(c);
    this.c = c; this.route = location.hash.slice(1).split("/")[1];
    const d = this.draft(this.route, c.records);
    if (!d) return `<section class="panel empty"><h1>${t("This note is no longer available.")}</h1><a href="#notes">${t("Back to notes")}</a></section>`;
    if (!this.tabs.some(tab => tab.id === this.route)) this.tabs.push({ id: this.route, pinned: false });
    this.tabs = this.tabs.filter(tab => tab.id === "new" || this.drafts.has(tab.id) || textNotes(c.records).some(r => r.id === tab.id)); this.persistTabs();
    const side = this.side && this.side !== this.route && this.draft(this.side, c.records);
    const tabs = [...this.tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return `<section class="note-workspace"><header class="note-workspace-toolbar"><a class="secondary" href="#notes">← ${t("Back to notes")}</a><label>${t("Second note")}<select data-note-side><option value="">${t("Single pane")}</option>${textNotes(c.records).filter(r => r.id !== this.route).map(r => `<option value="${r.id}" ${r.id === this.side ? "selected" : ""}>${esc(r.data.title)}</option>`).join("")}</select></label></header><nav class="note-tabs" aria-label="${t("Note tabs")}">${tabs.map(tab => `<div class="note-tab ${tab.id === this.route ? "active" : ""}"><button type="button" data-note-tab="${tab.id}" aria-current="${tab.id === this.route ? "page" : "false"}">${esc(this.drafts.get(tab.id)?.title || c.records.find(r => r.id === tab.id)?.data.title || t("New note"))}</button><button type="button" data-note-tab-pin="${tab.id}" aria-pressed="${tab.pinned}" aria-label="${t(tab.pinned ? "Unpin tab" : "Pin tab")}">${tab.pinned ? "●" : "○"}</button>${tab.pinned ? "" : `<button type="button" data-note-tab-close="${tab.id}" aria-label="${t("Close tab")}">×</button>`}</div>`).join("")}</nav><div class="note-panes ${side ? "is-split" : ""}">${this.pane(this.route, d, "main")}${side ? this.pane(this.side, side, "side") : ""}</div></section>`;
  }
  pane(route, d, slot) {
    const preview = this.previews.has(route);
    return `<section class="note-page" data-note-pane="${route}"><header class="note-page-heading"><span>${t(slot === "side" ? "Second note" : "Note")}</span><button type="button" class="text-button" data-note-preview="${route}">${t(preview ? "Write" : "Preview")}</button><button type="submit" form="note-${slot}-form" class="primary" ${this.busy.has(route) ? "disabled" : ""}>${t("Save")}</button></header><form id="note-${slot}-form" data-note-form data-route="${route}" data-scope="${esc(this.scope)}"><label class="sr-only" for="note-${slot}-title">${t("Title")}</label><input id="note-${slot}-title" name="title" class="note-page-title" placeholder="${t("Title")}" value="${esc(d.title)}" maxlength="80" required dir="auto">${projectField(this.c.records, d.projectId)}<label class="sr-only" for="note-${slot}-body">${t("Content")}</label><textarea id="note-${slot}-body" name="body" class="note-page-body" rows="14" maxlength="4000" placeholder="${t("Type / to add a block")}" dir="auto" ${preview ? "hidden" : ""}>${esc(d.body)}</textarea><div class="note-slash-menu" role="menu" hidden></div>${preview ? `<div class="note-rendered" dir="auto">${renderNoteBlocks(d.body)}</div>` : ""}<output role="status"></output><p class="note-page-error" role="alert"></p></form></section>`;
  }
  attach() {}
  error(error, form) { const target = form?.querySelector(".note-page-error"); if (target?.isConnected) target.textContent = t(error.message); else this.callbacks.error(error); }
  async save(form) {
    const route = form.dataset.route; if (this.busy.has(route)) return;
    this.capture(); if (!form.reportValidity()) return;
    const scope = this.scope, draft = structuredClone(this.drafts.get(route)), base = this.c.records.find(r => r.id === route);
    this.busy.add(route); form.querySelector(".note-page-error").textContent = "";
    try {
      if (scope !== this.callbacks.context().space) throw Error("This record changed. Reopen the form.");
      const data = { ...notePayload(base?.data, draft, today()), projectId: draft.projectId };
      await this.callbacks.save(data, draft.id, draft.baseVersion);
      if (this.scope !== scope) return;
      const saved = this.callbacks.context().records.find(r => r.id === draft.id);
      try { sessionStorage.removeItem(this.storageKey(route)); } catch {}
      this.drafts.set(draft.id, { ...draft, baseVersion: saved?.version || draft.baseVersion + 1 });
      if (route === "new") {
        this.drafts.delete("new"); this.tabs = this.tabs.map(tab => tab.id === "new" ? { ...tab, id: draft.id } : tab);
        history.replaceState(null, "", `#note/${draft.id}`);
      }
      this.persistTabs(); this.callbacks.refresh();
      document.querySelector(`[data-note-form][data-route="${draft.id}"] output`)?.append(t("Saved."));
    } finally { this.busy.delete(route); document.querySelector(`[data-note-pane="${draft.id}"] button[type="submit"]`)?.removeAttribute("disabled"); }
  }
  click(e) {
    const button = e.target.closest("[data-note-tab],[data-note-tab-pin],[data-note-tab-close],[data-note-preview],[data-note-command]"); if (!button) return;
    this.capture();
    if (button.dataset.noteTab) { this.open(button.dataset.noteTab); return; }
    if (button.dataset.noteTabPin) { const tab = this.tabs.find(t => t.id === button.dataset.noteTabPin); if (tab) tab.pinned = !tab.pinned; this.persistTabs(); }
    if (button.dataset.noteTabClose) {
      const id = button.dataset.noteTabClose; this.tabs = this.tabs.filter(tab => tab.id !== id); this.persistTabs();
      if (id === this.route) { if (this.tabs.length) this.open(this.tabs.at(-1).id); else location.hash = "notes"; return; }
    }
    if (button.dataset.notePreview) { const id = button.dataset.notePreview; this.previews.has(id) ? this.previews.delete(id) : this.previews.add(id); }
    if (button.dataset.noteCommand) { this.insert(button); return; }
    this.callbacks.refresh();
  }
  change(e) {
    if (e.target.matches("[data-note-side]")) { this.capture(); this.side = e.target.value || null; this.persistTabs(); this.callbacks.refresh(); }
    if (e.target.matches("[data-note-line]")) {
      const form = e.target.closest("[data-note-form]"), body = form.elements.body, lines = body.value.split("\n"), index = Number(e.target.dataset.noteLine);
      lines[index] = lines[index].replace(/^- \[[ xX]\]/, e.target.checked ? "- [x]" : "- [ ]"); body.value = lines.join("\n"); this.capture();
    }
  }
  slash(textarea) {
    const menu = textarea.form.querySelector(".note-slash-menu"), before = textarea.value.slice(0, textarea.selectionStart), match = /(?:^|\s)\/([^\s/]{0,30})$/.exec(before);
    if (!match) { menu.hidden = true; return; }
    const commands = slashCommands.filter(c => (t(c.label) + " " + c.id).toLowerCase().includes(match[1].toLowerCase()));
    menu.dataset.start = String(textarea.selectionStart - match[1].length - 1); menu.dataset.end = String(textarea.selectionStart);
    menu.innerHTML = commands.map(c => `<button type="button" role="menuitem" data-note-command="${c.id}">${t(c.label)}</button>`).join(""); menu.hidden = !commands.length;
  }
  insert(button) {
    const menu = button.closest(".note-slash-menu"), body = button.closest("form").elements.body;
    const command = slashCommands.find(c => c.id === button.dataset.noteCommand);
    const snippets = { heading: `## ${t("Heading")}\n`, checklist: `- [ ] ${t("Task")}\n`, code: "```csharp\n// Code\n```\n", quote: `> ${t("Quote")}\n`, toggle: `:::toggle ${t("Title")}\n${t("Content")}\n:::\n` };
    const inserted = insertNoteBlock(body.value, Number(menu.dataset.start), Number(menu.dataset.end), command.id, snippets[command.id]);
    if (inserted.body.length > 4000) return;
    body.value = inserted.body; menu.hidden = true; body.focus(); body.setSelectionRange(inserted.cursor, inserted.cursor); this.capture();
  }
  keydown(e) {
    const menu = e.target.closest("form")?.querySelector(".note-slash-menu");
    if (!menu || menu.hidden) return;
    if (e.key === "Escape") { menu.hidden = true; e.preventDefault(); }
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault(); const items = [...menu.querySelectorAll("button")], i = items.indexOf(document.activeElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
    if (e.key === "Enter" && e.target.name === "body") { e.preventDefault(); menu.querySelector("button")?.click(); }
  }
}
