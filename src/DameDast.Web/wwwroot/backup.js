import { scopedStorageKey } from "./account-scope.js";
import { LEGACY_BACKUP_FORMAT } from "./legacy-storage.js";
import { readPdf, writePdf, validatePdfMetadata, base64ToBytes, bytesToBase64, MAX_NOTE_PDFS } from "./pdf-store.js";
import { validatePreferences } from "./preferences.js";
import {
  validateDocument,
  emptyServer,
  asDocument,
  mergeRemote,
} from "./whiteboard/model.mjs";
import { read, write, saveDocument } from "./whiteboard/storage.mjs";
import { validateWorkbench } from "./workbench.js";
import { validateCalendarEntry } from "./planner.js";
import { validateDrawing } from "./drawing.js";
import { languageKinds, validateLanguage } from "./language-model.js";
import { validateProductivity } from "./productivity.js";
export const BACKUP_LIMIT = 128_000_000;
const guid = (v) =>
  typeof v === "string" &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v) &&
  !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(v);
const kinds = new Set([
  ...languageKinds,
  "account",
  "transaction",
  "budget",
  "goal",
  "installment",
  "receivable",
  "locked",
  "note",
  "noteLabel",
  "reminder",
  "notificationRead",
  "category",
  "allocationPlan",
  "monthlyExpense",
  "investmentStep",
  "benchmarkSeries",
  "externalSnapshot",
  "assetPosition",
  "workbench",
  "calendarEvent",
  "project", "bookmark", "habit", "habitLog",
]);
export const backupSections = ["all", "notes", "finance"];
const writingKinds = new Set([...languageKinds,"note", "noteLabel", "reminder", "calendarEvent", "notificationRead", "bookmark", "habit", "habitLog"]);
export function selectBackupRecords(records, section = "all") {
  if (!backupSections.includes(section)) throw Error("Invalid backup section.");
  return records.filter((r) => !r.deleted && (section === "all" || r.kind === "project" || (section === "notes" ? writingKinds.has(r.kind) : !writingKinds.has(r.kind) && r.kind !== "workbench")));
}
export async function latestCanvas(scope, id) {
  const key = await read("index", `${scope}:${id}`);
  return key ? await read("documents", key) : null;
}
export function validateBackup(input) {
  if (
    !input ||
    ![LEGACY_BACKUP_FORMAT, "damedast-v1", "damdast-v2", "damdast-v3"].includes(input.format) ||
    !Array.isArray(input.records) ||
    input.records.length > 50000
  )
    throw Error("Invalid backup file.");
  const section = input.section || "all";
  if (!backupSections.includes(section) || (section !== "all" && selectBackupRecords(input.records.filter((r) => !r?.deleted), section).length !== input.records.filter((r) => !r?.deleted).length))
    throw Error("Invalid backup section.");
  const ids = new Set();
  for (const r of input.records) {
    if (
      !r ||
      !guid(r.id) ||
      ids.has(r.id) ||
      !kinds.has(r.kind) ||
      !r.data ||
      typeof r.data !== "object" ||
      Array.isArray(r.data)
    )
      throw Error("Invalid backup record.");
    ids.add(r.id);
    for (const key of ["title", "name", "person", "body", "description"])
      if (r.data[key] != null && typeof r.data[key] !== "string")
        throw Error("Invalid backup record.");
    for (const key of [
      "amount",
      "openingBalance",
      "target",
      "saved",
      "returned",
      "limit",
    ])
      if (
        r.data[key] != null &&
        (!Number.isSafeInteger(r.data[key]) || Math.abs(r.data[key]) > 1e12)
      )
        throw Error("Invalid backup record.");
    if (languageKinds.includes(r.kind)) validateLanguage(r.kind,r.data,input.records,r.id);
    if (r.kind === "workbench") validateWorkbench(r.data);
    if (r.kind === "calendarEvent") validateCalendarEntry(r.data);
    if (r.kind === "note" && r.data.drawing) validateDrawing(r.data.drawing);
    if (["project", "bookmark", "habit", "habitLog"].includes(r.kind)) validateProductivity(r.kind, r.data, input.records, r.id);
  }
  if (input.preferences) validatePreferences(input.preferences);
  const pdfs = input.pdfs || [];
  if (!Array.isArray(pdfs) || pdfs.length > 1000) throw Error("Invalid PDF attachment.");
  const pdfIds = new Map();
  for (const file of pdfs) {
    validatePdfMetadata(file);
    if (pdfIds.has(file.id) || base64ToBytes(file.data).length !== file.size) throw Error("Invalid PDF attachment.");
    pdfIds.set(file.id, file);
  }
  for (const r of input.records) if (r.kind === "note" && r.data.attachments !== undefined) {
    if (!Array.isArray(r.data.attachments) || r.data.attachments.length > MAX_NOTE_PDFS) throw Error("Invalid PDF attachment.");
    const seen = new Set();
    for (const file of r.data.attachments) {
      validatePdfMetadata(file);
      if (seen.has(file.id) || !pdfIds.has(file.id) || pdfIds.get(file.id).size !== file.size) throw Error("This backup is missing a PDF attachment.");
      seen.add(file.id);
    }
  }
  const scenes = input.whiteboards || [];
  if (!Array.isArray(scenes) || scenes.length > 1000)
    throw Error("Invalid backup canvases.");
  const sceneIds = new Set();
  for (const s of scenes) {
    if (!guid(s.id) || sceneIds.has(s.id))
      throw Error("Invalid backup canvases.");
    sceneIds.add(s.id);
    validateDocument(s.document);
  }
  if (
    ["damdast-v2", "damdast-v3"].includes(input.format) &&
    input.records.some(
      (r) =>
        r.kind === "note" &&
        r.data.whiteboardId &&
        !sceneIds.has(r.data.whiteboardId),
    )
  )
    throw Error("This backup is missing a linked canvas.");
  if (new TextEncoder().encode(JSON.stringify(input)).length > BACKUP_LIMIT)
    throw Error("The backup exceeds 128 MB. Export canvases separately.");
  return input;
}
export async function createBackup({
  records,
  scope,
  request,
  prefs,
  readCanvas = latestCanvas,
  readPdfFile = readPdf,
  section = "all",
}) {
  records = selectBackupRecords(records, section);
  const ids = [
      ...new Set(
        records
          .filter((r) => r.kind === "note" && r.data.whiteboardId)
          .map((r) => r.data.whiteboardId),
      ),
    ],
    whiteboards = [];
  for (const id of ids) {
    const local = await readCanvas(scope, id);
    let document = local?.document,
      remote;
    if (scope.startsWith("google:")) {
      try {
        const response = await request(`/api/legacy/whiteboards/${id}`);
        if (response.ok) remote = await response.json();
      } catch {}
    }
    if (remote?.exists) {
      if (document) {
        const merged = mergeRemote(
          local.base || emptyServer(),
          document,
          remote.state,
        );
        if (merged.conflicts.length)
          throw Error("Resolve canvas conflicts before making a backup.");
        document = merged.document;
      } else document = asDocument(remote.state);
    }
    if (!document)
      throw Error("A canvas is unavailable. Open it online before backing up.");
    validateDocument(document);
    whiteboards.push({ id, document });
  }
  const pdfs = [], seenPdfs = new Set();
  for (const record of records) if (record.kind === "note") {
    for (const metadata of record.data.attachments || []) {
      validatePdfMetadata(metadata);
      if (seenPdfs.has(metadata.id)) continue;
      const file = await readPdfFile(scope, metadata.id);
      if (!file?.blob || file.blob.size !== metadata.size) throw Error("This PDF is unavailable on this device. Restore it from a notes backup.");
      pdfs.push({ ...metadata, data: bytesToBase64(new Uint8Array(await file.blob.arrayBuffer())) });
      seenPdfs.add(metadata.id);
    }
  }
  return validateBackup({
    format: "damdast-v3",
    version: 3,
    section,
    pdfs,
    exportedAt: new Date().toISOString(),
    records: structuredClone(records),
    whiteboards,
    preferences: prefs,
  });
}
export async function readBackupFile(file) {
  if (!file || file.size > BACKUP_LIMIT)
    throw Error("The backup exceeds 128 MB. Export canvases separately.");
  let parsed;
  try {
    parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
  } catch {
    throw Error("Invalid backup file.");
  }
  return validateBackup(parsed);
}
export async function restoreBackup(
  input,
  sourceScope,
  { readCanvas = latestCanvas, writeCanvas = saveDocument, writePdfFile = writePdf } = {},
) {
  validateBackup(input);
  const documents = new Map(
    (input.whiteboards || []).map((s) => [s.id, s.document]),
  );
  // Old financial-only backups can reuse a canvas only when its full bytes are still on this device.
  for (const r of input.records)
    if (
      r.kind === "note" &&
      r.data.whiteboardId &&
      !documents.has(r.data.whiteboardId)
    ) {
      const saved = await readCanvas(sourceScope, r.data.whiteboardId);
      if (!saved?.document)
        throw Error(
          "This older backup has no canvas files. A full backup is required.",
        );
      documents.set(r.data.whiteboardId, validateDocument(saved.document));
    }
  const scope = "restore:" + crypto.randomUUID(),
    mapping = new Map(
      [...documents.keys()].map((id) => [id, crypto.randomUUID()]),
    );
  const pdfMapping = new Map((input.pdfs || []).map((file) => [file.id, crypto.randomUUID()]));
  const records = input.records
    .filter((r) => !r.deleted)
    .map((r) => {
      const data = structuredClone(r.data);
      if (r.kind === "note" && data.whiteboardId)
        data.whiteboardId = mapping.get(data.whiteboardId);
      if (r.kind === "note" && data.attachments)
        data.attachments = data.attachments.map((file) => ({ ...file, id: pdfMapping.get(file.id) }));
      return { ...r, version: 1, deleted: false, data };
    });
  // Every document is validated before any write. The new workspace does not replace existing ledgers.
  for (const [id, document] of documents)
    await writeCanvas(scope, mapping.get(id), "backup", {
      document,
      base: emptyServer(),
      flight: null,
    });
  for (const file of input.pdfs || []) {
    const { data, ...metadata } = file;
    await writePdfFile(scope, { ...metadata, id: pdfMapping.get(file.id) }, new Blob([base64ToBytes(data)], { type: "application/pdf" }));
  }
  return {
    scope,
    records,
    pdfs: pdfMapping.size,
    canvases: documents.size,
    preferences: input.preferences,
  };
}
export function restoredWorkspaces() {
  try {
    const list = JSON.parse(
      localStorage.getItem(scopedStorageKey("damdast-restored-workspaces")) || "[]",
    );
    return Array.isArray(list)
      ? list.filter(
          (x) =>
            /^restore:[\da-f-]{36}$/i.test(x.scope) &&
            typeof x.name === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function rememberRestoredWorkspace(scope, name) {
  localStorage.setItem(
    scopedStorageKey("damdast-restored-workspaces"),
    JSON.stringify([...restoredWorkspaces(), { scope, name }]),
  );
  localStorage.setItem(scopedStorageKey("damdast-active-local-workspace"), scope);
}
