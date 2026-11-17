import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  restore,
  exportToBlob,
} from "@excalidraw/excalidraw";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import {
  emptyDocument,
  validateDocument,
  same,
  emptyServer,
  asDocument,
} from "./model.mjs";
import {
  SerializedWriter,
  loadDocument,
  saveDocument,
  read,
  write,
} from "./storage.mjs";
import { DocumentSync } from "./sync.mjs";

export const fileData = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
export function prepareDownload(blob: Blob, name: string) {
  return { url: URL.createObjectURL(blob), name };
}
export async function context() {
  if (window.parent !== window)
    return new Promise<any>((resolve) => {
      const listener = (event: MessageEvent) => {
        if (
          event.origin !== location.origin ||
          event.source !== parent ||
          event.data?.type !== "damdast:whiteboard:open"
        )
          return;
        window.removeEventListener("message", listener);
        resolve(event.data.context);
      };
      window.addEventListener("message", listener);
      parent.postMessage({ type: "damdast:whiteboard:ready" }, location.origin);
    });
  const session = await fetch("/api/session")
      .then((r) => r.json())
      .catch(() => ({ authenticated: false })),
    u = new URL(location.href);
  if (!u.searchParams.has("document")) {
    u.searchParams.set("document", crypto.randomUUID());
    history.replaceState(null, "", u.href);
  }
  return {
    id: u.searchParams.get("document") || crypto.randomUUID(),
    title: "Untitled canvas",
    space: session.authenticated ? "google:" + session.userId : "guest",
    session,
    token: new URLSearchParams(location.hash.slice(1)).get("access"),
    language: localStorage.getItem("damdast-language") || "en",
    theme: localStorage.getItem("damdast-theme") === "dark" ? "dark" : "light",
  };
}
export class Runtime {
  ctx: any;
  doc: any;
  api: any;
  base: any;
  sync: any;
  writer: any;
  viewWriter: any;
  clientId: string;
  enabled = false;
  role = "owner";
  capabilities: any = {};
  hub: any;
  status = "Loading";
  error = "";
  listeners = new Set<() => void>();
  library: any[] = [];
  ui: any = {};
  applying = false;
  gesturing = false;
  retry: any;
  lastCursor = 0;
  collaborators = new Map();
  initialized = false;
  constructor(ctx: any) {
    this.ctx = ctx;
    const key = "damdast-wb-client:" + ctx.space + ":" + ctx.id;
    this.clientId = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, this.clientId);
  }
  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  emit() {
    for (const fn of this.listeners) fn();
  }
  message(status: string) {
    this.status = status;
    this.emit();
  }
  fail(e: any) {
    this.error = String(e?.message || e);
    this.message("Save failed");
  }
  async request(path: string, options: any = {}) {
    const r = await fetch(path, {
      ...options,
      signal: options.signal || AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/json",
        ...(this.ctx.session?.csrf
          ? { "X-CSRF-TOKEN": this.ctx.session.csrf }
          : {}),
        ...(this.ctx.token ? { "X-Whiteboard-Token": this.ctx.token } : {}),
        ...options.headers,
      },
    });
    const data = r.status === 204 ? null : await r.json();
    if (!r.ok)
      throw Object.assign(Error(data?.error || "Server unavailable"), {
        status: r.status,
        data,
      });
    return data;
  }
  async initialize() {
    const saved = await loadDocument(
      this.ctx.space,
      this.ctx.id,
      this.clientId,
    );
    this.doc = saved?.document || emptyDocument();
    this.doc.title =
      saved?.document?.title || this.ctx.title || "Untitled canvas";
    validateDocument(this.doc);
    this.ui = (await read("ui", this.ctx.space + ":" + this.ctx.id)) || {};
    this.library = (await read("library", this.ctx.space)) || [];
    if (!saved && this.ctx.legacyDrawing)
      this.doc = this.convertLegacy(this.ctx.legacyDrawing);
    this.writer = new SerializedWriter(
      async (value: any) => {
        await saveDocument(this.ctx.space, this.ctx.id, this.clientId, value);
        if (!this.enabled) this.message("Saved locally");
      },
      (e: any) => this.fail(e),
    );
    this.viewWriter = new SerializedWriter(
      (value: any) => write("ui", this.ctx.space + ":" + this.ctx.id, value),
      (e: any) => this.fail(e),
      900,
    );
    this.capabilities = await this.request(
      "/api/whiteboards/capabilities",
    ).catch(() => ({ storage: false, collaboration: false, sharing: false }));
    this.enabled =
      !!(this.ctx.session?.authenticated || this.ctx.token) &&
      !!(this.capabilities.storage || this.ctx.token);
    let base = saved?.base || emptyServer();
    if (this.enabled) {
      try {
        const access = await this.request("/api/whiteboards/" + this.ctx.id);
        this.role = access.role;
        if ((!saved || access.role === "view") && access.exists) {
          this.doc = asDocument(access.state);
          base = access.state;
        }
      } catch (e) {
        this.error = String((e as any).message);
      }
    }
    this.sync = new DocumentSync({
      id: this.ctx.id,
      document: this.doc,
      base,
      flight: saved?.flight,
      request: this.request.bind(this),
      changed: (doc: any) => this.applyRemote(doc),
      persist: (value: any, immediate = false) =>
        this.persist(value, immediate),
      status: (status: string) => this.message(status),
    });
    this.initialized = true;
    this.message(this.enabled ? "Ready" : "Saved locally");
    this.writer.schedule(this.sync.serialize());
    window.addEventListener(
      "online",
      () => void this.reconnect().catch(() => this.message("Offline")),
    );
    window.addEventListener("offline", () => this.message("Offline"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden")
        void this.writer.flush().catch(() => {});
      else if (this.enabled) void this.sync.pull().catch(() => {});
    });
    window.addEventListener("message", (e) => {
      if (
        e.origin === location.origin &&
        e.source === parent &&
        e.data?.type === "damdast:whiteboard:close"
      )
        void this.close();
    });
  }
  async reconnect() {
    this.capabilities = await this.request("/api/whiteboards/capabilities");
    this.enabled =
      !!(this.ctx.session?.authenticated || this.ctx.token) &&
      !!(this.capabilities.storage || this.ctx.token);
    if (!this.enabled) return;
    const access = await this.sync.pull();
    if (access) this.role = access.role;
    await this.sync.flush();
    await this.connect();
  }
  async persist(value: any, immediate = false) {
    this.writer.schedule(value);
    if (immediate) await this.writer.flush();
  }
  initial() {
    return {
      ...restore(
        {
          elements: this.doc.scene.elements,
          appState: {
            ...this.doc.scene.settings,
            ...this.ui,
            currentItemFontFamily: 2,
            currentItemFontSize: 22,
            name: this.doc.title,
          },
          files: this.doc.scene.files,
        },
        null,
        null,
        { repairBindings: true },
      ),
      libraryItems: this.library,
      scrollToContent:
        !this.ui.zoom ||
        Math.abs((this.ui.viewportWidth || innerWidth) - innerWidth) > 80,
    };
  }
  setApi(api: any) {
    this.api = api;
    api.onPointerUp(() => {
      this.gesturing = false;
      this.capture(
        api.getSceneElementsIncludingDeleted(),
        api.getAppState(),
        api.getFiles(),
      );
      if (this.enabled) void this.sync.flush().catch((e) => this.fail(e));
    });
    if (this.enabled)
      void this.sync
        .pull()
        .then(() => this.sync.flush())
        .then(() => this.connect())
        .catch((e) => this.fail(e));
  }
  capture(elements: any, state: any, files: any) {
    this.viewWriter?.schedule({
      scrollX: state.scrollX,
      scrollY: state.scrollY,
      zoom: state.zoom,
      viewportWidth: innerWidth,
    });
    if (this.applying || !this.initialized || this.role === "view") return;
    const used = new Set(
      elements.filter((e: any) => e.type === "image").map((e: any) => e.fileId),
    );
    const doc = {
      ...this.doc,
      scene: {
        elements: [...elements],
        files: Object.fromEntries(
          Object.entries(files).filter(([id]) => used.has(id)),
        ),
        settings: {
          viewBackgroundColor: state.viewBackgroundColor || "#ffffff",
          gridSize: state.gridSize || null,
          gridStep: state.gridStep || 5,
        },
      },
    };
    if (same(doc, this.doc)) return;
    try {
      validateDocument(doc);
    } catch (e) {
      this.error = String((e as any).message);
      this.emit();
      queueMicrotask(() => this.applyRemote(this.doc));
      return;
    }
    this.doc = doc;
    this.sync.document = doc;
    this.writer.schedule(this.sync.serialize());
    this.message("Saving");
    if (this.enabled && !this.gesturing) this.sync.local(doc);
  }
  applyRemote(doc: any) {
    this.doc = doc;
    if (this.api) {
      this.applying = true;
      this.api.addFiles(Object.values(doc.scene.files));
      this.api.updateScene({
        elements: doc.scene.elements,
        appState: doc.scene.settings,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      this.applying = false;
    }
    this.emit();
  }
  rename(title: string) {
    if (this.role === "view") return;
    this.doc = { ...this.doc, title: title.trim() || "Untitled canvas" };
    this.sync.document = this.doc;
    this.writer.schedule(this.sync.serialize());
    if (this.enabled) this.sync.local(this.doc);
    this.emit();
  }
  async flush() {
    if (this.api)
      this.capture(
        this.api.getSceneElementsIncludingDeleted(),
        this.api.getAppState(),
        this.api.getFiles(),
      );
    await this.writer.flush();
    if (this.enabled && this.role !== "view") await this.sync.flush();
    if (this.error && this.status === "Save failed") throw Error(this.error);
  }
  async close() {
    try {
      await this.flush();
      let preview = null;
      const elements = this.api?.getSceneElements() || [];
      if (elements.length) {
        const blob = await exportToBlob({
          elements,
          files: this.api.getFiles(),
          appState: {
            ...this.api.getAppState(),
            exportBackground: true,
            exportWithDarkMode: false,
          },
          maxWidthOrHeight: 320,
        });
        preview = await fileData(blob);
        if (preview.length > 110000) preview = null;
      }
      if (window.parent !== window)
        parent.postMessage(
          {
            type: "damdast:whiteboard:saved",
            title: this.doc.title,
            whiteboardId: this.ctx.id,
            preview,
            cloudSaved: this.sync.base.revision > 0,
          },
          location.origin,
        );
      else location.href = "/#canvas";
    } catch (e) {
      this.fail(e);
    }
  }
  async connect() {
    if (
      !this.enabled ||
      !this.capabilities.collaboration ||
      (this.role === "view" && !this.ctx.token) ||
      this.sync.base.revision === 0
    )
      return;
    if (this.hub && this.hub.state !== "Disconnected") return;
    if (!this.hub) {
      this.hub = new HubConnectionBuilder()
        .withUrl("/hubs/whiteboard")
        .withAutomaticReconnect([0, 1000, 3000, 8000])
        .configureLogging(LogLevel.Error)
        .build();
      this.hub.on("SceneChanged", () => void this.sync.pull().catch(() => {}));
      this.hub.on("Cursor", (c: any) => {
        this.collaborators.set(c.id, {
          ...c,
          color: { background: "#e9e0ff", stroke: "#8065c5" },
        });
        this.api?.updateScene({
          collaborators: new Map(this.collaborators),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      });
      this.hub.on("Left", (id: string) => {
        this.collaborators.delete(id);
        this.api?.updateScene({
          collaborators: new Map(this.collaborators),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      });
      this.hub.on("Presence", (people: any[]) => {
        this.message("Live");
      });
      this.hub.on(
        "AccessChanged",
        () =>
          void this.sync.pull().catch(() => {
            this.role = "view";
            this.message("Access denied");
          }),
      );
      this.hub.onreconnecting(() => this.message("Reconnecting"));
      this.hub.onreconnected(() => void this.join());
      this.hub.onclose(() => {
        this.message("Offline");
        clearTimeout(this.retry);
        this.retry = setTimeout(() => void this.connect(), 5000);
      });
    }
    try {
      await this.hub.start();
      await this.join();
    } catch {
      this.message("Offline");
      clearTimeout(this.retry);
      this.retry = setTimeout(() => void this.connect(), 5000);
    }
  }
  async join() {
    const access = await this.hub.invoke(
      "Join",
      this.ctx.id,
      this.ctx.token || null,
      this.ctx.session?.name || "Guest",
      this.ctx.session?.csrf || null,
    );
    this.role = access.role;
    this.sync.receive(access.state);
    await this.sync.pull();
    await this.sync.flush();
    this.message("Live");
  }
  pointer(payload: any) {
    if (
      !this.hub ||
      this.hub.state !== "Connected" ||
      Date.now() - this.lastCursor < 90
    )
      return;
    this.lastCursor = Date.now();
    void this.hub
      .invoke("Cursor", payload.pointer.x, payload.pointer.y, payload.button)
      .catch(() => {});
  }
  async libraryChanged(items: any) {
    if (new TextEncoder().encode(JSON.stringify(items)).length > 2000000) {
      this.error = "Component library is too large.";
      this.emit();
      return;
    }
    this.library = items;
    await write("library", this.ctx.space, items);
  }
  convertLegacy(d: any) {
    const elements = d.elements.map((e: any) => {
      const type = {
        pen: "freedraw",
        marker: "freedraw",
        rectangle: "rectangle",
        ellipse: "ellipse",
        line: "line",
        arrow: "arrow",
        text: "text",
      }[e.type];
      const common = {
        id: e.id,
        type,
        x: e.x,
        y: e.y,
        width: e.width,
        height: e.height,
        strokeColor: e.color,
        strokeWidth: e.strokeWidth,
        opacity: e.type === "marker" ? 40 : 100,
        roughness: 0,
      };
      if (type === "freedraw") {
        const points = (e.points || []).map((p: any) => [p.x - e.x, p.y - e.y]);
        return {
          ...common,
          points,
          pressures: (e.points || []).map((p: any) => p.pressure),
          simulatePressure: false,
        };
      }
      if (type === "text")
        return {
          ...common,
          text: e.text,
          fontFamily: 2,
          fontSize: Math.max(30, e.strokeWidth * 5),
        };
      if (type === "line" || type === "arrow")
        return {
          ...common,
          points: [
            [0, 0],
            [e.width, e.height],
          ],
        };
      return common;
    });
    const doc = emptyDocument();
    doc.title = this.doc.title;
    doc.scene.elements = convertToExcalidrawElements(elements as any, {
      regenerateIds: false,
    });
    return validateDocument(doc);
  }
}
