import { t, getLanguage, effectiveTheme } from "./i18n.js";
export class DrawingStudio {
  constructor({ save, draft, exportFile, error, context, getRecord }) {
    Object.assign(this, { save, draft, exportFile, error, context, getRecord });
    this.host = document.querySelector("#drawing-studio");
    window.addEventListener("message", (e) => void this.receive(e));
  }
  get isOpen() {
    return !!this.frame;
  }
  async open(record, draft = null) {
    if (this.frame || this.opening) return;
    this.opening = true;
    try {
      this.note = structuredClone(
        draft?.data ||
          record?.data || {
            title: t("Untitled canvas"),
            body: "",
            pinned: false,
            checklist: [],
          },
      );
      this.id = this.note.whiteboardId || record?.id || crypto.randomUUID();
      this.record = record || { id: this.id, version: 0, data: this.note };
      if (!this.note.whiteboardId) {
        this.note.whiteboardId = this.id;
        await this.save(this.record, this.note);
        this.record = {
          ...this.record,
          version: this.record.version + 1,
          data: structuredClone(this.note),
        };
      }
      this.frame = document.createElement("iframe");
      this.frame.src = "/whiteboard/index.html";
      this.frame.title = t("Drawing canvas");
      this.frame.allow = "clipboard-read; clipboard-write; fullscreen";
      this.host.replaceChildren(this.frame);
      this.host.hidden = false;
      document.body.classList.add("whiteboard-open");
      document.querySelector("#view").setAttribute("aria-hidden", "true");
    } catch (e) {
      this.error(e);
    } finally {
      this.opening = false;
    }
  }
  async receive(e) {
    if (e.origin !== location.origin || e.source !== this.frame?.contentWindow)
      return;
    if (e.data?.type === "damdast:whiteboard:ready") {
      this.frame.contentWindow.postMessage(
        {
          type: "damdast:whiteboard:open",
          context: {
            ...this.context(),
            id: this.id,
            title: this.note.title,
            language: getLanguage(),
            theme: effectiveTheme(),
            legacyDrawing: this.note.drawing || null,
          },
        },
        location.origin,
      );
      return;
    }
    if (e.data?.type !== "damdast:whiteboard:saved") return;
    try {
      const current = this.getRecord(this.record.id);
      if (!current) throw Error("This record changed. Reopen the form.");
      const data = {
        ...current.data,
        title: String(e.data.title).trim().slice(0, 80) || t("Untitled canvas"),
        whiteboardId: this.id,
        whiteboardPreview:
          e.data.preview || current.data.whiteboardPreview || null,
      };
      if (!this.context().session.authenticated || e.data.cloudSaved)
        data.drawing = null;
      await this.save(current, data);
      this.host.hidden = true;
      this.host.replaceChildren();
      this.frame = null;
      document.body.classList.remove("whiteboard-open");
      document.querySelector("#view").removeAttribute("aria-hidden");
      if (this.onClosed) {
        const callback = this.onClosed;
        this.onClosed = null;
        callback();
      }
    } catch (error) {
      this.error(error);
    }
  }
  close(after = null) {
    if (!this.frame) {
      after?.();
      return;
    }
    this.onClosed = after;
    this.frame.contentWindow.postMessage(
      { type: "damdast:whiteboard:close" },
      location.origin,
    );
  }
}
