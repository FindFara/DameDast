import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {ConnectedStore} from '../src/DameDast.Web/wwwroot/connected-store.js';
import {saveSpace} from '../src/DameDast.Web/wwwroot/store.js';

test('portfolio initialization never trusts a cached user ID and uses the same verified account as the app',async t=>{
 const old={indexedDB:globalThis.indexedDB,localStorage:globalThis.localStorage,navigator:globalThis.navigator};
 globalThis.indexedDB=indexedDB;
 globalThis.localStorage={getItem:key=>key==='damdast-portfolio-user'?'alice':null,removeItem:()=>{}};
 Object.defineProperty(globalThis,'navigator',{value:{onLine:false},configurable:true});
 t.after(()=>{for(const [key,value]of Object.entries(old))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});});
 await saveSpace('portfolio:alice',{snapshot:{revision:7,records:[]},pending:[]});
 const store=new ConnectedStore(()=>{});store.request=async()=>{throw Error('Offline');};
 await store.initialize();assert.equal(store.key,'portfolio:guest');assert.equal(store.state.snapshot.revision,0);assert.equal(store.session.authenticated,false);
 await store.initialize({authenticated:true,userId:'alice'});assert.equal(store.key,'portfolio:alice');assert.equal(store.state.snapshot.revision,7);
 await store.initialize({authenticated:true,userId:'bob'});assert.equal(store.key,'portfolio:bob');assert.equal(store.state.snapshot.revision,0);
});
