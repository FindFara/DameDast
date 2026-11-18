import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWorkbench,standardWorkbench,packStandardWidgets,validateWorkbench,standardSize,deviceWorkbench,overlaps,widgetCatalog} from '../src/DameDast.Web/wwwroot/workbench.js';
import {workbenchPage,widgetSettings,addWidgetFields} from '../src/DameDast.Web/wwwroot/workbench-ui.js';
import {icon} from '../src/DameDast.Web/wwwroot/ui.js';
const id=()=>crypto.randomUUID();
test('default search and independent icon shortcuts live in the board with no desk or component headings',()=>{
  const layout=defaultWorkbench();validateWorkbench(layout);assert.equal(layout.version,2);
  assert.equal(layout.widgets.filter(w=>w.type==='search').length,1);
  const shortcuts=layout.widgets.filter(w=>w.type==='shortcut');assert.deepEqual(shortcuts.map(w=>w.options.page),['notes','tasks','calendar','canvas']);
  assert.ok(shortcuts.every(w=>w.width===1&&w.height===1));
  const context={records:[{kind:'workbench',data:layout}],space:'guest',now:'2026-11-18T12:00:00Z',connectedSnapshots:[]};
  const html=workbenchPage(context,icon);
  assert.match(html,/desk-widget-search/);assert.equal((html.match(/class="desk-shortcut"/g)||[]).length,4);
  assert.doesNotMatch(html,/<h1|desk-card-head|desk-home-header|desk-today|desk-app-shortcuts|data-desk-resize/);
  const fields=widgetSettings(layout.widgets.find(w=>w.type==='pet'),context)+addWidgetFields(icon);
  assert.doesNotMatch(fields,/name="(?:size|width|height|x|y|title)"/);
});
test('legacy layouts are migrated without losing cards or metadata, including a full 72-card layout',()=>{
  const original={version:1,columns:12,rows:6,background:null,widgets:Array.from({length:72},(_,i)=>({id:id(),type:'notes',x:i%12,y:Math.floor(i/12),width:1,height:1,background:null,title:`Old ${i}`,referenceId:null}))};
  const before=structuredClone(original),converted=standardWorkbench(original);
  assert.equal(converted.widgets.length,72);assert.equal(converted.version,2);assert.ok(converted.rows>6);
  assert.deepEqual(converted.widgets.map(w=>w.id),original.widgets.map(w=>w.id));assert.deepEqual(converted.widgets.map(w=>w.title),original.widgets.map(w=>w.title));assert.deepEqual(original,before);
  validateWorkbench(converted);
  for(const device of ['phone','tablet','desktop']){const view=deviceWorkbench(converted,device);assert.equal(view.widgets.length,72);for(const a of view.widgets)for(const b of view.widgets)if(a!==b)assert.equal(overlaps(a,b),false);}
});
test('every component has a fixed size and forged resize values are rejected in version two',()=>{
  for(const spec of widgetCatalog){
    const widget={id:id(),type:spec.type,x:0,y:0,...standardSize(spec.type),background:null};
    const layout={version:2,columns:12,rows:6,background:null,widgets:[widget]};validateWorkbench(layout);
    assert.throws(()=>validateWorkbench({...layout,widgets:[{...widget,height:widget.height+1}]}));
  }
  const cards=Array.from({length:25},()=>({id:id(),type:'clock',background:null}));
  const packed=packStandardWidgets(cards);const layout=standardWorkbench({version:2,columns:12,rows:Math.max(...packed.map(w=>w.y+w.height)),background:null,widgets:packed});
  assert.equal(layout.widgets.length,25);assert.ok(layout.rows>6);
});
