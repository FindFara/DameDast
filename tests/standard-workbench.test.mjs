import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWorkbench,standardWorkbench,packStandardWidgets,validateWorkbench,standardSize,deviceWorkbench,overlaps,widgetCatalog,legacyStandardSize,resizeWorkbenchWidget,deskColors,shortcutColors} from '../src/DameDast.Web/wwwroot/workbench.js';
import {workbenchPage,widgetSettings,addWidgetFields} from '../src/DameDast.Web/wwwroot/workbench-ui.js';
import {icon} from '../src/DameDast.Web/wwwroot/ui.js';
const id=()=>crypto.randomUUID();
test('default search and independent icon shortcuts live in the board with no desk or component headings',()=>{
  const layout=defaultWorkbench();validateWorkbench(layout);assert.equal(layout.version,3);
  assert.equal(layout.widgets.filter(w=>w.type==='search').length,1);
  const shortcuts=layout.widgets.filter(w=>w.type==='shortcut');assert.deepEqual(shortcuts.map(w=>w.options.page),['notes','tasks','calendar','projects']);
  assert.ok(shortcuts.every(w=>w.width===1&&w.height===1));
  const context={records:[{kind:'workbench',data:layout}],space:'guest',now:'2026-11-18T12:00:00Z',connectedSnapshots:[]};
  const html=workbenchPage(context,icon);
  assert.match(html,/desk-widget-search/);assert.equal((html.match(/class="desk-shortcut"/g)||[]).length,4);
  assert.doesNotMatch(html,/<h1|desk-card-head|desk-home-header|desk-today|desk-app-shortcuts|data-desk-resize/);
  const fields=widgetSettings(layout.widgets.find(w=>w.type==='pet'),context),add=addWidgetFields(icon);
  assert.doesNotMatch(add,/name="(?:size|width|height|x|y|title)"/);
  assert.match(fields,/name="width"/);assert.match(fields,/name="height"/);assert.doesNotMatch(fields,/name="(?:x|y|title)"/);
  assert.equal((fields.match(/data-desk-swatch=/g)||[]).length,5);assert.doesNotMatch(fields,/type="color"|desk-custom-colors/);
  assert.equal(deskColors.length,5);assert.ok(new Set(Object.values(shortcutColors)).size>4);
});
test('legacy layouts are migrated without losing cards or metadata, including a full 72-card layout',()=>{
  const original={version:1,columns:12,rows:6,background:null,widgets:Array.from({length:72},(_,i)=>({id:id(),type:'notes',x:i%12,y:Math.floor(i/12),width:1,height:1,background:null,title:`Old ${i}`,referenceId:null}))};
  const before=structuredClone(original),converted=standardWorkbench(original);
  assert.equal(converted.widgets.length,72);assert.equal(converted.version,3);assert.ok(converted.rows>6);
  assert.deepEqual(converted.widgets.map(w=>w.id),original.widgets.map(w=>w.id));assert.deepEqual(converted.widgets.map(w=>w.title),original.widgets.map(w=>w.title));assert.deepEqual(original,before);
  validateWorkbench(converted);
  for(const device of ['phone','tablet','desktop']){const view=deviceWorkbench(converted,device);assert.equal(view.widgets.length,72);for(const a of view.widgets)for(const b of view.widgets)if(a!==b)assert.equal(overlaps(a,b),false);}
});
test('every component has a fixed size and forged resize values are rejected in version two',()=>{
  for(const spec of widgetCatalog){
    const widget={id:id(),type:spec.type,x:0,y:0,...legacyStandardSize(spec.type),background:null};
    const layout={version:2,columns:12,rows:6,background:null,widgets:[widget]};validateWorkbench(layout);
    assert.throws(()=>validateWorkbench({...layout,widgets:[{...widget,height:widget.height+1}]}));
  }
  const cards=Array.from({length:25},()=>({id:id(),type:'clock',background:null}));
  const packed=packStandardWidgets(cards);const layout=standardWorkbench({version:3,columns:24,rows:Math.max(12,...packed.map(w=>w.y+w.height)),background:null,widgets:packed});
  assert.equal(layout.widgets.length,25);assert.ok(layout.rows>6);
});

test('the fine grid doubles both axes, preserves old widget footprints, and keeps edited dimensions',()=>{
  const old={version:2,columns:12,rows:6,background:null,widgets:[{id:id(),type:'clock',x:0,y:0,width:4,height:2,background:null},{id:id(),type:'shortcut',x:4,y:0,width:1,height:1,background:null,options:{page:'notes'}}]};
  const migrated=standardWorkbench(old);assert.equal(migrated.columns,24);assert.equal(migrated.rows,12);
  assert.equal(migrated.widgets[0].width,8);assert.equal(migrated.widgets[0].height,4);assert.equal(migrated.widgets[1].width,1);assert.equal(migrated.widgets[1].height,1);
  const resized=resizeWorkbenchWidget(migrated,migrated.widgets[0].id,7,5);assert.equal(resized.widgets[0].width,7);assert.equal(resized.widgets[0].height,5);
  assert.deepEqual(standardWorkbench(resized),resized);assert.equal(migrated.widgets[0].width,8);
  for(const [width,height]of[[0,2],[25,2],[2,13],[1.5,3]])assert.throws(()=>resizeWorkbenchWidget(resized,migrated.widgets[0].id,width,height));
  for(const device of['phone','tablet','desktop']){const view=deviceWorkbench(resized,device);assert.equal(view.widgets[0].height,5);assert.equal(view.widgets[0].width,7);for(const a of view.widgets)for(const b of view.widgets)if(a!==b)assert.equal(overlaps(a,b),false);}
});
