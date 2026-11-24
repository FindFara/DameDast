import test from 'node:test';
import assert from 'node:assert/strict';
import { materialize, balance } from '../src/DameDast.Web/wwwroot/finance.js';
import { searchWorkspace, attentionReport, habitProgress, validateProductivity } from '../src/DameDast.Web/wwwroot/productivity.js';
import { insertNoteBlock, renderNoteBlocks } from '../src/DameDast.Web/wwwroot/note-blocks.js';
import { normalizeClip } from '../src/DameDast.Web/wwwroot/extension/shared/clips.js';
import { createBackup, restoreBackup } from '../src/DameDast.Web/wwwroot/backup.js';
import { monthOf, dateInMonth, shiftMonth } from '../src/DameDast.Web/wwwroot/calendar.js';
import { standardWorkbench, defaultWorkbench, widgetCatalog } from '../src/DameDast.Web/wwwroot/workbench.js';
const id=()=>crypto.randomUUID();
const row=(kind,data,key=id())=>({id:key,kind,version:1,deleted:false,data});

test('one payment operation updates the installment and chosen balance offline, including edit and reversal',()=>{
  const a=row('account',{openingBalance:5000}), b=row('account',{openingBalance:9000}), loan=row('installment',{title:'Rent',amount:1200,paid:false});
  const state={snapshot:{records:[a,b,loan]},pending:[]}, transactionId=id();
  const pay={operationId:id(),id:loan.id,kind:'installment',data:{...loan.data,paid:true,payment:{transactionId,accountId:b.id,date:'2026-11-24',category:'Home'}}};
  state.pending.push(pay);
  let records=materialize(state), tx=records.filter(r=>r.kind==='transaction'&&!r.deleted);
  assert.equal(tx.length,1);assert.equal(balance(a,tx),5000);assert.equal(balance(b,tx),7800);
  state.pending.push({...pay,operationId:id(),data:{...pay.data,amount:1400}});
  records=materialize(state);tx=records.filter(r=>r.kind==='transaction'&&!r.deleted);
  assert.equal(tx.length,1);assert.equal(balance(b,tx),7600);
  state.pending.push({...pay,operationId:id(),data:{...loan.data,paid:false,payment:null}});
  records=materialize(state);tx=records.filter(r=>r.kind==='transaction'&&!r.deleted);
  assert.equal(tx.length,0);assert.equal(balance(b,tx),9000);
});
test('Persian normalized search finds rent across kinds, tags, project membership and page names',()=>{
  const project=row('project',{name:'خرید سیستم'});
  const rows=[project,row('note',{title:'يادداشت',body:'اجاره'}),row('reminder',{title:'یادآور اجاره'}),row('transaction',{note:'پرداخت اجاره'}),row('bookmark',{title:'.NET',url:'https://dot.net',excerpt:'Performance',tags:['بعداً بخوانم'],projectId:project.id}),row('note',{title:'اجاره',body:'Gone'},'gone')];rows.at(-1).deleted=true;
  assert.equal(searchWorkspace(rows,'اجاره').length,3);
  assert.equal(searchWorkspace(rows,'یادداشت')[0].kind,'note');
  assert.equal(searchWorkspace(rows,'خرید سیستم').length,2);
  assert.equal(searchWorkspace(rows,'بعدا بخوانم').length,1);
  assert.equal(searchWorkspace(rows,'تراکنش', [{id:'transactions',title:'تراکنش‌ها'}])[0].kind,'page');
});
test('attention uses Tehran dates, separate Persian months, overdue tasks and next Saturday to Friday payments',()=>{
  const month=monthOf('2026-11-24'),previous=shiftMonth(month,-1);
  const records=[row('transaction',{type:'expense',category:'Home',amount:500,date:dateInMonth(previous,1)}),row('transaction',{type:'expense',category:'Home',amount:900,date:'2026-11-24'}),row('transaction',{type:'transfer',category:'Home',amount:10000,date:'2026-11-24'}),row('calendarEvent',{title:'Overdue',kind:'task',startDate:'2026-11-23',repeat:'none',done:false}),row('installment',{title:'Rent',amount:100,dueDate:'2026-11-28',paid:false}),row('installment',{title:'Paid',amount:200,dueDate:'2026-11-29',paid:true}),row('monthlyExpense',{title:'Bill',amount:50,startMonth:month,day:8})];
  const report=attentionReport(records,'2026-11-24T12:00:00Z');
  assert.equal(report.increases[0].increase,400);assert.equal(report.overdue[0].title,'Overdue');
  assert.equal(report.weekStart,'2026-11-28');assert.equal(report.weekEnd,'2026-12-05');assert.equal(report.payments.length,2);
});
test('habit weeks start Saturday, deduplicate dates and cap progress without counting future entries',()=>{
  const habit=row('habit',{name:'Language',weeklyTarget:3,startDate:'2026-11-01',color:'#367c61'});
  const rows=['2026-11-20','2026-11-21','2026-11-22','2026-11-22','2026-11-24','2026-11-25'].map(date=>row('habitLog',{habitId:habit.id,date}));
  const report=habitProgress(rows,habit,'2026-11-24');
  assert.equal(report.start,'2026-11-21');assert.equal(report.count,3);assert.equal(report.percent,100);
  assert.throws(()=>validateProductivity('habit',{...habit.data,weeklyTarget:8},[],id()));
});
test('block insertion preserves surrounding text and preview escapes code, quotes and toggles',()=>{
  const inserted=insertNoteBlock('Before / After',7,8,'code');
  assert.ok(inserted.body.startsWith('Before \n```csharp'));assert.ok(inserted.body.endsWith(' After'));
  const html=renderNoteBlocks('## Title\n> <script>bad</script>\n```\n<img src=x>\n```\n:::toggle More\n- [ ] Read\n:::');
  assert.match(html,/<h2>Title<\/h2>/);assert.match(html,/<details><summary>More<\/summary>/);assert.match(html,/data-note-line="6"/);
  assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;img/);
});
test('article clips validate source URLs and preserve the selected excerpt with Read later',()=>{
  const clip=normalizeClip({id:id(),title:'.NET 10',url:'https://dot.net/',excerpt:'Selected code'});
  assert.deepEqual(clip.tags,['Read later']);assert.equal(clip.excerpt,'Selected code');
  assert.throws(()=>normalizeClip({...clip,url:'javascript:alert(1)'}));
  assert.throws(()=>normalizeClip({...clip,url:'https://user:pass@example.com'}));
});
test('projects, habit history, excerpts and linked payments survive complete backups',async()=>{
  const project=row('project',{name:'Trip',description:''}),habit=row('habit',{name:'Read',weeklyTarget:3,startDate:'2026-01-01',color:'#367c61'});
  const bookmark=row('bookmark',{title:'.NET',url:'https://dot.net/',excerpt:'Selected',tags:['Read later'],projectId:project.id});
  const records=[project,habit,bookmark,row('habitLog',{habitId:habit.id,date:'2026-11-01'})];
  const backup=await createBackup({records,scope:'guest'}), restored=await restoreBackup(backup,'guest');
  assert.deepEqual(restored.records.map(r=>r.data),records.map(r=>r.data));
  assert.equal((await createBackup({records,scope:'guest',section:'notes'})).records.length,4);
});
test('retiring canvas removes existing cards and shortcuts while preserving the rest of a saved desk',()=>{
  const layout=defaultWorkbench(), sample=layout.widgets.find(w=>w.type==='notes');
  const retired={...sample,type:'canvas'};
  const source={...layout,widgets:layout.widgets.map(w=>w.id===sample.id?retired:w)};
  assert.ok(!widgetCatalog.some(w=>w.type==='canvas'));
  const migrated=standardWorkbench(source);assert.ok(!migrated.widgets.some(w=>w.type==='canvas'));assert.equal(migrated.widgets.length,source.widgets.length-1);
});

test('habit day identity is stable across devices, undo can be rechecked, and deleting a habit removes its logs',async()=>{
 const {habitLogId}=await import('../src/DameDast.Web/wwwroot/productivity.js');
 const habit=row('habit',{name:'Read',weeklyTarget:3,startDate:'2026-11-01',color:'#367c61'}), date='2026-11-24';
 const key=await habitLogId(habit.id,date);assert.equal(await habitLogId(habit.id,date),key);assert.notEqual(await habitLogId(habit.id,'2026-11-23'),key);
 const log=row('habitLog',{habitId:habit.id,date,done:false},key);
 assert.equal(habitProgress([log],habit,date).count,0);
 const pending={id:key,kind:'habitLog',data:{...log.data,done:true}};
 let records=materialize({snapshot:{records:[habit,log]},pending:[pending]});assert.equal(habitProgress(records,habit,date).count,1);
 records=materialize({snapshot:{records},pending:[{id:habit.id,kind:'habit',delete:true}]});assert.equal(records.filter(r=>!r.deleted).length,0);
});
