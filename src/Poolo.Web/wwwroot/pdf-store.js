export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_NOTE_PDFS = 10;
const validId = (id) => typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
export function validatePdfMetadata(file) {
  if (!file || !validId(file.id) || typeof file.name !== 'string' || !file.name.trim() || file.name.length > 255 || file.type !== 'application/pdf' || !Number.isSafeInteger(file.size) || file.size < 5 || file.size > MAX_PDF_BYTES)
    throw Error('Invalid PDF attachment.');
  return file;
}
export function validatePdfBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 5 || bytes.length > MAX_PDF_BYTES || new TextDecoder('ascii').decode(bytes.slice(0, 1024)).indexOf('%PDF-') < 0)
    throw Error('Choose a valid PDF file (up to 25 MB).');
  return bytes;
}
export async function validatePdfFile(file) {
  if (!file || file.size > MAX_PDF_BYTES || !/\.pdf$/i.test(file.name)) throw Error('Choose a valid PDF file (up to 25 MB).');
  validatePdfBytes(new Uint8Array(await file.arrayBuffer()));
}
async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('damdast-note-pdfs-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readPdf(scope, id) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(`${scope}:${id}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function writePdf(scope, metadata, blob) {
  validatePdfMetadata(metadata);
  if (!(blob instanceof Blob) || blob.size !== metadata.size) throw Error('Invalid PDF attachment.');
  validatePdfBytes(new Uint8Array(await blob.arrayBuffer()));
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put({ ...metadata, blob }, `${scope}:${metadata.id}`);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
export function base64ToBytes(text) {
  if (typeof text !== 'string' || text.length > Math.ceil(MAX_PDF_BYTES / 3) * 4) throw Error('Invalid PDF attachment.');
  try { return validatePdfBytes(Uint8Array.from(atob(text), (c) => c.charCodeAt(0))); }
  catch { throw Error('Invalid PDF attachment.'); }
}
