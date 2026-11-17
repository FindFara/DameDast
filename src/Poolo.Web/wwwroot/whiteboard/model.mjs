export const ENGINE_VERSION = "0.18.1",
  MAX_BYTES = 8000000;
export const emptyDocument = () => ({
  schemaVersion: 1,
  engine: "excalidraw",
  engineVersion: ENGINE_VERSION,
  title: "Untitled canvas",
  scene: {
    elements: [],
    files: {},
    settings: { viewBackgroundColor: "#ffffff", gridSize: null, gridStep: 5 },
  },
});
const types = new Set([
  "rectangle",
  "diamond",
  "ellipse",
  "line",
  "arrow",
  "freedraw",
  "text",
  "image",
  "frame",
]);
const id = (v) =>
  typeof v === "string" &&
  !["__proto__", "constructor", "prototype"].includes(v) &&
  /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const color = (v) =>
  typeof v === "string" && /^(#[0-9a-fA-F]{3,8}|transparent)$/.test(v);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function validateDocument(doc) {
  if (
    doc?.schemaVersion !== 1 ||
    doc.engine !== "excalidraw" ||
    typeof doc.title !== "string" ||
    !doc.title.trim() ||
    doc.title.length > 80 ||
    !Array.isArray(doc.scene?.elements) ||
    doc.scene.elements.length > 3000 ||
    !doc.scene.files ||
    Object.keys(doc.scene.files).length > 50 ||
    !color(doc.scene.settings?.viewBackgroundColor) ||
    new TextEncoder().encode(JSON.stringify(doc)).length > MAX_BYTES
  )
    throw Error("Invalid or oversized document.");
  const ids = new Set();
  for (const e of doc.scene.elements) {
    if (
      !e ||
      !id(e.id) ||
      ids.has(e.id) ||
      !types.has(e.type) ||
      ![e.x, e.y, e.width, e.height, e.angle].every(
        (n) => Number.isFinite(n) && Math.abs(n) <= 1e7,
      )
    )
      throw Error("Invalid element geometry.");
    ids.add(e.id);
    for (const key of ["strokeColor", "backgroundColor"])
      if (e[key] != null && !color(e[key]))
        throw Error("Invalid element color.");
    if (
      (e.index != null && typeof e.index !== "string") ||
      (e.isDeleted != null && typeof e.isDeleted !== "boolean")
    )
      throw Error("Invalid element state.");
    if (e.text != null && (typeof e.text !== "string" || e.text.length > 20000))
      throw Error("Text is too long.");
    if (e.link && !safeLink(e.link)) throw Error("Unsafe element link.");
    if (
      e.points &&
      (!Array.isArray(e.points) ||
        e.points.length > 20000 ||
        e.points.some(
          (p) =>
            !Array.isArray(p) ||
            p.length !== 2 ||
            p.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e7),
        ))
    )
      throw Error("Invalid stroke points.");
    if (e.type === "image" && !e.isDeleted && !doc.scene.files[e.fileId])
      throw Error("An image is missing from the document.");
  }
  for (const [key, file] of Object.entries(doc.scene.files)) {
    if (
      !id(key) ||
      file.id !== key ||
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.mimeType,
      ) ||
      typeof file.dataURL !== "string" ||
      file.dataURL.length > 2800000 ||
      !file.dataURL.startsWith(`data:${file.mimeType};base64,`)
    )
      throw Error("Use PNG, JPEG, WebP or GIF images under 2 MB.");
    try {
      const raw = atob(file.dataURL.split(",")[1]),
        png = raw.startsWith("\x89PNG\r\n\x1a\n"),
        jpg = raw.startsWith("\xff\xd8\xff"),
        gif = raw.startsWith("GIF8"),
        webp = raw.startsWith("RIFF") && raw.slice(8, 12) === "WEBP";
      if (
        raw.length > 2000000 ||
        !{
          "image/png": png,
          "image/jpeg": jpg,
          "image/gif": gif,
          "image/webp": webp,
        }[file.mimeType]
      )
        throw Error();
    } catch {
      throw Error("Invalid image content.");
    }
  }
  const s = doc.scene.settings;
  if (
    (s.gridSize != null &&
      (!Number.isInteger(s.gridSize) || s.gridSize < 1 || s.gridSize > 1000)) ||
    !Number.isInteger(s.gridStep) ||
    s.gridStep < 1 ||
    s.gridStep > 100
  )
    throw Error("Invalid document settings.");
  return doc;
}
export function safeLink(link) {
  try {
    const u = new URL(link, "https://local.invalid");
    return (
      ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !link.includes("\\")
    );
  } catch {
    return false;
  }
}
export const asDocument = (state) => ({
  schemaVersion: 1,
  engine: "excalidraw",
  engineVersion: ENGINE_VERSION,
  title: state.title,
  scene: structuredClone(state.scene),
});
export const emptyServer = () => ({
  revision: 0,
  title: "Untitled canvas",
  scene: emptyDocument().scene,
  elementVersions: {},
  settingsVersion: 0,
});
const byId = (scene) => new Map(scene.elements.map((e) => [e.id, e]));
export function differences(base, local) {
  const a = byId(base),
    b = byId(local),
    changes = [];
  for (const [key, e] of b) if (!same(e, a.get(key))) changes.push(e);
  for (const [key, e] of a)
    if (!b.has(key) && !e.isDeleted)
      changes.push({ ...e, isDeleted: true, version: (e.version || 1) + 1 });
  return changes;
}
export function makePatch(base, local) {
  const changes = differences(base.scene, local.scene).map((element) => ({
      id: element.id,
      expectedVersion: base.elementVersions[element.id] || 0,
      element,
    })),
    settingsChanged =
      base.revision === 0 ||
      !same(base.scene.settings, local.scene.settings) ||
      base.title !== local.title;
  if (
    !changes.length &&
    !settingsChanged &&
    !Object.keys(local.scene.files).some((id) => !base.scene.files[id])
  )
    return null;
  return {
    operationId: crypto.randomUUID(),
    changes,
    files: Object.fromEntries(
      Object.entries(local.scene.files).filter(([id]) => !base.scene.files[id]),
    ),
    ...(settingsChanged
      ? {
          settings: local.scene.settings,
          title: local.title,
          expectedSettingsVersion: base.settingsVersion,
        }
      : {}),
  };
}
export function overlayDocument(remote, local, changed) {
  const elements = byId(remote.scene);
  for (const e of changed) elements.set(e.id, e);
  return {
    ...remote,
    scene: {
      ...remote.scene,
      elements: [...elements.values()].sort((a, b) =>
        (a.index || "z") === (b.index || "z")
          ? 0
          : (a.index || "z") < (b.index || "z")
            ? -1
            : 1,
      ),
      files: { ...remote.scene.files, ...local.scene.files },
    },
  };
}
export function mergeRemote(base, local, remote) {
  const changes = differences(base.scene, local.scene),
    conflicts = changes
      .filter(
        (e) =>
          (remote.elementVersions[e.id] || 0) !==
            (base.elementVersions[e.id] || 0) &&
          !same(e, byId(remote.scene).get(e.id)),
      )
      .map((e) => e.id);
  const settingsChanged =
    base.revision === 0 ||
    !same(base.scene.settings, local.scene.settings) ||
    base.title !== local.title;
  if (
    settingsChanged &&
    base.settingsVersion !== remote.settingsVersion &&
    !same(
      { title: remote.title, settings: remote.scene.settings },
      { title: local.title, settings: local.scene.settings },
    )
  )
    conflicts.push("$settings");
  const next = overlayDocument(asDocument(remote), local, changes);
  if (settingsChanged) {
    next.title = local.title;
    next.scene.settings = local.scene.settings;
  }
  return { document: next, conflicts };
}
export function acknowledge(sent, current, remote) {
  const next = overlayDocument(
    asDocument(remote),
    current,
    differences(sent.scene, current.scene),
  );
  if (
    sent.title !== current.title ||
    !same(sent.scene.settings, current.scene.settings)
  ) {
    next.title = current.title;
    next.scene.settings = current.scene.settings;
  }
  return next;
}
