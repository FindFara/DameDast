import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSpace,saveSpace} from '../src/DameDast.Web/wwwroot/store.js';
import {database,loadDocument,saveDocument,read,write} from '../src/DameDast.Web/wwwroot/whiteboard/storage.mjs';
import {emptyDocument} from '../src/DameDast.Web/wwwroot/whiteboard/model.mjs';
import {normalizeSavedRecord,canvasUi} from '../src/DameDast.Web/wwwroot/whiteboard/recovery.mjs';

const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const open=(name,version,upgrade)=>new Promise((resolve,reject)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>upgrade?.(r.result);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const put=(db,store,key,value)=>new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});

test('renaming the ledger copies guest and account queues without replacing newer data',async()=>{
  const legacy=await open('poolo-v1',1,db=>db.createObjectStore('spaces'));
  const original={snapshot:{revision:7,records:[{id:'note',kind:'note',data:{body:'kept'}}]},pending:[{operationId:'retry'}]};
  await put(legacy,'spaces','guest',original);
  await put(legacy,'spaces','google:123',original);legacy.close();
  assert.deepEqual(await loadSpace('guest'),original);
  assert.deepEqual(await loadSpace('google:123'),original);
  const newer={...original,pending:[{operationId:'new'}]};
  await saveSpace('guest',newer);
  assert.deepEqual(await loadSpace('guest'),newer);
  const unchanged=await open('poolo-v1',1);
  const old=await new Promise(resolve=>{const r=unchanged.transaction('spaces').objectStore('spaces').get('guest');r.onsuccess=()=>resolve(r.result);});
  unchanged.close();assert.deepEqual(old,original);
});
test('older canvas databases upgrade missing stores and keep saved drawing content',async()=>{
  const old=await open('damdast-whiteboards-v1',1,db=>{db.createObjectStore('documents');db.createObjectStore('index');db.createObjectStore('ui');});
  const doc=emptyDocument();delete doc.scene.settings.gridStep;
  doc.scene.elements=[{id:'shape',type:'rectangle',x:1,y:2,width:30,height:40}];
  await put(old,'documents','guest:canvas:old-client',{document:doc});
  await put(old,'index','guest:canvas','guest:canvas:old-client');old.close();
  const saved=await loadDocument('guest','canvas','new-client');
  assert.equal(saved.document.scene.elements[0].id,'shape');
  assert.equal(saved.document.scene.elements[0].angle,0);
  assert.equal(saved.document.scene.settings.gridStep,5);
  const upgraded=await database();assert.ok(upgraded.objectStoreNames.contains('library'));upgraded.close();
  assert.equal((await read('documents','guest:canvas:old-client')).document.scene.settings.gridStep,undefined);
});
test('a damaged client copy falls back to another valid save and keeps the damaged bytes',async()=>{
  const valid={document:emptyDocument()},bad={document:{...emptyDocument(),title:''}};
  await write('documents','guest:recovery:current',bad);
  await write('documents','guest:recovery:other',valid);
  await write('index','guest:recovery','guest:recovery:other');
  const recovered=await loadDocument('guest','recovery','current');
  assert.equal(recovered.recovered,true);assert.deepEqual(recovered.document,valid.document);
  assert.deepEqual(await read('documents','guest:recovery:current'),bad);
});
test('failed saves leave the document pointer unchanged and unrecoverable data is exportable',async()=>{
  const value={document:emptyDocument()};
  await saveDocument('guest','atomic','first',value);
  await assert.rejects(saveDocument('guest','atomic','second',{broken:()=>{}}));
  assert.equal(await read('index','guest:atomic'),'guest:atomic:first');
  await write('documents','guest:broken:client',{document:{invalid:true}});
  await assert.rejects(loadDocument('guest','broken','client'),e=>e.recovery?.length>0);
  assert.deepEqual(await read('documents','guest:broken:client'),{document:{invalid:true}});
});
test('canvas recovery normalizes older exports and viewport metadata without changing drawings',()=>{
  const raw={type:'excalidraw',elements:[],appState:{viewBackgroundColor:'#fff'}};
  const record=normalizeSavedRecord(raw);
  assert.equal(record.document.scene.settings.gridStep,5);
  assert.deepEqual(raw,{type:'excalidraw',elements:[],appState:{viewBackgroundColor:'#fff'}});
  assert.deepEqual(canvasUi({zoom:1.5,scrollX:10,scrollY:'bad'}),{zoom:{value:1.5},scrollX:10});
});
