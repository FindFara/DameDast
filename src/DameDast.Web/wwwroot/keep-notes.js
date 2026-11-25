import { escapeHtml as e } from "./finance.js";
import { getLanguage } from "./i18n.js";
import { readNoteSettings } from "./keep-preferences.js";
import { dateControl, updateCalendarControl } from "./calendar.js";
import {
  normalizeNote,
  prepareNoteSave,
  emptyNote,
  noteMatches,
  moveChecklist,
  checkLabelName,
  noteContent,
  sanitizeNoteHtml,
} from "./keep-model.js";
import {
  tr,
  ico,
  button,
  shell,
  notesMenu,
  card,
  editor,
  checklist,
  colorPalette,
  colorName,
  labels,
} from "./keep-view.js";
export const isNoteRoute = (hash) =>
  /^(notes|organizer|note\/(new|[\da-f-]{36}))$/i.test(hash);
export class NotePageController {
  constructor(callbacks) {
    this.cb = callbacks;
    this.drafts = new Map();
    this.filters = { route: "notes", search: "" };
    this.p = {};
    this.active = null;
    this.deepRoute = null;
    document.addEventListener("click", (ev) => this.click(ev));
    document.addEventListener("input", (ev) => this.input(ev));
    document.addEventListener("change", (ev) => this.change(ev));
    document.addEventListener("keydown", (ev) => this.key(ev));
    document.addEventListener("paste", (ev) => {
      if (ev.target.closest(".keep-rich")) {
        ev.preventDefault();
        document.execCommand(
          "insertText",
          false,
          ev.clipboardData.getData("text/plain"),
        );
      }
    });
    document.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("[data-k-format]")) {
        ev.preventDefault();
        return;
      }
      if (
        this.pop &&
        !this.pop.contains(ev.target) &&
        !this.popAnchor?.contains(ev.target)
      )
        this.closePopover();
      if (
        this.inline &&
        !ev.target.closest(
          ".keep-editor,.keep-popover,.keep-modal,.date-picker,[data-k=refresh]",
        )
      )
        void this.closeEditor();
    });
    document.addEventListener("dragstart", (ev) => {
      const row = ev.target.closest(".keep-task");
      if (row) {
        this.dragged = row.dataset.taskId;
        ev.dataTransfer.setData("text/plain", this.dragged);
      }
    });
    document.addEventListener("dragover", (ev) => {
      if (ev.target.closest(".keep-task")) ev.preventDefault();
    });
    document.addEventListener("drop", (ev) => this.drop(ev));
    window.addEventListener("beforeunload", (ev) => {
      if (
        this.storageFailed &&
        [...this.drafts.values()].some((d) => d.dirty)
      ) {
        ev.preventDefault();
        ev.returnValue = "";
      }
    });
    window.addEventListener("online", () => {
      for (const d of this.drafts.values()) if (d.dirty) void this.flush(d);
      this.update();
    });
    window.addEventListener("offline", () => this.update());
  }
  assertScope(scope) {
    if (
      scope !== this.scope ||
      (this.context().space !== undefined && this.context().space !== scope)
    )
      throw Error(
        tr(
          "Account changed. Reopen the note.",
          "حساب تغییر کرده؛ یادداشت را دوباره باز کنید.",
        ),
      );
  }
  scopedWriter() {
    const scope = this.scope;
    return async (...args) => {
      this.assertScope(scope);
      await this.cb.write(...args, scope);
      this.assertScope(scope);
    };
  }
  context() {
    return this.cb.context();
  }
  keyName() {
    return `damedast-keep:${this.scope}`;
  }
  activate(c) {
    if (this.scope === c.space) return;
    this.deactivate();
    this.scope = c.space;
    this.drafts.clear();
    this.filters = { route: "notes", search: "" };
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(this.keyName()) || "null");
    } catch {}
    this.p = readNoteSettings(c.space);
    for (const raw of saved?.drafts || []) {
      if (raw.id && raw.data) {
        const d = {
          ...raw,
          scope: this.scope,
          seq: 0,
          dirty: true,
          undo: [],
          redo: [],
          state: "pending",
        };
        this.drafts.set(d.id, d);
      }
    }
  }
  persist() {
    try {
      localStorage.setItem(
        this.keyName(),
        JSON.stringify({
          preferences: this.p,
          drafts: [...this.drafts.values()]
            .filter((d) => d.dirty && (!emptyNote(d.data) || d.base))
            .map((d) => ({
              id: d.id,
              data: d.data,
              version: d.version,
              base: d.base,
            })),
        }),
      );
      this.storageFailed = false;
      return true;
    } catch {
      this.storageFailed = true;
      this.message(
        tr(
          "Draft storage is full. Keep this editor open and retry saving.",
          "فضای پیش‌نویس پر است؛ ویرایشگر را باز نگه دارید و ذخیره را دوباره امتحان کنید.",
        ),
      );
      return false;
    }
  }
  render(c) {
    this.activate(c);
    return shell(c, this.p);
  }
  attach() {
    document.body.classList.add("notes-workspace");
    this.root = document.querySelector(".keep-app");
    if (!this.root) return;
    if (this.observedRoot !== this.root) {
      this.resizeObserver?.disconnect();
      this.observedRoot = this.root;
      this.resizeObserver = new ResizeObserver(() => {
        const cols = this.columnCount();
        if (cols !== this.columns) this.update();
      });
      this.resizeObserver.observe(this.root.querySelector(".keep-sections"));
    }
    this.update();
    const hash = location.hash.slice(1);
    if (hash.startsWith("note/") && this.deepRoute !== hash) {
      this.deepRoute = hash;
      queueMicrotask(() =>
        this.open(hash === "note/new" ? null : hash.split("/")[1]),
      );
    }
  }
  columnCount() {
    return this.p.view === "list"
      ? 1
      : Math.max(
          1,
          Math.floor(
            ((this.root?.querySelector(".keep-sections")?.clientWidth || 700) +
              16) /
              276,
          ),
        );
  }
  update() {
    if (!this.root?.isConnected || this.context().space !== this.scope) return;
    this.columns = this.columnCount();
    const c = this.context();
    this.root.querySelector(".keep-connection").innerHTML =
      c.space === "demo"
        ? ""
        : !navigator.onLine
          ? tr(
              "Offline · changes stay on this device until connected.",
              "آفلاین · تغییرات تا زمان اتصال روی این دستگاه می‌مانند.",
            )
          : c.space.startsWith("google:") && c.pendingCount
            ? tr(
                "Saved on this device · waiting to sync",
                "روی این دستگاه ذخیره شد · در انتظار همگام‌سازی",
              )
            : !c.space.startsWith("google:")
              ? tr(
                  "Local workspace · saved on this device",
                  "فضای محلی · ذخیره روی این دستگاه",
                )
              : tr("Synced", "همگام‌شده");
    const f = this.filters;
    this.root.querySelector(".page-heading h1").textContent = tr(
      "Notes",
      "یادداشت‌ها",
    );
    this.root.querySelector(".keep-filters").innerHTML =
      `<span class="keep-scope">${tr("Search in", "جست‌وجو در")}: ${tr("Notes", "یادداشت‌ها")}</span>${button("filters", "filter", tr("Filters", "فیلترها"))}${[
        "color",
        "label",
      ]
        .filter((k) => f[k])
        .map(
          (k) =>
            `<button type="button" class="keep-chip" data-k="remove-filter" data-filter="${k}">${e(k === "label" ? labels(c).find((l) => l.id === f[k])?.data.name || "" : colorName(f[k]))} ×</button>`,
        )
        .join("")}`;
    const slot = this.root.querySelector(".keep-composer-slot");
    if (!this.inline) {
      slot.innerHTML =
        f.route === "notes" && !f.search
          ? `<div class="keep-composer-collapsed"><button type="button" data-k="compose">${tr("Take a note…", "یادداشتی بنویس…")}</button></div>`
          : "";
    }
    const saved = c.records.filter((r) =>
      noteMatches(r, { ...f, includeArchived: true }),
    );
    const found = saved.sort(
      (a, b) =>
        (b.data.createdAt || b.data.updatedOn || "").localeCompare(
          a.data.createdAt || a.data.updatedOn || "",
        ) || a.id.localeCompare(b.id),
    );
    const target = this.root.querySelector(".keep-sections");
    const focus = document.activeElement?.closest(".keep-card");
    const focusAction = focus ? document.activeElement?.dataset.k : null;
    const y = window.scrollY;
    const old = new Map(
      [...target.querySelectorAll(".keep-card")].map((el) => [
        el.dataset.noteId,
        el,
      ]),
    );
    const groups = [
      found.filter((r) => r.data.pinned),
      found.filter((r) => !r.data.pinned),
    ];
    target.innerHTML = "";
    for (let i = 0; i < 2; i++) {
      if (!groups[i].length) continue;
      const section = document.createElement("section");
      if (groups[0].length) {
        const h = document.createElement("h2");
        h.className = "keep-section-title";
        h.textContent =
          i === 0
            ? tr("Pinned", "سنجاق‌شده‌ها")
            : tr("Others", "سایر یادداشت‌ها");
        section.append(h);
      }
      const grid = document.createElement("div");
      grid.className = `keep-grid ${this.p.view === "list" ? "keep-list" : ""}`;
      grid.style.gridTemplateColumns = `repeat(${this.columns},minmax(0,1fr))`;
      const columns = Array.from({ length: this.columns }, () => {
        const col = document.createElement("div");
        col.className = "keep-masonry-column";
        grid.append(col);
        return col;
      });
      let columnIndex = 0;
      for (const r of groups[i]) {
        const html = card(r, c, this.p);
        const fingerprint = html;
        let node = old.get(r.id);
        if (!node || node._fingerprint !== fingerprint) {
          const t = document.createElement("template");
          t.innerHTML = html;
          node = t.content.firstElementChild;
          node._fingerprint = fingerprint;
        }
        columns[columnIndex++ % columns.length].append(node);
      }
      section.append(grid);
      target.append(section);
    }
    if (!found.length)
      target.innerHTML = `<div class="keep-empty">${ico(f.route === "trash" ? "trash" : "note")}<h2>${f.search || f.color || f.label || f.type || f.reminder ? tr("No matching notes", "یادداشتی پیدا نشد") : tr("A little space for your thoughts", "جایی برای فکرهایت")}</h2><p>${tr("Your notes will appear here.", "یادداشت‌های شما اینجا نمایش داده می‌شوند.")}</p></div>`;
    const unsaved = [...this.drafts.values()].filter(
      (d) =>
        d.dirty && d.id !== this.active?.id && (!emptyNote(d.data) || d.base),
    );
    if (unsaved.length) {
      const recovery = document.createElement("div");
      recovery.className = "keep-recovery";
      recovery.innerHTML = `${tr("Unsaved drafts", "پیش‌نویس‌های ذخیره‌نشده")} ${unsaved.map((d) => `<button type="button" data-k="recover" data-id="${d.id}">${e(d.data.title || d.data.body.slice(0, 35) || tr("Checklist", "چک‌لیست"))}</button>`).join("")}`;
      target.prepend(recovery);
    }
    if (focusAction && focus) {
      target
        .querySelector(
          `[data-note-id="${focus.dataset.noteId}"] [data-k="${focusAction}"]`,
        )
        ?.focus({ preventScroll: true });
    }
    window.scrollTo({ top: y, behavior: "instant" });
  }
  capture() {} // Editors own their DOM and draft; a workspace refresh never replaces it.
  deactivate() {
    if (this.active) {
      void this.flush(this.active);
      this.dialog?.close();
      this.dialog?.remove();
      this.active = null;
      this.inline = false;
    }
    this.closePopover();
    document.querySelectorAll(".keep-modal").forEach((dlg) => {
      dlg.close();
      dlg.remove();
    });
    document.body.classList.remove("notes-workspace");
    this.deepRoute = null;
  }
  getDraft(id, preset) {
    if (id && this.drafts.has(id)) {
      const d = this.drafts.get(id),
        r = this.context().records.find((r) => r.id === id && !r.deleted);
      if (r && !d.dirty && !d.saving && r.version !== d.version) {
        d.data = normalizeNote(r.data);
        d.base = structuredClone(r.data);
        d.version = r.version;
      }
      return d;
    }
    const r = this.context().records.find(
      (r) => r.id === id && !r.deleted && r.kind === "note",
    );
    if (id && !r) return null;
    const d = {
      id: id || crypto.randomUUID(),
      scope: this.scope,
      data: normalizeNote(r?.data || preset),
      base: r ? structuredClone(r.data) : null,
      version: r?.version || 0,
      seq: 0,
      dirty: false,
      undo: [],
      redo: [],
      state: "",
    };
    this.drafts.set(d.id, d);
    return d;
  }
  open(id = null, preset = null, inline = false) {
    this.activate(this.context());
    if (!this.root?.isConnected) {
      const d = this.getDraft(id, preset);
      if (!d) return;
      history.pushState(null, "", `#note/${d.id}`);
      this.cb.refresh();
      return;
    }
    if (this.active) void this.closeEditor();
    const d = this.getDraft(id, preset);
    if (!d) {
      this.message(
        tr("This note is no longer available.", "این یادداشت دیگر موجود نیست."),
      );
      return;
    }
    if (d.data.status === "trashed") {
      this.message(
        tr(
          "Restore this note before editing.",
          "ابتدا یادداشت را بازیابی کنید.",
        ),
      );
      return;
    }
    this.active = d;
    this.inline = inline;
    this.returnFocus = document.activeElement;
    this.scroll = window.scrollY;
    if (inline) {
      this.root.querySelector(".keep-composer-slot").innerHTML = editor(
        d,
        true,
      );
      this.editorEl = this.root.querySelector(".keep-editor");
    } else {
      this.dialog = document.createElement("dialog");
      this.dialog.className = "keep-note-dialog";
      this.dialog.setAttribute("aria-label", tr("Edit note", "ویرایش یادداشت"));
      this.dialog.innerHTML = editor(d);
      document.body.append(this.dialog);
      this.editorEl = this.dialog.querySelector(".keep-editor");
      this.dialog.addEventListener("cancel", (ev) => {
        ev.preventDefault();
        void this.closeEditor();
      });
      this.dialog.addEventListener("click", (ev) => {
        if (ev.target === this.dialog) void this.closeEditor();
      });
      this.dialog.showModal();
    }
    this.renderChecklist();
    this.editorChips();
    this.status(d);
    queueMicrotask(() => {
      const rich = this.editorEl?.querySelector(".keep-rich");
      rich?.focus();
    });
  }
  textSnapshot(d) {
    return JSON.stringify({
      title: d.data.title,
      body: d.data.body,
      richText: d.data.richText,
      noteType: d.data.noteType,
      checklist: d.data.checklist,
    });
  }
  remember(d) {
    const snap = this.textSnapshot(d);
    if (d.undo.at(-1) !== snap) {
      d.undo.push(snap);
      d.undo = d.undo.slice(-80);
    }
    d.redo = [];
  }
  changed(d) {
    d.seq++;
    d.dirty = true;
    d.state = "pending";
    this.persist();
    clearTimeout(d.timer);
    d.timer = setTimeout(() => void this.flush(d), 650);
    this.status(d);
  }
  status(d) {
    if (this.active?.id !== d.id) return;
    const el = this.editorEl?.querySelector(".keep-save-state");
    if (!el) return;
    const states = {
      saving: tr("Saving…", "در حال ذخیره…"),
      saved: tr("Saved on this device", "ذخیره شد روی این دستگاه"),
      pending: tr("Unsaved changes", "در انتظار ذخیره"),
      error: tr(
        "Could not save. Your draft is kept.",
        "ذخیره ناموفق؛ پیش‌نویس شما حفظ شده است.",
      ),
    };
    el.innerHTML =
      e(states[d.state] || "") +
      (d.state === "error"
        ? ` <button type="button" data-k="retry">${tr("Retry", "تلاش مجدد")}</button><button type="button" data-k="save-copy">${tr("Save as a new note", "ذخیره به‌عنوان یادداشت جدید")}</button><small>${e(d.error || "")}</small>`
        : "");
  }
  async flush(d) {
    clearTimeout(d.timer);
    if (d.saving) return d.saving;
    if (!d.dirty) return;
    if (emptyNote(d.data)) {
      d.state = "error";
      d.error = tr(
        "Add text before saving. The previous saved version is kept.",
        "برای ذخیره متن بنویسید؛ نسخهٔ قبلی حفظ شده است.",
      );
      this.persist();
      this.status(d);
      return;
    }
    d.saving = (async () => {
      while (d.dirty && !emptyNote(d.data)) {
        const seq = d.seq;
        d.state = "saving";
        this.status(d);
        try {
          const scope = d.scope ?? this.scope;
          this.assertScope(scope);
          const next = prepareNoteSave(d.base, d.data);
          await this.cb.save(next, d.id, d.version, scope);
          this.assertScope(scope);
          const current = this.context().records.find((r) => r.id === d.id);
          d.version = current?.version ?? d.version + 1;
          d.base = next;
          d.dirty = d.seq !== seq;
          Object.assign(d.data, {
            createdAt: next.createdAt,
            updatedOn: next.updatedOn,
            editedAt: next.editedAt,
            history: next.history,
          });
          d.state = d.dirty ? "pending" : "saved";
          d.error = "";
          this.persist();
          this.status(d);
        } catch (err) {
          d.state = "error";
          d.error = err.message;
          if (d.scope === undefined || d.scope === this.scope) this.persist();
          this.status(d);
          break;
        }
      }
    })().finally(() => {
      d.saving = null;
      this.update();
    });
    return d.saving;
  }
  async closeEditor() {
    const d = this.active;
    if (!d) return;
    this.closePopover();
    this.active = null;
    const inline = this.inline;
    this.inline = false;
    this.dialog?.close();
    this.dialog?.remove();
    this.dialog = null;
    this.editorEl = null;
    this.persist();
    if (emptyNote(d.data) && !d.base) this.drafts.delete(d.id);
    void this.flush(d);
    this.update();
    if (!inline) window.scrollTo({ top: this.scroll, behavior: "instant" });
    const cardEl = this.root?.querySelector(`[data-note-id="${d.id}"]`);
    (this.returnFocus?.isConnected && this.returnFocus !== document.body
      ? this.returnFocus
      : cardEl || this.root?.querySelector("[data-k=compose]")
    )?.focus({
      preventScroll: true,
    });
    if (location.hash.startsWith("#note/")) {
      history.replaceState(null, "", "#notes");
      this.deepRoute = null;
    }
  }
  renderChecklist(focusId) {
    if (!this.active || !this.editorEl) return;
    this.editorEl.querySelector(".keep-editor-checklist").innerHTML = checklist(
      this.active,
      this.p,
    );
    if (focusId)
      this.editorEl
        ?.querySelector(`[data-task-text="${focusId}"]`)
        ?.focus({ preventScroll: true });
  }
  editorChips() {
    if (!this.active || !this.editorEl) return;
    const d = this.active.data;
    this.editorEl.dataset.color = d.color;
    this.editorEl
      .querySelector('[data-k="pin"]')
      ?.setAttribute("aria-pressed", String(d.pinned));
    this.editorEl.querySelector(".keep-editor-chips").innerHTML = d.labels
      .map(
        (id) =>
          `<button type="button" class="keep-chip" data-k="labels">${e(labels(this.context()).find((l) => l.id === id)?.data.name || "")}</button>`,
      )
      .join("");
  }

  async patch(ids, change, { undo = false, scope = this.scope } = {}) {
    this.assertScope(scope);
    const before = [];
    for (const id of ids) {
      this.assertScope(scope);
      const d = this.getDraft(id);
      if (!d) continue;
      await this.flush(d);
      this.assertScope(scope);
      if (d.state === "error")
        throw Error(
          tr(
            "Save the draft before this operation.",
            "ابتدا پیش‌نویس را ذخیره کنید.",
          ),
        );
      before.push({ id, data: structuredClone(d.data) });
      const delta = typeof change === "function" ? change(d.data) : change;
      if (noteContent({ ...d.data, ...delta }) !== noteContent(d.data))
        this.remember(d);
      Object.assign(d.data, delta);
      this.changed(d);
      await this.flush(d);
      if (d.state === "error") throw Error(d.error);
      this.editorChips();
    }
    if (undo) {
      const versions = before.map((x) => ({
        ...x,
        version: this.context().records.find((r) => r.id === x.id)?.version,
      }));
      this.message(tr("Notes updated", "یادداشت‌ها به‌روز شدند"), async () => {
        for (const x of versions) {
          if (
            this.context().records.find((r) => r.id === x.id)?.version !==
            x.version
          )
            throw Error(
              tr(
                "This note changed. Open it to restore safely.",
                "این یادداشت تغییر کرده؛ آن را باز کنید.",
              ),
            );
          const d = this.getDraft(x.id);
          d.data = x.data;
          this.changed(d);
          await this.flush(d);
        }
      });
    }
    this.update();
  }
  async safe(fn) {
    try {
      await fn();
    } catch (err) {
      const status =
        this.pop?.querySelector("[role=status]") ||
        this.dialogs?.querySelector("[role=status]");
      if (status) status.textContent = err.message;
      else this.message(err.message);
    }
  }
  target(ev) {
    const container = ev.target.closest("[data-draft-id],[data-note-id]");
    return container?.dataset.draftId || container?.dataset.noteId || null;
  }
  async click(ev) {
    if (ev.target.closest(".keep-card-task,.keep-card .keep-done")) return;
    const format = ev.target.closest("[data-k-format]");
    if (format) {
      ev.preventDefault();
      this.format(format.dataset.kFormat);
      return;
    }
    const color = ev.target.closest("[data-k-color]");
    if (color) {
      const ids = this.popIds || [];
      this.closePopover();
      await this.safe(() => this.patch(ids, { color: color.dataset.kColor }));
      return;
    }
    const b = ev.target.closest("[data-k]");
    if (!b) {
      const article = ev.target.closest(".keep-card");
      if (
        article &&
        !ev.target.closest("input,label,details,a,button,summary")
      ) {
        this.open(article.dataset.noteId);
      }
      return;
    }
    if (!b.closest(".keep-app,.keep-editor,.keep-popover,.keep-modal,#page-toolbar-actions")) return;
    const action = b.dataset.k;
    ev.stopPropagation();
    if (ev.detail > 0) {
      const title = b.title;
      b.removeAttribute("title");
      b.addEventListener("pointerleave", () => (b.title = title), {
        once: true,
      });
      b.blur();
    }
    const id = this.target(ev);
    const ids = id ? [id] : [];
    await this.safe(async () => {
      switch (action) {
        case "notes-menu":
          this.popover(
            b,
            notesMenu(this.context(), this.filters.route, this.filters.label),
          );
          break;
        case "route":
          if (b.dataset.route !== "notes") return;
          this.closePopover();
          this.filters = {
            route: b.dataset.route,
            search: "",
            label: b.dataset.label || "",
          };
          this.root.querySelector("[data-k-search]").value = "";
          this.root.classList.remove("keep-drawer-open");
          this.update();
          break;
        case "filter-label":
          this.filters = { route: "notes", search: "", label: b.dataset.label };
          this.update();
          break;
        case "remove-filter":
          delete this.filters[b.dataset.filter];
          this.update();
          break;
        case "compose":
          this.open(null, { noteType: "text" }, true);
          break;
        case "recover":
          this.open(b.dataset.id);
          break;
        case "open":
          this.open(id);
          break;
        case "pin": {
          const d = this.getDraft(ids[0]);
          await this.patch(ids, { pinned: !d.data.pinned });
          break;
        }
        case "color":
          this.popover(
            b,
            colorPalette(this.getDraft(ids[0])?.data.color || "default"),
            ids,
          );
          break;
        case "labels":
          this.labelPicker(b, ids.length ? ids : this.popIds || []);
          break;
        case "delete-note":
          await this.patch(
            ids,
            { status: "trashed", trashedAt: new Date().toISOString() },
            { undo: true },
          );
          if (ids.includes(this.active?.id)) await this.closeEditor();
          this.closePopover();
          break;
        case "more":
          this.more(b, ids[0]);
          break;
        case "format":
          this.editorEl.querySelector(".keep-formatbar").hidden =
            !this.editorEl.querySelector(".keep-formatbar").hidden;
          break;
        case "undo":
        case "redo": {
          const d = this.active;
          const from = action === "undo" ? d.undo : d.redo,
            to = action === "undo" ? d.redo : d.undo;
          if (from.length) {
            to.push(this.textSnapshot(d));
            Object.assign(d.data, JSON.parse(from.pop()));
            this.changed(d);
            this.refreshEditorBody(d);
          }
          break;
        }
        case "add-item":
          this.addItem();
          break;
        case "task-up":
        case "task-down":
        case "task-indent":
        case "task-delete":
          this.taskAction(action, b.dataset.task);
          break;
        case "close-editor":
          await this.closeEditor();
          break;
        case "retry":
          await this.flush(this.active);
          break;
        case "save-copy": {
          const old = this.active,
            copy = normalizeNote(old.data);
          copy.history = [];
          copy.createdAt = new Date().toISOString();
          await this.closeEditor();
          this.open(null, copy);
          this.changed(this.active);
          await this.flush(this.active);
          if (this.active.state !== "error") {
            this.drafts.delete(old.id);
            this.persist();
          }
          break;
        }
        case "view":
          this.p.view = this.p.view === "list" ? "grid" : "list";
          this.persist();
          b.innerHTML = ico(this.p.view === "list" ? "grid" : "list");
          this.update();
          break;
        case "clear-search":
          this.root.querySelector("[data-k-search]").value = "";
          this.filters.search = "";
          this.update();
          break;
        case "filters":
          this.filterPicker(b);
          break;
        case "edit-labels":
          this.closePopover();
          this.editLabels();
          break;
        case "snack-undo": {
          const undo = this.undoSnack;
          this.root.querySelector(".keep-snackbar").hidden = true;
          this.undoSnack = null;
          if (undo) await undo();
          break;
        }
      }
    });
  }
  input(ev) {
    const el = ev.target;
    if (el.matches("[data-k-search]")) {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.filters.search = el.value;
        this.update();
      }, 180);
      return;
    }
    if (el.matches("[data-label-search]")) {
      for (const label of el
        .closest(".keep-popover")
        .querySelectorAll("[data-label-row]"))
        label.hidden = !label.textContent
          .toLowerCase()
          .includes(el.value.toLowerCase());
      return;
    }
    if (!this.active || !el.closest(".keep-editor")) return;
    const d = this.active;
    if (el.matches("[data-k-title],.keep-rich,[data-task-text]")) {
      this.remember(d);
      if (el.matches("[data-k-title]")) d.data.title = el.value;
      else if (el.matches(".keep-rich")) {
        d.data.richText = sanitizeNoteHtml(el.innerHTML);
        d.data.body = el.innerText.replace(/\n{3,}/g, "\n\n");
      } else {
        const item = d.data.checklist.find((x) => x.id === el.dataset.taskText);
        if (item) item.text = el.value;
      }
      this.changed(d);
    }
  }
  async change(ev) {
    const el = ev.target;
    const task = el.closest("[data-k-task]");
    if (task) {
      ev.stopPropagation();
      const id = this.target(ev);
      await this.safe(() =>
        this.patch([id], (d) => ({
          checklist: d.checklist.map((x) =>
            x.id === task.dataset.kTask ? { ...x, done: task.checked } : x,
          ),
        })),
      );
      return;
    }
    if (el.matches("[data-task-done]") && this.active) {
      this.remember(this.active);
      this.active.data.checklist.find(
        (x) => x.id === el.dataset.taskDone,
      ).done = el.checked;
      this.changed(this.active);
      this.renderChecklist();
      return;
    }
    if (el.matches("[data-label-choice]")) {
      const ids = [...this.popIds];
      const label = el.dataset.labelChoice,
        checked = el.checked;
      await this.safe(() =>
        this.patch(ids, (d) => ({
          labels: checked
            ? [...new Set([...d.labels, label])]
            : d.labels.filter((x) => x !== label),
        })),
      );
      return;
    }
    if (el.matches("[data-k-filter]")) {
      this.filters[el.dataset.kFilter] =
        el.type === "checkbox" ? el.checked : el.value;
      this.update();
    }
  }
  addItem(after) {
    const d = this.active;
    if (!d) return;
    this.remember(d);
    const item = { id: crypto.randomUUID(), text: "", done: false, indent: 0 };
    if (d.data.checklist.length >= 50) {
      this.message(tr("Maximum 50 checklist items.", "حداکثر ۵۰ مورد."));
      return;
    }
    if (after) {
      const at = d.data.checklist.findIndex((x) => x.id === after);
      item.indent = d.data.checklist[at]?.indent || 0;
      d.data.checklist.splice(at + 1, 0, item);
    } else if (this.p.newItemPosition === "top") d.data.checklist.unshift(item);
    else d.data.checklist.push(item);
    this.changed(d);
    this.renderChecklist(item.id);
  }
  taskAction(action, id) {
    const d = this.active;
    if (!d) return;
    this.remember(d);
    const at = d.data.checklist.findIndex((x) => x.id === id);
    if (at < 0) return;
    if (action === "task-delete") {
      d.data.checklist.splice(at, 1);
      if (d.data.checklist[0]) d.data.checklist[0].indent = 0;
    } else if (action === "task-indent") {
      if (at > 0)
        d.data.checklist[at].indent = d.data.checklist[at].indent ? 0 : 1;
    } else
      d.data.checklist = moveChecklist(
        d.data.checklist,
        id,
        action === "task-up" ? -1 : 1,
      );
    this.changed(d);
    this.renderChecklist(id);
  }
  drop(ev) {
    const row = ev.target.closest(".keep-task");
    if (!row || !this.active || !this.dragged) return;
    ev.preventDefault();
    const items = this.active.data.checklist,
      from = items.findIndex((x) => x.id === this.dragged),
      to = items.findIndex((x) => x.id === row.dataset.taskId);
    if (from < 0 || to < 0 || from === to) return;
    this.remember(this.active);
    const end = items[from].indent
      ? from + 1
      : (() => {
          let end = from + 1;
          while (items[end]?.indent) end++;
          return end;
        })();
    const group = items.splice(from, end - from);
    const target = items.findIndex((x) => x.id === row.dataset.taskId);
    if (target < 0) {
      items.splice(from, 0, ...group);
      return;
    }
    items.splice(target, 0, ...group);
    items[0].indent = 0;
    this.changed(this.active);
    this.renderChecklist(this.dragged);
  }
  refreshEditorBody(d) {
    if (this.active?.id !== d.id) return;
    const rich = this.editorEl.querySelector(".keep-rich");
    rich.hidden = false;
    rich.innerHTML = d.data.richText
      ? sanitizeNoteHtml(d.data.richText)
      : e(d.data.body).replaceAll("\n", "<br>");
    this.editorEl.querySelector("[data-k-title]").value = d.data.title;
    this.editorEl.querySelector(".keep-editor-checklist").hidden =
      !d.data.checklist.length;
    this.editorEl.querySelector("[data-k=format]").disabled = false;
    this.renderChecklist();
    this.editorChips();
  }
  format(type) {
    if (!this.active) return;
    this.editorEl.querySelector(".keep-rich").focus();
    if (["h1", "h2", "p"].includes(type))
      document.execCommand("formatBlock", false, type);
    else
      document.execCommand(
        type === "clear" ? "removeFormat" : type,
        false,
        null,
      );
    const rich = this.editorEl.querySelector(".keep-rich");
    this.input({ target: rich });
  }
  key(ev) {
    const menu = ev.target.closest('[role="menu"]');
    if (menu && ["ArrowDown", "ArrowUp", "Home", "End"].includes(ev.key)) {
      ev.preventDefault();
      const items = [...menu.querySelectorAll('[role="menuitem"]')].filter(
        (el) => !el.disabled,
      );
      const index = items.indexOf(document.activeElement);
      const next =
        ev.key === "Home"
          ? 0
          : ev.key === "End"
            ? items.length - 1
            : (index + (ev.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
      return;
    }
    const typing = ev.target.closest(
      'input,textarea,select,[contenteditable="true"]',
    );
    if (ev.target.closest(".keep-formatbar") && ev.key === "Tab") return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter" && this.active) {
      ev.preventDefault();
      void this.closeEditor();
      return;
    }
    if (ev.target.matches("[data-task-text]")) {
      const id = ev.target.dataset.taskText;
      if (ev.key === "Enter") {
        ev.preventDefault();
        this.addItem(id);
        return;
      }
      if (ev.key === "Tab" && !ev.ctrlKey && !ev.metaKey) {
        ev.preventDefault();
        const x = this.active.data.checklist.find((x) => x.id === id);
        if (x && (ev.shiftKey ? x.indent : !x.indent))
          this.taskAction("task-indent", id);
        return;
      }
    }
    if (
      ev.altKey &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key) &&
      ev.target.closest(".keep-task")
    ) {
      ev.preventDefault();
      this.taskAction(
        ["ArrowLeft", "ArrowRight"].includes(ev.key)
          ? "task-indent"
          : ev.key === "ArrowUp"
            ? "task-up"
            : "task-down",
        ev.target.closest(".keep-task").dataset.taskId,
      );
      return;
    }
    if (ev.key === "Escape") {
      if (
        ev.target.closest("dialog") &&
        !ev.target.closest(".keep-note-dialog") &&
        !this.pop
      )
        return;
      if (this.pop) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        this.closePopover();
      } else if (this.inline && this.active) {
        ev.preventDefault();
        void this.closeEditor();
      }
      return;
    }
    if (
      !this.root?.isConnected ||
      typing ||
      ev.ctrlKey ||
      ev.metaKey ||
      ev.altKey ||
      document.querySelector("dialog[open]")
    )
      return;
    if (ev.key.toLowerCase() === "c") {
      ev.preventDefault();
      this.open(null, null, true);
    }
    if (ev.key === "/") {
      ev.preventDefault();
      this.root.querySelector("[data-k-search]").focus();
    }
    if (["Enter", " "].includes(ev.key) && ev.target.matches(".keep-card")) {
      ev.preventDefault();
      this.open(ev.target.dataset.noteId);
    }
  }
  popover(anchor, html, ids = []) {
    this.closePopover();
    this.popIds = ids;
    this.popAnchor = anchor;
    if (anchor.hasAttribute("aria-expanded"))
      anchor.setAttribute("aria-expanded", "true");
    this.pop = document.createElement("div");
    this.pop.className = "keep-popover";
    this.pop.setAttribute("role", "dialog");
    this.pop.setAttribute(
      "aria-label",
      anchor.getAttribute("aria-label") || tr("Options", "گزینه‌ها"),
    );
    this.pop.innerHTML = html;
    this.pop.setAttribute("popover", "manual");
    (anchor.closest("dialog") || document.body).append(this.pop);
    this.pop.showPopover?.();
    const rect = anchor.getBoundingClientRect(),
      width = Math.min(320, innerWidth - 24);
    this.pop.style.width = width + "px";
    this.pop.style.left =
      Math.max(12, Math.min(rect.left, innerWidth - width - 12)) + "px";
    this.pop.style.top =
      Math.max(
        12,
        Math.min(rect.bottom + 6, innerHeight - this.pop.offsetHeight - 12),
      ) + "px";
    this.pop.querySelector("input,button,select")?.focus();
  }
  closePopover() {
    if (this.pop) {
      this.popAnchor?.setAttribute("aria-expanded", "false");
      this.pop.remove();
      this.pop = null;
      this.popAnchor?.focus({ preventScroll: true });
    }
    this.popAnchor = null;
  }
  modal(html, label) {
    const dlg = document.createElement("dialog");
    dlg.className = "keep-modal";
    dlg.setAttribute("aria-label", label);
    dlg.innerHTML = `${button("modal-close", "close", tr("Close", "بستن"))}<div class="keep-modal-content">${html}</div>`;
    document.body.append(dlg);
    const close = () => {
      dlg.close();
      dlg.remove();
    };
    dlg.querySelector('[data-k="modal-close"]').onclick = close;
    dlg.addEventListener("click", (ev) => {
      if (ev.target === dlg) close();
    });
    dlg.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      close();
    });
    dlg.showModal();
    this.dialogs = dlg;
    return dlg;
  }
  reloadSettings() {
    this.p = readNoteSettings(this.context().space);
    this.update();
  }
  more(anchor, id) {
    this.popover(
      anchor,
      `<div class="keep-menu" role="menu">${[
        ["labels", "label", tr("Change labels", "تغییر برچسب‌ها")],
        ["delete-note", "trash", tr("Delete note", "حذف یادداشت")],
      ]
        .map(
          ([action, icon, label]) =>
            `<button type="button" role="menuitem" data-k="${action}" data-note-id="${id}">${ico(icon)}${label}</button>`,
        )
        .join("")}</div>`,
      [id],
    );
  }
  labelPicker(anchor, ids) {
    const scope = this.scope,
      write = this.scopedWriter(),
      patch = (ids, change, options) =>
        this.patch(ids, change, { ...options, scope });
    const common = ids.length ? this.getDraft(ids[0]).data.labels : [];
    this.popover(
      anchor,
      `<strong>${tr("Note labels", "برچسب‌های یادداشت")}</strong><input type="search" data-label-search placeholder="${tr("Search labels", "جست‌وجوی برچسب")}"/><div class="keep-label-options">${labels(
        this.context(),
      )
        .map(
          (r) =>
            `<label data-label-row><input type="checkbox" data-label-choice="${r.id}" ${common.includes(r.id) ? "checked" : ""}/><span dir="auto">${e(r.data.name)}</span></label>`,
        )
        .join(
          "",
        )}</div><form data-new-label><input name="name" maxlength="40" required placeholder="${tr("New label", "برچسب جدید")}" aria-label="${tr("New label", "برچسب جدید")}"/><button>${tr("Create", "ساخت")}</button><p role="status"></p></form>`,
      ids,
    );
    this.pop.querySelector("form").onsubmit = (ev) => {
      ev.preventDefault();
      void this.safe(async () => {
        const name = checkLabelName(
            ev.target.elements.name.value,
            this.context().records,
          ),
          id = crypto.randomUUID();
        await write("noteLabel", { name }, id, false, 0);
        await patch(ids, (d) => ({ labels: [...d.labels, id] }));
        this.labelPicker(anchor, ids);
      });
    };
  }
  editLabels() {
    const scope = this.scope,
      write = this.scopedWriter(),
      patch = (ids, change, options) =>
        this.patch(ids, change, { ...options, scope });
    const dlg = this.modal(
      `<h2>${tr("Edit labels", "ویرایش برچسب‌ها")}</h2><form data-create><input name="name" required maxlength="40" aria-label="${tr("New label", "برچسب جدید")}" placeholder="${tr("New label", "برچسب جدید")}"/><button>${tr("Create", "ساخت")}</button></form><div data-label-list></div><p role="status"></p>`,
      tr("Edit labels", "ویرایش برچسب‌ها"),
    );
    const paint = () => {
      dlg.querySelector("[data-label-list]").innerHTML = labels(this.context())
        .map(
          (r) =>
            `<form data-label-edit="${r.id}"><input name="name" value="${e(r.data.name)}" required maxlength="40" aria-label="${tr("Label name", "نام برچسب")}"/><button>${tr("Rename", "تغییر نام")}</button><button type="button" data-remove-label="${r.id}">${tr("Delete", "حذف")}</button></form>`,
        )
        .join("");
      for (const f of dlg.querySelectorAll("[data-label-edit]")) {
        f.onsubmit = (ev) => {
          ev.preventDefault();
          void run(async () => {
            const r = labels(this.context()).find(
              (r) => r.id === f.dataset.labelEdit,
            );
            await write(
              "noteLabel",
              {
                name: checkLabelName(
                  f.elements.name.value,
                  this.context().records,
                  r.id,
                ),
              },
              r.id,
              false,
              r.version,
            );
            paint();
            this.editorChips();
          });
        };
        f.querySelector("[data-remove-label]").onclick = () =>
          void run(async () => {
            const id = f.dataset.labelEdit;
            const affected = this.context().records.filter(
              (r) =>
                !r.deleted && r.kind === "note" && r.data.labels?.includes(id),
            );
            for (const r of affected)
              await patch([r.id], (d) => ({
                labels: d.labels.filter((x) => x !== id),
              }));
            const r = labels(this.context()).find((r) => r.id === id);
            await write("noteLabel", r.data, id, true, r.version);
            if (this.filters.label === id) delete this.filters.label;
            paint();
            this.update();
          });
      }
    };
    const run = async (fn) => {
      try {
        await fn();
      } catch (err) {
        dlg.querySelector('[role="status"]').textContent = err.message;
      }
    };
    dlg.querySelector("[data-create]").onsubmit = (ev) => {
      ev.preventDefault();
      void run(async () => {
        await write(
          "noteLabel",
          {
            name: checkLabelName(
              ev.target.elements.name.value,
              this.context().records,
            ),
          },
          crypto.randomUUID(),
          false,
          0,
        );
        ev.target.reset();
        paint();
      });
    };
    paint();
  }
  filterPicker(anchor) {
    const f = this.filters;
    this.popover(
      anchor,
      `<label>${tr("Color", "رنگ")}<select data-k-filter="color"><option value="">${tr("All", "همه")}</option>${["default", "sand", "yellow", "sage", "mint", "blue", "lavender", "rose"].map((v) => `<option value="${v}" ${f.color === v ? "selected" : ""}>${colorName(v)}</option>`).join("")}</select></label><label>${tr("Label", "برچسب")}<select data-k-filter="label"><option value="">${tr("All", "همه")}</option>${labels(
        this.context(),
      )
        .map(
          (r) =>
            `<option value="${r.id}" ${f.label === r.id ? "selected" : ""}>${e(r.data.name)}</option>`,
        )
        .join("")}</select></label>`,
    );
  }
  reminderDialog(id) {
    const scope = this.scope,
      write = this.scopedWriter(),
      patch = (ids, change, options) =>
        this.patch(ids, change, { ...options, scope });
    if (!id) return;
    this.closePopover();
    const d = this.getDraft(id),
      r = d.data.reminder;
    const tz = r?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const local = new Date(Date.now() + 3600000);
    const date =
      r?.startDate ||
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(local);
    const dlg = this.modal(
      `<h2>${tr("Reminder", "یادآور")}</h2><form data-reminder><label>${tr("Date", "تاریخ")}${dateControl("Date", "startDate", date, true)}</label><label>${tr("Time", "ساعت")}<input type="time" name="time" required value="${e(r?.times?.[0] || local.toTimeString().slice(0, 5))}"/></label><label>${tr("Repeat", "تکرار")}<select name="repeat">${[
        ["once", tr("Does not repeat", "بدون تکرار")],
        ["daily", tr("Daily", "روزانه")],
        ["weekly", tr("Weekly", "هفتگی")],
        ["monthly", tr("Monthly (Jalali)", "ماهانه (شمسی)")],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${r?.repeat === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select></label><label>${tr("Time zone", "منطقهٔ زمانی")}<input name="timeZone" required value="${e(tz)}" dir="ltr"/></label><p class="keep-reminder-hint">${this.context().session?.authenticated && this.context().session?.pushConfigured ? tr("Background notifications require notification permission in your account settings.", "اعلان پس‌زمینه به مجوز اعلان در تنظیمات حساب نیاز دارد.") : tr("In-app reminders are available. Background notifications require the connected server and notification permission.", "یادآور درون برنامه فعال است. اعلان پس‌زمینه به سرور متصل و مجوز اعلان نیاز دارد.")}</p><div class="keep-form-actions"><button type="submit">${tr("Save", "ذخیره")}</button><button type="button" data-remove-reminder>${tr("Remove reminder", "حذف یادآور")}</button></div><p role="status"></p></form>`,
      tr("Reminder", "یادآور"),
    );
    const f = dlg.querySelector("form");
    f.onsubmit = (ev) => {
      ev.preventDefault();
      void this.safe(async () => {
        try {
          new Intl.DateTimeFormat("en", {
            timeZone: f.elements.timeZone.value,
          }).format();
          const reminder = {
            title: (
              d.data.title ||
              d.data.body ||
              tr("Note reminder", "یادآور یادداشت")
            )
              .slice(0, 80)
              .trim(),
            body: "",
            startDate: f.elements.startDate.value,
            times: [f.elements.time.value],
            repeat: f.elements.repeat.value,
            interval: 1,
            endDate: null,
            maxOccurrences: null,
            pinned: false,
            completed: false,
            timeZone: f.elements.timeZone.value,
          };
          if (!reminder.startDate || !reminder.times[0])
            throw Error(
              tr("Choose date and time", "تاریخ و ساعت را انتخاب کنید"),
            );
          await patch([id], { reminder });
          dlg.close();
          dlg.remove();
        } catch (err) {
          dlg.querySelector('[role="status"]').textContent = err.message;
        }
      });
    };
    f.querySelector("[data-remove-reminder]").onclick = () =>
      void this.safe(async () => {
        await patch([id], { reminder: null });
        dlg.close();
        dlg.remove();
      });
    for (const input of dlg.querySelectorAll("[data-calendar]"))
      updateCalendarControl(input);
  }
  message(text, undo = null) {
    if (!this.root?.isConnected) return;
    const el = this.root.querySelector(".keep-snackbar");
    clearTimeout(this.snackTimer);
    this.undoSnack = undo;
    el.hidden = false;
    el.innerHTML = `<span>${e(text)}</span>${undo ? `<button type="button" data-k="snack-undo">${tr("Undo", "بازگردانی")}</button>` : ""}`;
    this.snackTimer = setTimeout(
      () => {
        el.hidden = true;
        this.undoSnack = null;
      },
      undo ? 12000 : 6500,
    );
  }
}
