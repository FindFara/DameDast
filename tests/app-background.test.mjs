import test from 'node:test';
import assert from 'node:assert/strict';
import {preferences,savePreferences,validatePreferences} from '../src/DameDast.Web/wwwroot/preferences.js';
import {applyPreferences} from '../src/DameDast.Web/wwwroot/i18n.js';
import {workbenchPage} from '../src/DameDast.Web/wwwroot/workbench-ui.js';
import {defaultWorkbench} from '../src/DameDast.Web/wwwroot/workbench.js';
import {icon,renderPage} from '../src/DameDast.Web/wwwroot/ui.js';

test('retired background overrides are ignored without changing other preferences or the selected theme',context=>{
 const oldStorage=globalThis.localStorage,oldDocument=globalThis.document,values=new Map(),styles=new Map([['--bg','#4338ca'],['--app-background-ink','#fff']]);
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 globalThis.document={documentElement:{dataset:{},style:{setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)}},querySelector:()=>null};
 context.after(()=>{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
 const saved=savePreferences({mainBackground:'#4338ca',weekStart:1});
 assert.equal(saved.weekStart,1);assert.equal('mainBackground' in saved,false);
 applyPreferences();assert.equal(styles.has('--bg'),false);assert.equal(styles.has('--app-background-ink'),false);
 const imported=validatePreferences({...preferences(),mainBackground:'url(https://example.com)'});
 assert.equal(imported.weekStart,1);assert.equal('mainBackground' in imported,false);
 assert.ok(![...values.values()].some(value=>value.includes('mainBackground')));
});
test('settings provide theme choices and Save without a custom background picker or reset control',()=>{
 const html=renderPage({page:'settings',records:[],space:'guest',session:{authenticated:false},settingsGroupsOpen:{appearance:true}});
 assert.doesNotMatch(html,/app-background-setting|reset-app-background|type="color"/);
 assert.match(html,/data-theme-form/);
 assert.equal((html.match(/name="themeChoice"/g)||[]).length,11);
});
test('legacy desk background metadata never creates a separate workbench background',()=>{
 const layout=defaultWorkbench();layout.background='#ffdf00';
 const html=workbenchPage({records:[{kind:'workbench',data:layout}],space:'guest',now:'2026-11-18T12:00:00Z',connectedSnapshots:[]},icon);
 assert.doesNotMatch(html,/desk-wallpaper|desk-wallpaper-ink|desk-background/);
});
