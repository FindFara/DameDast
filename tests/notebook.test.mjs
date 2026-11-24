import test from 'node:test';
import assert from 'node:assert/strict';
import { textNotes, isDrawingNote, plainNoteDraft, notePayload, taskEntries, toggleTask } from '../src/DameDast.Web/wwwroot/notebook.js';
import { renderPage } from '../src/DameDast.Web/wwwroot/ui.js';
import { setLanguage } from '../src/DameDast.Web/wwwroot/i18n.js';
import { widgetSettings } from '../src/DameDast.Web/wwwroot/workbench-ui.js';

test('text drafts cannot add tasks, drawings, attachments or change a pin',()=>{
  const previous={title:'Before',body:'Old',pinned:true,checklist:[{id:'task',text:'Keep task',done:false}],attachments:[{id:'old-file'}]};
  const draft=plainNoteDraft({title:'  After  ',body:'New text',pinned:false,checklist:[],drawing:{},attachments:[]});
  assert.deepEqual(Object.keys(draft),['title','body']);
  const saved=notePayload(previous,draft,'2026-11-18');
  assert.equal(saved.title,'After');assert.equal(saved.body,'New text');assert.equal(saved.pinned,true);
  assert.deepEqual(saved.checklist,previous.checklist);assert.deepEqual(saved.attachments,previous.attachments);
  assert.deepEqual(previous.body,'Old');
  const fresh=notePayload(null,{title:'New',body:'Only text'},'2026-11-18');
  assert.equal(fresh.checklist,undefined);assert.equal(fresh.attachments,undefined);assert.equal(fresh.pinned,false);
});
test('drawing records and text notes stay in distinct collections',()=>{
  const records=[{id:'text',kind:'note',data:{title:'Text',body:'Text body'}},{id:'drawing',kind:'note',data:{title:'Drawing',whiteboardId:'board'}},{id:'deleted',kind:'note',deleted:true,data:{title:'Gone'}}];
  assert.deepEqual(textNotes(records).map(record=>record.id),['text']);
  assert.equal(isDrawingNote(records[1]),true);assert.equal(isDrawingNote(undefined),false);
  const notesPicker=widgetSettings({type:'notes',x:0,y:0,width:4,height:2},{records});
  const drawingPicker=widgetSettings({type:'canvas',x:0,y:0,width:4,height:2},{records});
  assert.match(notesPicker,/<option value="text"/);assert.doesNotMatch(notesPicker,/<option value="drawing"/);
  assert.doesNotMatch(drawingPicker,/<option value="drawing"/);assert.doesNotMatch(drawingPicker,/<option value="text"/);
});
test('repeating tasks use an actual upcoming occurrence and respect the end of the series',()=>{
  const record={id:'weekly',kind:'calendarEvent',data:{title:'Weekly',kind:'task',startDate:'2026-11-20',repeat:'weekly',completedDates:[]}};
  let entries=taskEntries([record],'2026-11-18T12:00:00Z');
  assert.equal(entries[0].occurrence,'2026-11-20');
  entries=taskEntries([record],'2026-11-21T12:00:00Z');
  assert.equal(entries[0].occurrence,'2026-11-27');
  const monthly={...record,data:{...record.data,startDate:'2026-01-31',repeat:'monthly',repeatCalendar:'gregory'}};
  assert.equal(taskEntries([monthly],'2026-02-01T12:00:00Z')[0].occurrence,'2026-02-28');
  assert.deepEqual(taskEntries([{...record,data:{...record.data,repeatUntil:'2026-11-20'}}],'2026-11-21T12:00:00Z'),[]);
});
test('independent tasks and existing checklist tasks are available only from Tasks',()=>{
  setLanguage('en');
  const note={id:'note',kind:'note',data:{title:'Text note',body:'Text only',updatedOn:'2026-11-18',checklist:[{id:'legacy',text:'Existing task',done:false}]}};
  const task={id:'task',kind:'calendarEvent',data:{title:'Independent task',kind:'task',done:false,repeat:'none',startDate:'2026-11-18'}};
  const entries=taskEntries([note,task],'2026-11-18T12:00:00Z');
  assert.deepEqual(entries.map(entry=>entry.title),['Existing task','Independent task']);
  const done=toggleTask(task.data,'2026-11-18');assert.equal(done.done,true);assert.equal(task.data.done,false);
  const repeated=toggleTask({...task.data,repeat:'daily'},'2026-11-18');assert.deepEqual(repeated.completedDates,['2026-11-18']);
  assert.deepEqual(toggleTask(repeated,'2026-11-18').completedDates,[]);
  const base={records:[note,task],space:'guest',now:'2026-11-18T12:00:00Z',filter:''};
  const notes=renderPage({...base,page:'notes'}), tasks=renderPage({...base,page:'tasks'});
  assert.doesNotMatch(notes,/Existing task|Independent task|data-task-id|organizer-tabs/);
  assert.match(tasks,/Existing task/);assert.match(tasks,/Independent task/);assert.doesNotMatch(tasks,/data-note-open|organizer-tabs/);
});
