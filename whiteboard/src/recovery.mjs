import { emptyDocument, validateDocument } from "./model.mjs";

export function normalizeSavedRecord(value) {
  const record = structuredClone(value);
  let document = record?.document || record;
  if (typeof document === "string") document = JSON.parse(document);
  if (document?.type === "excalidraw" && Array.isArray(document.elements)) {
    document = {
      ...emptyDocument(),
      title: document.name || "Untitled canvas",
      scene: {elements: document.elements, files: document.files || {}, settings: document.appState || {}},
    };
  }
  if (!document || document.engine !== "excalidraw" || !document.scene)
    throw Error("Unrecognized saved canvas format.");
  document.scene.settings = {...emptyDocument().scene.settings, ...document.scene.settings};
  if (document.scene.settings.gridStep == null) document.scene.settings.gridStep = 5;
  if (document.scene.settings.gridSize == null) document.scene.settings.gridSize = null;
  document.scene.files ||= {};
  if (Array.isArray(document.scene.elements))
    document.scene.elements = document.scene.elements.map(element=>({...element,angle:element.angle ?? 0}));
  validateDocument(document);
  return {...(record?.document ? record : {}), document};
}

export function canvasUi(value) {
  const ui = {};
  for (const field of ["scrollX", "scrollY", "viewportWidth"])
    if (Number.isFinite(value?.[field])) ui[field] = value[field];
  const zoom = typeof value?.zoom === "number" ? value.zoom : value?.zoom?.value;
  if (Number.isFinite(zoom) && zoom >= .1 && zoom <= 30) ui.zoom = {value:zoom};
  return ui;
}
