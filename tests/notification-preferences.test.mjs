import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { defaultNotificationKinds, normalizeNotificationKinds, enabledNotificationReport } from '../src/DameDast.Web/wwwroot/notification-preferences.js';
import { preferences,savePreferences } from '../src/DameDast.Web/wwwroot/preferences.js';

test('notification choices default on, support turning everything off and filter unread counts without deleting receipts',()=>{
 assert.equal(defaultNotificationKinds().length,5);
 assert.deepEqual(normalizeNotificationKinds(undefined),defaultNotificationKinds());
 assert.deepEqual(normalizeNotificationKinds(['tasks','unknown','tasks']),['tasks']);
 const report={notifications:[{kind:'reminder',read:false},{kind:'note',read:false},{kind:'task',read:false},{kind:'installment',read:true},{kind:'check',read:false},{kind:'goal',read:false}],unread:5};
 const filtered=enabledNotificationReport(report,['reminders','installments']);
 assert.equal(filtered.notifications.length,3);assert.equal(filtered.unread,2);
 assert.equal(report.notifications.length,6);assert.equal(enabledNotificationReport(report,[]).unread,0);
});
test('notification choices survive reload and normalization',context=>{
 const old=globalThis.localStorage,values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 context.after(()=>{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;});
 savePreferences({notificationKinds:['tasks','checks']});assert.deepEqual(preferences().notificationKinds,['tasks','checks']);
 savePreferences({notificationKinds:[]});assert.deepEqual(preferences().notificationKinds,[]);
});
test('background pushes respect saved device choices even without an open app',async()=>{
 const handlers={},saved=new Map(),shown=[];
 const cache={put:async(key,value)=>saved.set(key,value),match:async key=>saved.get(key)?.clone()};
 const self={location:{origin:'https://app.test'},addEventListener:(name,callback)=>handlers[name]=callback,registration:{showNotification:async(title,options)=>shown.push({title,options})}};
 vm.runInNewContext(fs.readFileSync(new URL('../src/DameDast.Web/wwwroot/sw.js',import.meta.url),'utf8'),{self,URL,Response,caches:{open:async()=>cache}});
 const configure=async kinds=>{let pending;handlers.message({data:{type:'notification-preferences',kinds},waitUntil:p=>pending=p});await pending;};
 const push=async tag=>{let pending;handlers.push({data:{json:()=>({title:'Test',tag,url:'/#reminders'})},waitUntil:p=>pending=p});await pending;};
 await push('damdast-personal-1');assert.equal(shown.length,1);
 await configure(['installments']);await push('damdast-personal-1');assert.equal(shown.length,1);
 await push('damedast-installments');assert.equal(shown.length,2);
 await configure([]);await push('damedast-installments');assert.equal(shown.length,2);
 await configure(['reminders']);await push('damdast-personal-1');assert.equal(shown.length,3);
});
