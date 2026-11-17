import test from 'node:test';
import assert from 'node:assert/strict';
import { NotePdfController } from '../src/DameDast.Web/wwwroot/note-pdfs.js';

test('a pending PDF save cannot pick up attachments from another note or workspace', async () => {
  const pdfs = Object.create(NotePdfController.prototype);
  let complete;
  pdfs.addPromise = new Promise(resolve => { complete = resolve; });
  pdfs.draftGeneration = 1;
  pdfs.draftScope = 'guest';
  pdfs.files = [];
  pdfs.pending = new Map();
  const saving = pdfs.saveAttachments('guest');
  pdfs.draftGeneration = 2;
  pdfs.draftScope = 'another-workspace';
  pdfs.files = [{ id: crypto.randomUUID(), name: 'another-note.pdf', type: 'application/pdf', size: 100 }];
  complete();
  await assert.rejects(saving, /record changed/);
});
