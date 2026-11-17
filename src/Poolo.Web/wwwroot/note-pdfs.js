import { t, localizedNumber } from './i18n.js';
import { escapeHtml as esc } from './finance.js';
import { MAX_NOTE_PDFS, validatePdfFile, validatePdfMetadata, readPdf, writePdf } from './pdf-store.js';

const pdfIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M7 15h10M7 18h7"/></svg>';
const fileSize = (size) => size < 1024 * 1024 ? `${localizedNumber(Math.max(1, size / 1024), 1)} KB` : `${localizedNumber(size / 1024 / 1024, 1)} MB`;
export function notePdfEditor() {
  return `<section class="note-pdf-editor"><div class="checklist-editor-head"><strong>${t('PDF attachments')}</strong><label class="secondary pdf-choose">${pdfIcon}${t('Add PDF')}<input id="note-pdf-input" type="file" accept="application/pdf,.pdf" multiple></label></div><div id="note-pdf-list"></div><p class="small-note">${t('PDFs stay on this device and are included in notes backups. Up to 25 MB per file.')}</p><p id="note-pdf-error" class="form-error" role="alert"></p></section>`;
}
export function notePdfLinks(note) {
  return (note.data.attachments || []).map((file) => `<button type="button" class="note-pdf-link" data-pdf-open="${esc(file.id)}" data-pdf-note="${note.id}">${pdfIcon}<span dir="auto">${esc(file.name)}</span><small>${fileSize(file.size)}</small></button>`).join('');
}

