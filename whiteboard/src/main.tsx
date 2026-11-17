import { embedDocumentFont } from "./svg-font";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Excalidraw,
  MainMenu,
  languages,
  CaptureUpdateAction,
  convertToExcalidrawElements,
  exportToBlob,
  exportToSvg,
  serializeAsJSON,
  restore,
  viewportCoordsToSceneCoords,
  sceneCoordsToViewportCoords,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Runtime, context, prepareDownload, fileData } from "./runtime";
import { emptyDocument, validateDocument, safeLink } from "./model.mjs";
import { write } from "./storage.mjs";
import "./whiteboard.css";
// The published package omits Fa from its language list at 84% coverage.
// Register its bundled locale through the public list; keep canvas layout in LTR.
if (!languages.some((language) => language.code === "fa-IR"))
  languages.push({ code: "fa-IR", label: "Fa", rtl: false });
(window as any).EXCALIDRAW_ASSET_PATH = "/whiteboard/";
(window as any).EXCALIDRAW_EXPORT_SOURCE = "Damdast";
const words: any = {
  "Canvas menu": "منوی طراحی",
  "Prepare file": "آماده‌سازی فایل",
  Canvas: "بوم",
  "Back to notes": "بازگشت به یادداشت‌ها",
  Local: "محلی",
  "Saved locally": "ذخیره روی دستگاه",
  Saving: "در حال ذخیره",
  Ready: "آماده",
  Synced: "همگام شد",
  Syncing: "در حال همگام‌سازی",
  Live: "زنده",
  Offline: "آفلاین",
  Reconnecting: "اتصال مجدد",
  "Save failed": "ذخیره ناموفق",
  Conflict: "تعارض",
  "Access denied": "دسترسی قطع شد",
  Export: "خروجی",
  Import: "ورود فایل",
  "Editable file": "فایل قابل ویرایش",
  Selection: "انتخاب‌شده‌ها",
  "Entire document": "کل سند",
  Background: "پس‌زمینه",
  Scale: "مقیاس",
  Download: "دانلود",
  Cancel: "انصراف",
  Close: "بستن",
  Share: "اشتراک",
  "Read-only link": "لینک فقط‌خواندنی",
  "Collaboration room": "اتاق همکاری",
  "Create link": "ساخت لینک",
  "Revoke all links": "لغو همهٔ لینک‌ها",
  Copy: "کپی",
  Copied: "کپی شد",
  Library: "کتابخانه",
  "Sticky note": "یادداشت چسبان",
  Lasso: "انتخاب آزاد",
  "Fit content": "نمایش همه",
  "Fit selection": "نمایش انتخاب",
  "100%": "۱۰۰٪",
  "Focus mode": "حالت تمرکز",
  Grid: "شبکه",
  "Insert sample flowchart": "افزودن فلوچارت نمونه",
  "Import image": "افزودن تصویر",
  "Keep my changes": "نگه‌داشتن تغییرات من",
  "Use remote changes": "پذیرفتن تغییرات سرور",
  "Some elements changed on another device.":
    "بعضی عناصر روی دستگاه دیگری تغییر کرده‌اند.",
  "Your edits are saved on this device.":
    "تغییراتت روی همین دستگاه ذخیره می‌شوند.",
  "Sharing needs a signed-in .NET server.":
    "اشتراک و اتاق زنده به ورود معتبر روی سرور دات‌نت نیاز دارد.",
  "Live rooms are not available on this host. Use the .NET server.":
    "اتاق زنده روی این میزبان در دسترس نیست؛ نسخهٔ دات‌نت را اجرا کن.",
  "Invalid or oversized document.": "فایل نامعتبر است یا بیش از حد بزرگ است.",
  "Invalid file. Your current document was kept.":
    "فایل نامعتبر است؛ سند فعلی حفظ شد.",
  "Choose at least one element.": "حداقل یک عنصر انتخاب کن.",
  "The canvas is empty.": "بوم خالی است.",
  "Retry save": "تلاش دوباره برای ذخیره",
  "A local save failed. Export a backup before closing.":
    "ذخیرهٔ محلی ناموفق بود؛ پیش از بستن یک خروجی بگیر.",
  "Search canvas": "جست‌وجوی بوم",
  Shortcuts: "میانبرها",
  Note: "یادداشت",
  "Untitled canvas": "بوم بی‌نام",
};
function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
const paths: any = {
  back: "M14 5 7 12l7 7M7 12h13",
  export: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  share:
    "M8 12l8-7M8 12l8 7M5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  sticky: "M4 3h16v12l-5 6H4ZM14 21v-7h6",
  lasso:
    "M5 18c-6-9 2-17 12-13 9 4 3 13-7 13-5 0-8-3-6-5 3-3 7 2 5 6-1 3-4 3-5 2",
  fit: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  focus: "M8 8h8v8H8ZM4 4h3M4 4v3m16-3h-3m3 0v3M4 20h3m-3 0v-3m16 3h-3m3 0v-3",
};
function Modal({ title, onClose, children }: any) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="wb-dialog" onCancel={onClose}>
      <header>
        <h2>{title}</h2>
        <button aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function App({ r }: { r: Runtime }) {
  const [, rerender] = useState(0),
    [api, setApi] = useState<any>(null),
    [nativeOverlay, setNativeOverlay] = useState(false),
    [lang, setLang] = useState(r.ctx.language || "en"),
    [theme, setTheme] = useState(r.ctx.theme || "light"),
    [zen, setZen] = useState(false),
    [modal, setModal] = useState(""),
    [mode, setMode] = useState<string | null>(null),
    [points, setPoints] = useState<any[]>([]),
    [format, setFormat] = useState("editable"),
    [scope, setScope] = useState("all"),
    [bg, setBg] = useState(true),
    [scale, setScale] = useState("1"),
    [shareRole, setShareRole] = useState("view"),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [prepared, setPrepared] = useState<{ url: string; name: string } | null>(
      null,
    ),
    [notice, setNotice] = useState(""),
    [draftTitle, setDraftTitle] = useState(r.doc.title);
  const picker = useRef<HTMLInputElement>(null),
    imagePicker = useRef<HTMLInputElement>(null),
    gesture = useRef<any>(null),
    fa = lang === "fa",
    t = (s: string) => (fa ? words[s] || s : s);
  useEffect(
    () =>
      r.onChange(() => {
        rerender((n) => n + 1);
        if (
          document.activeElement?.getAttribute("aria-label") !==
          (fa ? "بوم" : "Canvas")
        )
          setDraftTitle(r.doc.title);
      }),
    [r, fa],
  );
  useEffect(() => {
    document.documentElement.lang = fa ? "fa" : "en";
    document.documentElement.dataset.theme = theme;
  }, [fa, theme]);
  const initial = useMemo(() => r.initial(), [r]);
  useEffect(() => {
    setPrepared(null);
  }, [format, scope, bg, scale, modal]);
  useEffect(
    () => () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    },
    [prepared],
  );
  const getSelected = () => {
    const selected = api.getAppState().selectedElementIds;
    return api
      .getSceneElements()
      .filter((e: any) => selected[e.id] || selected[e.containerId]);
  };
  const capture = useCallback(
    (elements: any, state: any, files: any) => {
      setNativeOverlay(
        !!(
          state.openMenu ||
          state.openSidebar ||
          state.openDialog ||
          state.contextMenu
        ),
      );
      r.capture(elements, state, files);
    },
    [r],
  );
  const setEditor = useCallback(
    (editor: any) => {
      setApi(editor);
      r.setApi(editor);
    },
    [r],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.isComposing ||
        target.closest('input,textarea,[contenteditable="true"]')
      )
        return;
      if (
        (e.ctrlKey || e.metaKey) &&
        ["s", "o"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key.toLowerCase() === "s") setModal("export");
        else if (r.role !== "view") picker.current?.click();
        return;
      }
      if (e.key.toLowerCase() === "q" && e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setMode((m) => (m === "lasso" ? null : "lasso"));
      }
      if (e.key === "Escape") setMode(null);
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, []);
  function insert(elements: any[], files: any = {}) {
    if (!api || r.role === "view") return;
    api.addFiles(Object.values(files));
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
      appState: {
        selectedElementIds: Object.fromEntries(
          elements.map((e) => [e.id, true]),
        ),
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    r.capture(
      api.getSceneElementsIncludingDeleted(),
      api.getAppState(),
      api.getFiles(),
    );
    api.scrollToContent(elements, { fitToContent: true, animate: true });
  }
  async function sample() {
    try {
      const blob = await fetch("/icons/icon-192.png").then((x) => x.blob()),
        file = {
          id: "damdast-sample-image",
          dataURL: await fileData(blob),
          mimeType: "image/png",
          created: Date.now(),
        };
      const elements = convertToExcalidrawElements([
        {
          id: "start",
          type: "rectangle",
          x: 60,
          y: 80,
          width: 220,
          height: 110,
          backgroundColor: "#e5dbff",
          fillStyle: "solid",
          label: { text: "شروع / Start", fontFamily: 2, fontSize: 24 },
        },
        {
          id: "decision",
          type: "diamond",
          x: 400,
          y: 50,
          width: 230,
          height: 170,
          backgroundColor: "#fff3bf",
          fillStyle: "solid",
          label: { text: "ادامه بدهیم؟", fontFamily: 2, fontSize: 22 },
        },
        {
          id: "finish",
          type: "ellipse",
          x: 750,
          y: 80,
          width: 220,
          height: 110,
          backgroundColor: "#d3f9d8",
          fillStyle: "solid",
          label: { text: "پایان / Done", fontFamily: 2, fontSize: 24 },
        },
        {
          type: "arrow",
          x: 280,
          y: 135,
          points: [
            [0, 0],
            [120, 0],
          ],
          start: { id: "start" },
          end: { id: "decision" },
          endArrowhead: "arrow",
        },
        {
          type: "arrow",
          x: 630,
          y: 135,
          points: [
            [0, 0],
            [120, 0],
          ],
          start: { id: "decision" },
          end: { id: "finish" },
          endArrowhead: "arrow",
          elbowed: true,
        },
        {
          type: "image",
          x: 450,
          y: 300,
          width: 120,
          height: 120,
          fileId: file.id as any,
        } as any,
      ]);
      insert(elements, { [file.id]: file });
    } catch (e) {
      r.fail(e);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8000000) throw Error();
      const raw = JSON.parse(await file.text()),
        doc = raw.schemaVersion
          ? raw
          : {
              ...emptyDocument(),
              title: raw.appState?.name || r.doc.title,
              scene: {
                elements: raw.elements,
                files: raw.files || {},
                settings: {
                  viewBackgroundColor:
                    raw.appState?.viewBackgroundColor || "#ffffff",
                  gridSize: raw.appState?.gridSize || null,
                  gridStep: raw.appState?.gridStep || 5,
                },
              },
            };
      if (!raw.schemaVersion && raw.type !== "excalidraw") throw Error();
      validateDocument(doc);
      const data = restore(
        {
          elements: doc.scene.elements,
          files: doc.scene.files,
          appState: doc.scene.settings,
        },
        null,
        null,
        { repairBindings: true },
      );
      r.rename(doc.title);
      api.addFiles(Object.values(data.files));
      api.updateScene({
        elements: data.elements,
        appState: doc.scene.settings,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      r.capture(
        api.getSceneElementsIncludingDeleted(),
        api.getAppState(),
        api.getFiles(),
      );
      api.scrollToContent(undefined, { fitToContent: true });
      setNotice("");
    } catch {
      setNotice("Invalid file. Your current document was kept.");
    }
    if (picker.current) picker.current.value = "";
  }
  async function importImage(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error("Use images under 2 MB.");
      const fileId = crypto.randomUUID(),
        dataURL = await fileData(file),
        data = {
          id: fileId,
          dataURL,
          mimeType: file.type,
          created: Date.now(),
        },
        img = await createImageBitmap(file),
        position = viewportCoordsToSceneCoords(
          { clientX: innerWidth / 2, clientY: innerHeight / 2 },
          api.getAppState(),
        ),
        ratio = Math.min(1, 500 / Math.max(img.width, img.height));
      const elements = convertToExcalidrawElements([
        {
          type: "image",
          x: position.x,
          y: position.y,
          width: img.width * ratio,
          height: img.height * ratio,
          fileId: fileId as any,
        },
      ]);
      validateDocument({
        ...r.doc,
        scene: {
          ...r.doc.scene,
          elements: [...r.doc.scene.elements, ...elements],
          files: { ...r.doc.scene.files, [fileId]: data },
        },
      });
      insert(elements, { [fileId]: data });
      img.close();
    } catch (e) {
      setNotice(String((e as any).message));
    }
    if (imagePicker.current) imagePicker.current.value = "";
  }
  async function exportFile() {
    if (!api) return;
    setBusy(true);
    try {
      const elements =
        scope === "selected" ? getSelected() : api.getSceneElements();
      if (!elements.length)
        throw Error(
          scope === "selected"
            ? "Choose at least one element."
            : "The canvas is empty.",
        );
      const ids = new Set(
          elements
            .filter((e: any) => e.type === "image")
            .map((e: any) => e.fileId),
        ),
        files = Object.fromEntries(
          Object.entries(api.getFiles()).filter(([id]) => ids.has(id)),
        ),
        state = {
          ...api.getAppState(),
          name: r.doc.title,
          exportBackground: bg,
          exportWithDarkMode: false,
          exportScale: Number(scale),
        };
      let blob: Blob, ext: string;
      if (format === "editable") {
        blob = new Blob(
          [serializeAsJSON(elements, state, files as any, "local")],
          { type: "application/json" },
        );
        ext = "excalidraw";
      } else if (format === "png") {
        blob = await exportToBlob({
          elements,
          files: files as any,
          appState: state,
          getDimensions: (w, h) => ({
            width: w * Number(scale),
            height: h * Number(scale),
            scale: Number(scale),
          }),
        });
        ext = "png";
      } else {
        const svg = await exportToSvg({
          elements,
          files: files as any,
          appState: state,
        });
        await embedDocumentFont(svg);
        blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
        ext = "svg";
      }
      setPrepared(
        prepareDownload(
          blob,
          `${r.doc.title.replace(/[\\/:*?"<>|]/g, "_")}.${ext}`,
        ),
      );
    } catch (e) {
      setNotice(String((e as any).message));
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    setBusy(true);
    try {
      await r.flush();
      const grant = await r.request(`/api/whiteboards/${r.ctx.id}/shares`, {
        method: "POST",
        body: JSON.stringify({ role: shareRole }),
      });
      setLink(
        `${location.origin}/whiteboard/index.html?document=${r.ctx.id}#access=${grant.token}`,
      );
    } catch (e) {
      setNotice(String((e as any).message));
    } finally {
      setBusy(false);
    }
  }
  function begin(e: React.PointerEvent<SVGSVGElement>) {
    if (r.role === "view") return;
    const p = [e.clientX, e.clientY];
    gesture.current = { points: [p], shift: e.shiftKey };
    setPoints([p]);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!gesture.current) return;
    gesture.current.points.push([e.clientX, e.clientY]);
    setPoints([...gesture.current.points]);
  }
  function end(e: React.PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    const state = api.getAppState();
    if (mode === "sticky") {
      const first = viewportCoordsToSceneCoords(
          { clientX: g.points[0][0], clientY: g.points[0][1] },
          state,
        ),
        last = viewportCoordsToSceneCoords(
          { clientX: e.clientX, clientY: e.clientY },
          state,
        ),
        w = Math.abs(last.x - first.x),
        h = Math.abs(last.y - first.y);
      insert(
        convertToExcalidrawElements([
          {
            type: "rectangle",
            x: Math.min(first.x, last.x),
            y: Math.min(first.y, last.y),
            width: w < 20 ? 200 : w,
            height: h < 20 ? 170 : h,
            fillStyle: "solid",
            backgroundColor: "#fff3bf",
            roughness: 0,
            label: {
              text: t("Note"),
              fontFamily: 2,
              fontSize: 24,
              verticalAlign: "top",
            },
          },
        ]),
      );
    } else {
      const polygon = g.points,
        inside = (x: number, y: number) => {
          let hit = false;
          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [a, b] = polygon[i],
              [c, d] = polygon[j];
            if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a)
              hit = !hit;
          }
          return hit;
        },
        selected: any = g.shift ? { ...state.selectedElementIds } : {};
      for (const el of api.getSceneElements()) {
        const p = sceneCoordsToViewportCoords(
          { sceneX: el.x + el.width / 2, sceneY: el.y + el.height / 2 },
          state,
        );
        if (!el.locked && inside(p.x, p.y)) selected[el.id] = true;
      }
      api.updateScene({
        appState: { selectedElementIds: selected },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      api.setActiveTool({ type: "selection" });
    }
    setPoints([]);
    if (mode === "lasso" || !state.activeTool.locked) setMode(null);
  }
  const button = (
    name: string,
    path: string,
    action: () => void,
    active = false,
  ) => (
    <button
      className={active ? "active" : ""}
      type="button"
      title={t(name)}
      aria-label={t(name)}
      onClick={action}
    >
      <Icon d={path} />
    </button>
  );
  return (
    <div
      className={`wb-app ${window.parent !== window ? "embedded" : ""} ${nativeOverlay ? "wb-overlay-open" : ""}`}
      data-language={lang}
      data-theme={theme}
    >
      <div className="wb-docbar" dir={fa ? "rtl" : "ltr"}>
        <button
          className="wb-back"
          title={t("Back to notes")}
          aria-label={t("Back to notes")}
          onClick={() => void r.close()}
        >
          <Icon d={paths.back} />
        </button>
        <div>
          <span>
            Damdast <i>Canvas</i>
          </span>
          <input
            aria-label={t("Canvas")}
            maxLength={80}
            value={draftTitle}
            disabled={r.role === "view"}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => r.rename(draftTitle)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing)
                e.currentTarget.blur();
            }}
          />
        </div>
        <small
          className={"wb-save status-" + r.status.replaceAll(" ", "-")}
          role="status"
        >
          {t(r.status)}
        </small>
      </div>
      <Excalidraw
        initialData={initial}
        excalidrawAPI={setEditor}
        onChange={capture}
        langCode={fa ? "fa-IR" : "en"}
        theme={theme}
        zenModeEnabled={zen}
        viewModeEnabled={r.role === "view"}
        isCollaborating={r.status === "Live"}
        handleKeyboardGlobally
        autoFocus
        aiEnabled={false}
        validateEmbeddable={false}
        onPointerDown={() => {
          r.gesturing = true;
        }}
        onPointerUpdate={(p) => r.pointer(p)}
        onLibraryChange={(items) =>
          void r.libraryChanged(items).catch((e) => r.fail(e))
        }
        onLinkOpen={(element, event) => {
          if (!safeLink(element.link || "")) event.preventDefault();
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
          },
        }}
      >
        <MainMenu>
          {r.role !== "view" && (
            <MainMenu.Item onSelect={() => picker.current?.click()}>
              {t("Import")}
            </MainMenu.Item>
          )}
          <MainMenu.Item onSelect={() => setModal("export")}>
            {t("Export")}
          </MainMenu.Item>
          {r.role !== "view" && (
            <>
              <MainMenu.Item onSelect={() => imagePicker.current?.click()}>
                {t("Import image")}
              </MainMenu.Item>
              <MainMenu.Item onSelect={() => void sample()}>
                {t("Insert sample flowchart")}
              </MainMenu.Item>
            </>
          )}
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.CommandPalette />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          {r.role !== "view" && <MainMenu.DefaultItems.ClearCanvas />}
        </MainMenu>
      </Excalidraw>
      <button
        className="wb-file-menu"
        aria-expanded={nativeOverlay}
        title={t("Canvas menu")}
        aria-label={t("Canvas menu")}
        onClick={() =>
          api?.updateScene({
            appState: {
              openMenu:
                api.getAppState().openMenu === "canvas" ? null : "canvas",
            },
            captureUpdate: CaptureUpdateAction.NEVER,
          })
        }
      >
        <Icon d="m4 16 10-10 4 4-10 10H4Zm8-8 4 4M16 4l2-2 4 4-2 2" />
        <span aria-hidden="true">⋯</span>
      </button>
      <div className="wb-top-actions">
        {button("Export", paths.export, () => setModal("export"))}
        {button("Share", paths.share, () => {
          setNotice("");
          setModal("share");
        })}
        <button
          aria-label="Theme"
          title="Theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
      <div className="wb-extras">
        {r.role !== "view" && (
          <>
            {button(
              "Sticky note",
              paths.sticky,
              () => setMode(mode === "sticky" ? null : "sticky"),
              mode === "sticky",
            )}
            {button(
              "Lasso",
              paths.lasso,
              () => setMode(mode === "lasso" ? null : "lasso"),
              mode === "lasso",
            )}
          </>
        )}
        {button("Fit content", paths.fit, () =>
          api?.scrollToContent(undefined, {
            fitToContent: true,
            animate: true,
          }),
        )}
        {button("Fit selection", paths.fit, () => {
          const selected = getSelected();
          if (selected.length)
            api.scrollToContent(selected, {
              fitToContent: true,
              animate: true,
            });
        })}
        <button
          aria-label={t("100%")}
          onClick={() =>
            api?.updateScene({
              appState: { zoom: { value: 1 } },
              captureUpdate: CaptureUpdateAction.NEVER,
            })
          }
        >
          1:1
        </button>
        {button("Focus mode", paths.focus, () => setZen(!zen), zen)}
        <button
          aria-label={t("Grid")}
          onClick={() => {
            api?.updateScene({
              appState: {
                gridSize: api.getAppState().gridSize ? null : 20,
              },
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }}
        >
          ▦
        </button>
      </div>

      {mode && (
        <svg
          className="wb-selection-overlay"
          aria-label={t(mode === "sticky" ? "Sticky note" : "Lasso")}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
        >
          {mode === "lasso" ? (
            <polyline
              points={points.map((p) => p.join(",")).join(" ")}
              fill="#a88fdb22"
              stroke="#9a7dca"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
          ) : points.length > 1 ? (
            <rect
              x={Math.min(points[0][0], points.at(-1)[0])}
              y={Math.min(points[0][1], points.at(-1)[1])}
              width={Math.abs(points.at(-1)[0] - points[0][0])}
              height={Math.abs(points.at(-1)[1] - points[0][1])}
              fill="#fff3bfbb"
              stroke="#ae98c9"
            />
          ) : null}
        </svg>
      )}
      {(r.error || notice) && (
        <div className="wb-warning" role="alert" dir="auto">
          <span>{t(notice || r.error)}</span>
          <button
            onClick={() => {
              r.error = "";
              setNotice("");
              r.emit();
            }}
            aria-label={t("Close")}
          >
            ×
          </button>
          {r.status === "Save failed" && (
            <button
              onClick={() =>
                void r
                  .flush()
                  .then(() => {
                    r.error = "";
                    r.emit();
                  })
                  .catch((e) => r.fail(e))
              }
            >
              {t("Retry save")}
            </button>
          )}
        </div>
      )}
      {r.sync.conflict && (
        <div className="wb-conflict" role="alert" dir={fa ? "rtl" : "ltr"}>
          <strong>{t("Some elements changed on another device.")}</strong>
          <button onClick={() => r.sync.resolve(true)}>
            {t("Keep my changes")}
          </button>
          <button onClick={() => r.sync.resolve(false)}>
            {t("Use remote changes")}
          </button>
        </div>
      )}
      <input
        hidden
        ref={picker}
        type="file"
        accept=".excalidraw,.json"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      <input
        hidden
        ref={imagePicker}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => void importImage(e.target.files?.[0])}
      />
      {modal === "export" && (
        <Modal title={t("Export")} onClose={() => setModal("")}>
          <div className="wb-form" dir={fa ? "rtl" : "ltr"}>
            <label>
              {t("Export")}
              <select
                aria-label={t("Export")}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="editable">
                  {t("Editable file")} · .excalidraw
                </option>
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </label>
            <label>
              {t("Selection")}
              <select
                aria-label={t("Selection")}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="all">{t("Entire document")}</option>
                <option value="selected">{t("Selection")}</option>
              </select>
            </label>
            <label>
              {t("Scale")}
              <select
                aria-label={t("Scale")}
                value={scale}
                onChange={(e) => setScale(e.target.value)}
              >
                {["1", "2", "3"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="wb-check">
              <input
                type="checkbox"
                checked={bg}
                onChange={(e) => setBg(e.target.checked)}
              />
              {t("Background")}
            </label>
            {notice && <p role="alert">{t(notice)}</p>}
            {prepared ? (
              <a
                className="wb-primary wb-download"
                href={prepared.url}
                download={prepared.name}
              >
                {t("Download")}
              </a>
            ) : (
              <button
                className="wb-primary"
                disabled={busy}
                onClick={() => void exportFile()}
              >
                {t("Prepare file")}
              </button>
            )}
          </div>
        </Modal>
      )}
      {modal === "share" && (
        <Modal title={t("Share")} onClose={() => setModal("")}>
          <div className="wb-form" dir={fa ? "rtl" : "ltr"}>
            {!r.enabled ? (
              <p>{t("Sharing needs a signed-in .NET server.")}</p>
            ) : !r.capabilities.sharing ? (
              <p>
                {t(
                  "Live rooms are not available on this host. Use the .NET server.",
                )}
              </p>
            ) : (
              <>
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value)}
                  aria-label={t("Share")}
                >
                  <option value="view">{t("Read-only link")}</option>
                  <option value="edit">{t("Collaboration room")}</option>
                </select>
                <button
                  className="wb-primary"
                  disabled={busy || r.role !== "owner"}
                  onClick={() => void share()}
                >
                  {t("Create link")}
                </button>
                {link && (
                  <>
                    <textarea readOnly value={link} aria-label={t("Share")} />
                    <button
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(link)
                          .then(() => setNotice("Copied"))
                      }
                    >
                      {t("Copy")}
                    </button>
                  </>
                )}
                <button
                  disabled={r.role !== "owner"}
                  onClick={() =>
                    void r
                      .request(`/api/whiteboards/${r.ctx.id}/shares`, {
                        method: "DELETE",
                      })
                      .then(() => setLink(""))
                      .catch((e) => setNotice(e.message))
                  }
                >
                  {t("Revoke all links")}
                </button>
              </>
            )}
            {notice && <p role="alert">{t(notice)}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
async function start() {
  try {
    const ctx = await context(),
      runtime = new Runtime(ctx);
    await runtime.initialize();
    createRoot(document.getElementById("root")!).render(<App r={runtime} />);
  } catch (e) {
    const root = document.getElementById("root")!;
    root.className = "wb-fatal";
    const title = document.createElement("h1");
    title.textContent =
      "Could not open the saved canvas / باز کردن بوم ممکن نشد";
    const text = document.createElement("p");
    text.textContent = String((e as any).message);
    const back = document.createElement("a");
    back.href = "/#canvas";
    back.textContent = "Back to notes / بازگشت به یادداشت‌ها";
    root.replaceChildren(title, text, back);
  }
}
void start();
