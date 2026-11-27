import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { IDBFactory } from 'fake-indexeddb';
import { learningWeekDays, learningWeekChanges } from '../src/DameDast.Web/wwwroot/learning-week.js';
import { learningWeekForm, LearningWeekController } from '../src/DameDast.Web/wwwroot/learning-week-controller.js';
import { vocabularySections, renderLanguagePage } from '../src/DameDast.Web/wwwroot/language-ui.js';
import { materialize } from '../src/DameDast.Web/wwwroot/finance.js';
import { plannerItems } from '../src/DameDast.Web/wwwroot/planner.js';
import { weeklyAgenda } from '../src/DameDast.Web/wwwroot/weekly-agenda.js';
import { validateBackup, selectBackupRecords } from '../src/DameDast.Web/wwwroot/backup.js';
import { setLanguage } from '../src/DameDast.Web/wwwroot/i18n.js';
import { loadSpace, saveSpace } from '../src/DameDast.Web/wwwroot/store.js';
const ids = () => Array.from({length:6}, () => crypto.randomUUID());
const titles = ['  Architecture  ', '', 'Practice C#', ' ', 'Read a book', 'Plan'];

test('weekly title entry maps Saturday through Thursday, skips blanks and rejects invalid batches before saving',()=>{
  assert.deepEqual(learningWeekDays('2026-11-27'), ['2026-11-21','2026-11-22','2026-11-23','2026-11-24','2026-11-25','2026-11-26']);
  const stableIds = ids(), changes = learningWeekChanges('2026-11-27',titles,stableIds);
  assert.deepEqual(changes.map(c=>[c.data.date,c.data.title]), [['2026-11-21','Architecture'],['2026-11-23','Practice C#'],['2026-11-25','Read a book'],['2026-11-26','Plan']]);
  assert.ok(changes.every(c=>c.kind==='developmentEntry' && c.data.area==='study' && c.data.minutes===0 && !c.data.done));
  assert.throws(()=>learningWeekChanges('2026-11-27',Array(6).fill(''),ids()));
  assert.throws(()=>learningWeekChanges('2026-11-27',['x'.repeat(121),...Array(5).fill('')],ids()));
  assert.throws(()=>learningWeekChanges('invalid',titles,ids()));
  assert.throws(()=>learningWeekDays('2101-01-01'));
  const records = changes.map(c=>({...c,version:1}));
  assert.deepEqual(learningWeekChanges('2026-11-27',titles,stableIds,records),[]);
  const alteredIds = ids(); alteredIds[0] = changes[0].id;
  assert.throws(()=>learningWeekChanges('2026-11-27',['Different title',...Array(5).fill('')],alteredIds,records));
});
test('weekly form exposes only six title fields, an accessible week picker and no completion or duration fields',()=>{
  setLanguage('fa');
  const {document}=parseHTML(learningWeekForm('2026-11-27',Array(6).fill('<script>')));
  assert.equal(document.querySelectorAll('[data-week-title]').length,6);
  assert.deepEqual([...document.querySelectorAll('[data-week-title]')].map(e=>e.getAttribute('aria-label')),['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه']);
  assert.equal(document.querySelector('[name="done"],[name="minutes"],[name="notes"],script'),null);
  assert.ok(document.querySelector('[name="learning-week"]'));
});
test('a saved weekly batch survives storage reload and reaches calendar, dashboard and backups as normal activities',async context=>{
  const old=globalThis.indexedDB; globalThis.indexedDB=new IDBFactory(); context.after(()=>{if(old)globalThis.indexedDB=old;else delete globalThis.indexedDB;});
  const state={snapshot:{revision:0,records:[]},pending:learningWeekChanges('2026-11-27',titles,ids())};
  await saveSpace('google:weekly-test',state);
  const records=materialize(await loadSpace('google:weekly-test'));
  assert.equal(records.length,4);
  assert.equal((await loadSpace('google:other-user')).pending.length,0);
  assert.equal(plannerItems(records,'2026-11-21','2026-11-28').length,4);
  assert.equal(weeklyAgenda(records,'2026-11-27T10:00:00Z').flatMap(d=>d.items).length,4);
  assert.equal(validateBackup({format:'damdast-v3',section:'notes',records:selectBackupRecords(records,'notes')}).records.length,4);
});
test('vocabulary uses ordered groups of ten with one word, meaning and example row, safely escaping mixed text',()=>{
  setLanguage('en');
  const words=Array.from({length:23},(_,i)=>({term:`word${i}`,meaning:`معنی ${i}`,example:`Example ${i}.`}));
  words[0].term='<img src=x>'; words[0].meaning='<script>bad()</script>';
  const {document}=parseHTML(vocabularySections(words));
  const groups=[...document.querySelectorAll('.language-word-section')];
  assert.deepEqual(groups.map(g=>g.querySelectorAll('tbody tr').length),[10,10,3]);
  assert.ok([...document.querySelectorAll('tbody tr')].every(row=>row.children.length===3));
  assert.equal(document.querySelector('tbody th').textContent,'<img src=x>');
  assert.equal(document.querySelector('script,img'),null);
  const page=renderLanguagePage({page:'languageVocabulary',records:[]},{date:'2026-11-27'});
  assert.doesNotMatch(page,/href="#learning"/);
});