export class NotePdfController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.pending = new Map();
    this.files = [];
    this.generation = 0;
    document.addEventListener('change', (event) => {
      if (event.target.id === 'note-pdf-input') {
        this.addPromise = this.addFiles(event.target);
        void this.addPromise.catch((error) => this.editorError(error));
      }
    });
    document.addEventListener('click', (event) => void this.click(event).catch(callbacks.error));
    document.querySelector('#pdf-reader').addEventListener('close', () => this.closeReader());
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => { if (this.document) void this.renderPage().catch((e) => this.readerError(e)); }, 150);
    });
  }
  begin(note) {
    this.draftGeneration = (this.draftGeneration || 0) + 1;
    this.addPromise = null;
    this.files = structuredClone(note?.attachments || []);
    this.pending.clear();
    this.draftScope = this.callbacks.context().space;
    this.paintDraft();
  }
  paintDraft() {
    const list = document.querySelector('#note-pdf-list');
    if (!list) return;
    list.innerHTML = this.files.map((file) => `<div class="note-pdf-row"><button type="button" class="note-pdf-link" data-pdf-draft="${file.id}">${pdfIcon}<span dir="auto">${esc(file.name)}</span><small>${fileSize(file.size)}</small></button><button type="button" class="icon-button" data-pdf-remove="${file.id}" aria-label="${esc(t('Remove PDF') + ': ' + file.name)}">×</button></div>`).join('');
  }
  editorError(error) { const target = document.querySelector('#note-pdf-error'); if (target) target.textContent = t(error.message); }
  async addFiles(input) {
    const draftGeneration = this.draftGeneration;
    const candidates = [...input.files];
    const staged = [];
    try {
      if (this.files.length + candidates.length > MAX_NOTE_PDFS) throw Error('You can attach up to 10 PDFs to a note.');
      for (const file of candidates) {
        await validatePdfFile(file);
        staged.push({ file, metadata: { id: crypto.randomUUID(), name: file.name, type: 'application/pdf', size: file.size } });
      }
      if (draftGeneration !== this.draftGeneration) return;
      for (const { file, metadata } of staged) { this.pending.set(metadata.id, file); this.files.push(metadata); }
      const title = document.querySelector('#editor [name="title"]');
      if (title && !title.value.trim() && staged.length) title.value = staged[0].metadata.name.replace(/\.pdf$/i, '').slice(0, 80);
      this.editorError({ message: '' });
      this.paintDraft();
    } finally { input.value = ''; }
  }
  async saveAttachments(scope) {
    await this.addPromise;
    if (scope !== this.draftScope) throw Error('This record changed. Reopen the form.');
    for (const file of this.files) {
      validatePdfMetadata(file);
      if (this.pending.has(file.id)) await writePdf(scope, file, this.pending.get(file.id));
    }
    return structuredClone(this.files);
  }
  async click(event) {
    const button = event.target.closest('[data-pdf-open],[data-pdf-draft],[data-pdf-remove],[data-pdf-command]');
    if (!button) return;
    const context = this.callbacks.context();
    if (button.dataset.pdfRemove) {
      this.files = this.files.filter((f) => f.id !== button.dataset.pdfRemove);
      this.pending.delete(button.dataset.pdfRemove);
      this.paintDraft();
    } else if (button.dataset.pdfDraft) {
      const file = this.files.find((f) => f.id === button.dataset.pdfDraft);
      const blob = this.pending.get(file.id) || (await readPdf(this.draftScope, file.id))?.blob;
      await this.open(file, blob);
    } else if (button.dataset.pdfOpen) {
      const note = context.records.find((r) => r.id === button.dataset.pdfNote && r.kind === 'note');
      const file = note?.data.attachments?.find((f) => f.id === button.dataset.pdfOpen);
      if (file) await this.open(file, (await readPdf(context.space, file.id))?.blob);
    } else {
      const command = button.dataset.pdfCommand;
      if (command === 'close') document.querySelector('#pdf-reader').close();
      else if (command === 'download') this.download();
      else if (this.document) {
        if (command === 'previous') this.page = Math.max(1, this.page - 1);
        if (command === 'next') this.page = Math.min(this.document.numPages, this.page + 1);
        if (command === 'zoom-in') this.zoom = Math.min(3, this.zoom + .25);
        if (command === 'zoom-out') this.zoom = Math.max(.5, this.zoom - .25);
        await this.renderPage();
      }
    }
  }
  async open(file, blob) {
    if (!blob) throw Error('This PDF is unavailable on this device. Restore it from a notes backup.');
    this.closeReader();
    const generation = this.generation;
    this.file = file;
    this.blob = blob;
    this.page = 1;
    this.zoom = 1;
    const dialog = document.querySelector('#pdf-reader');
    dialog.innerHTML = `<div class="pdf-reader-heading"><h2 dir="auto">${esc(file.name)}</h2><button type="button" class="icon-button" data-pdf-command="close" aria-label="${t('Close')}">×</button></div><div class="pdf-reader-toolbar"><button type="button" class="secondary" data-pdf-command="previous">${t('Previous page')}</button><output id="pdf-page-status" role="status">${t('Loading PDF…')}</output><button type="button" class="secondary" data-pdf-command="next">${t('Next page')}</button><button type="button" class="icon-button" data-pdf-command="zoom-out" aria-label="${t('Zoom out')}">−</button><button type="button" class="icon-button" data-pdf-command="zoom-in" aria-label="${t('Zoom in')}">+</button><button type="button" class="secondary" data-pdf-command="download">${t('Download PDF')}</button></div><div class="pdf-reader-pages"><canvas id="pdf-page" aria-label="${t('PDF page')}"></canvas></div><p id="pdf-reader-error" role="alert"></p>`;
    dialog.showModal();
    try {
      const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
      if (generation !== this.generation) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
      this.loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), cMapUrl: new URL('./vendor/pdfjs/cmaps/', import.meta.url).href, cMapPacked: true, standardFontDataUrl: new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href, wasmUrl: new URL('./vendor/pdfjs/wasm/', import.meta.url).href, isEvalSupported: false });
      const loaded = await this.loading.promise;
      if (generation !== this.generation) { await loaded.destroy(); return; }
      this.document = loaded;
      await this.renderPage();
    } catch (error) { if (generation === this.generation) this.readerError(error); }
  }
  async renderPage() {
    const serial = (this.renderSerial || 0) + 1;
    this.renderSerial = serial;
    if (this.renderTask) { this.renderTask.cancel(); try { await this.renderTask.promise; } catch {} }
    const page = await this.document.getPage(this.page);
    if (serial !== this.renderSerial || !this.document) return;
    const container = document.querySelector('.pdf-reader-pages');
    const canvas = document.querySelector('#pdf-page');
    if (!canvas || !container) return;
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.5, Math.max(0.1, (container.clientWidth - 24) / base.width)) * this.zoom;
    const viewport = page.getViewport({ scale });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(viewport.width * pixelRatio);
    canvas.height = Math.ceil(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    this.renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
    try { await this.renderTask.promise; } catch (error) { if (error.name !== 'RenderingCancelledException') throw error; }
    if (serial !== this.renderSerial) return;
    document.querySelector('#pdf-page-status').textContent = `${localizedNumber(this.page)} / ${localizedNumber(this.document.numPages)}`;
    document.querySelector('[data-pdf-command="previous"]').disabled = this.page === 1;
    document.querySelector('[data-pdf-command="next"]').disabled = this.page === this.document.numPages;
    container.scrollTo(0, 0);
  }
  readerError(error) {
    document.querySelector('#pdf-reader-error').textContent = t(error.name === 'PasswordException' ? 'This PDF is password protected.' : 'The PDF could not be displayed. You can download the original file.');
    document.querySelector('#pdf-page-status').textContent = '—';
  }
  download() {
    if (!this.blob) return;
    const url = URL.createObjectURL(this.blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = this.file.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  closeReader() {
    this.generation++;
    this.renderSerial = (this.renderSerial || 0) + 1;
    this.renderTask?.cancel();
    void this.loading?.destroy().catch(() => {});
    this.loading = null; this.document = null; this.renderTask = null;
  }
}
