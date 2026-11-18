import test from 'node:test';
import assert from 'node:assert/strict';
import {preferences,savePreferences,validatePreferences} from '../src/DameDast.Web/wwwroot/preferences.js';
import {applyPreferences} from '../src/DameDast.Web/wwwroot/i18n.js';
import {workbenchPage} from '../src/DameDast.Web/wwwroot/workbench-ui.js';
import {defaultWorkbench} from '../src/DameDast.Web/wwwroot/workbench.js';
import {icon} from '../src/DameDast.Web/wwwroot/ui.js';

test('one validated app background applies globally and can return to the theme background',context=>{
 const oldStorage=globalThis.localStorage,oldDocument=globalThis.document,values=new Map(),styles=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 globalThis.document={documentElement:{dataset:{},style:{setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)}},querySelector:()=>null};
 context.after(()=>{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
 savePreferences({mainBackground:'#4338ca'});applyPreferences();assert.equal(styles.get('--bg'),'#4338ca');assert.equal(styles.get('--app-background-ink'),'#f2f6f3');
 assert.throws(()=>validatePreferences({...preferences(),mainBackground:'url(https://example.com)'}));
 savePreferences({mainBackground:null});applyPreferences();assert.equal(styles.has('--bg'),false);assert.equal(styles.has('--app-background-ink'),false);
});
test('legacy desk background metadata never creates a separate workbench background',()=>{
 const layout=defaultWorkbench();layout.background='#ffdf00';
 const html=workbenchPage({records:[{kind:'workbench',data:layout}],space:'guest',now:'2026-11-18T12:00:00Z',connectedSnapshots:[]},icon);
 assert.doesNotMatch(html,/desk-wallpaper|desk-wallpaper-ink|desk-background/);
});