test('weekly drafts survive week switches and reopening; failed saves keep titles and retries do not double-submit',async context=>{
  const {document,window}=parseHTML('<html><body></body></html>');
  const previous={document:globalThis.document,localStorage:globalThis.localStorage};
  const values=new Map();
  Object.assign(globalThis,{document,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
  context.after(()=>Object.assign(globalThis,previous));
  window.HTMLElement.prototype.showModal=function(){this.open=true;};
  window.HTMLElement.prototype.close=function(){this.open=false;};
  window.HTMLElement.prototype.focus=function(){};
  const c={space:'google:weekly-user'},records=[];
  let fail=true,calls=0;
  const options={context:()=>c,saved(){},save:async(date,titles,ids,scope)=>{
    calls++; assert.equal(scope,c.space); if(fail)throw Error('Save failed');
    records.push(...learningWeekChanges(date,titles,ids));
  }};
  let ui=new LearningWeekController(options);ui.open('2026-11-27');
  ui.dialog.querySelector('[data-week-title="0"]').value='DDD';ui.capture();
  ui.selectWeek('2026-11-28');assert.equal(ui.dialog.querySelector('[data-week-title="0"]').value,'');
  ui.selectWeek('2026-11-27');assert.equal(ui.dialog.querySelector('[data-week-title="0"]').value,'DDD');
  ui.close(); ui=new LearningWeekController(options);ui.open('2026-11-27');
  assert.equal(ui.dialog.querySelector('[data-week-title="0"]').value,'DDD');
  await ui.submit();assert.equal(ui.dialog.open,true);assert.match(ui.dialog.querySelector('.form-error').textContent,/Save failed/);
  fail=false;await Promise.all([ui.submit(),ui.submit()]);
  assert.equal(calls,2);assert.equal(records.length,1);assert.equal(ui.dialog.open,false);
  assert.equal(values.has(ui.key()),false);
  c.space='google:another-user';ui.open('2026-11-27');assert.equal(ui.dialog.querySelector('[data-week-title="0"]').value,'');
});

test('learning has no day picker or completion/minutes summary, and dated activities remain reachable across all days',async()=>{
  const {developmentPage}=await import('../src/DameDast.Web/wwwroot/development-ui.js');
  setLanguage('en');
  const records=learningWeekChanges('2026-11-27',titles,ids()).map(change=>({...change,version:1}));
  const {document}=parseHTML(developmentPage({page:'learning',records,developmentDate:'2026-11-23'}));
  assert.equal(document.querySelector('.development-datebar,.development-stats,.development-day-heading'),null);
  assert.equal(document.querySelectorAll('.development-entry').length,4);
  assert.equal(document.querySelectorAll('[data-action="development-add"]').length,1);
  assert.equal(document.querySelector('[data-action="development-add"]').closest('.heading-actions')!==null,true);
  assert.equal(document.querySelectorAll('.development-entry footer time').length,4);
  assert.equal(document.querySelectorAll('.development-entry [data-action="development-toggle"]').length,4);
});
