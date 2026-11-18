import test from 'node:test';
import assert from 'node:assert/strict';
import { petBounds, advancePet, sendPetHome } from '../src/DameDast.Web/wwwroot/desk-pet.js';
import { petModel, petFaces } from '../src/DameDast.Web/wwwroot/desk-pet-renderer.js';
import { workbenchPage } from '../src/DameDast.Web/wwwroot/workbench-ui.js';
import { defaultWorkbench } from '../src/DameDast.Web/wwwroot/workbench.js';
import { icon } from '../src/DameDast.Web/wwwroot/ui.js';
import { savePreferences } from '../src/DameDast.Web/wwwroot/preferences.js';

test('roaming stays inside the visible desk after long walks, scrolls and narrow resizes',()=>{
  let seed=17; const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
  let state={x:480,y:220,yaw:.6,phase:0,wait:0};let walking=0,total=0;
  for(const rect of [{width:1200,height:600,top:350,bottom:950},{width:290,height:1800,top:-500,bottom:1300},{width:230,height:400,top:80,bottom:480}]) {
    const bounds=petBounds(rect,800,88);
    state={...state,x:Math.max(bounds.minX,Math.min(bounds.maxX,state.x)),y:Math.max(bounds.minY,Math.min(bounds.maxY,state.y))};
    for(let frame=0;frame<1200;frame++) {
      const next=advancePet(state,bounds,.05,random),distance=Math.hypot(next.x-state.x,next.y-state.y);
      assert.ok(next.x>=bounds.minX&&next.x<=bounds.maxX);assert.ok(next.y>=bounds.minY&&next.y<=bounds.maxY);
      assert.ok(distance<=1.501);assert.ok(Number.isFinite(next.yaw));
      walking+=Number(next.walking);total+=distance;state=next;
    }
  }
  assert.ok(walking>500);assert.ok(total>1000);
  assert.equal(petBounds({width:300,height:400,top:900,bottom:1300},800,88).visible,false);
});
test('both pets have shaded three-dimensional faces and articulated walking poses in every direction',()=>{
  for(const style of ['cat','robot']) {
    assert.notDeepEqual(petModel(style,0,true),petModel(style,1.5,true));
    assert.notDeepEqual(petModel(style,0,false),petModel(style,0,false,true));
    for(let angle=0;angle<Math.PI*2;angle+=.2) {
      const faces=petFaces(style,angle,1,true,false);assert.ok(faces.length>20);
      for(const face of faces) for(const vertex of face.vertices) assert.ok([vertex.x,vertex.y,vertex.depth].every(Number.isFinite));
      assert.ok(new Set(faces.map(face=>face.color)).size>5);
    }
  }
});
test('a visible pet roams outside cards, remains escaped and follows device visibility and edit mode',contextTest=>{
  const previous=globalThis.localStorage,values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  contextTest.after(()=>{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;});
  savePreferences({workbenchEditing:false});
  const desk=defaultWorkbench(),pet=desk.widgets.find(widget=>widget.type==='pet');pet.title='<img src=x onerror=bad()>';
  const context={records:[{kind:'workbench',data:desk}],space:'guest',now:'2026-11-18T12:00:00Z',connectedSnapshots:[]};
  let html=workbenchPage(context,icon);
  assert.match(html,/data-roaming-pet=/);assert.match(html,/data-pet-house=/);assert.match(html,/data-pet-style="dog"/);assert.doesNotMatch(html,/roaming-pet-name|data-desk-pet-toggle/);assert.doesNotMatch(html,/desk-widget-pet|tabby-cat|<img src=x/);
  assert.doesNotMatch(html,/&lt;img/);
  pet.devices={desktop:false};html=workbenchPage(context,icon);assert.doesNotMatch(html,/data-roaming-pet=|data-desk-pet-toggle=/);
  savePreferences({workbenchEditing:true});html=workbenchPage(context,icon);
  assert.match(html,/desk-widget-pet/);assert.match(html,/desk-pet-preview/);assert.doesNotMatch(html,/data-roaming-pet=/);
  savePreferences({workbenchEditing:false});
});

test('clicking a pet interrupts wandering, runs to its kennel and rests before coming back out',()=>{
 const bounds={minX:4,maxX:700,minY:4,maxY:480};
 let state=sendPetHome({x:100,y:70,yaw:.6,phase:0,wait:2},bounds);
 assert.equal(state.mode,'running');let frames=0;
 while(state.mode!=='home'&&frames++<150)state=advancePet(state,bounds,.05);
 assert.equal(state.mode,'home');assert.ok(frames<150);
 assert.equal(state.x,688);assert.equal(state.y,472);assert.equal(state.walking,false);
 for(let n=0;n<81;n++)state=advancePet(state,bounds,.05);
 assert.equal(state.mode,'roaming');
 assert.equal(sendPetHome(state,bounds,true).mode,'home');
});
