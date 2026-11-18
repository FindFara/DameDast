import test from 'node:test';
import assert from 'node:assert/strict';
import {accountSpace,setAccountScope,scopedStorageKey,accountHeaders,initialSpace,canOpenSpace} from '../src/DameDast.Web/wwwroot/account-scope.js';
import {preferences,savePreferences} from '../src/DameDast.Web/wwwroot/preferences.js';
import {readPins,savePins} from '../src/DameDast.Web/wwwroot/nav-pins.js';
import {rememberRestoredWorkspace,restoredWorkspaces} from '../src/DameDast.Web/wwwroot/backup.js';
import {profileMenuMarkup} from '../src/DameDast.Web/wwwroot/profile-menu.js';
import {settingsPage} from '../src/DameDast.Web/wwwroot/settings-ui.js';
const alice={authenticated:true,userId:'alice',name:'Alice'},bob={authenticated:true,userId:'bob',name:'Bob'};

test('only a verified account selects private data; stale local workspace and demo choices cannot override it',()=>{
 assert.equal(accountSpace({userId:'alice',authenticated:false}),'guest');
 assert.equal(accountSpace({authenticated:true}),'guest');
 assert.equal(initialSpace(alice,'guest',[],true),'google:alice');
 assert.equal(initialSpace(bob,'google:alice',[]),'google:bob');
 assert.equal(initialSpace({authenticated:false,userId:'alice'},'google:alice',[]),'guest');
 assert.equal(initialSpace({...alice,demoEnabled:true},null,[],true),'demo');
 assert.equal(canOpenSpace('google:alice',bob,[]),false);
 assert.equal(canOpenSpace('guest',alice,[]),false);
 assert.equal(canOpenSpace('restore:other',alice,[]),false);
 assert.deepEqual(accountHeaders(alice),{'X-DameDast-User':'alice'});
 assert.deepEqual(accountHeaders({userId:'alice'}),{});
});

test('preferences, navigation pins and restored backups stay with their owning account',t=>{
 const storage=globalThis.localStorage,values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 t.after(()=>{setAccountScope(null);if(storage===undefined)delete globalThis.localStorage;else globalThis.localStorage=storage;});
 savePreferences({mainBackground:'#ffdf00'});savePins(['notes']);
 setAccountScope(alice);assert.equal(preferences().mainBackground,null);assert.deepEqual(readPins(['notes','tasks']),[]);
 savePreferences({mainBackground:'#4338ca'});savePins(['tasks']);
 const scope='restore:'+crypto.randomUUID();rememberRestoredWorkspace(scope,'Alice backup');
 assert.equal(initialSpace(alice,scope,restoredWorkspaces()),scope);
 setAccountScope(bob);assert.equal(preferences().mainBackground,null);assert.deepEqual(restoredWorkspaces(),[]);assert.deepEqual(readPins(['notes','tasks']),[]);
 assert.equal(initialSpace(bob,scope,restoredWorkspaces()),'google:bob');
 setAccountScope(alice);assert.equal(preferences().mainBackground,'#4338ca');assert.deepEqual(readPins(['notes','tasks']),['tasks']);assert.equal(restoredWorkspaces()[0].name,'Alice backup');
 setAccountScope(null);assert.equal(scopedStorageKey('key'),'key');assert.equal(preferences().mainBackground,'#ffdf00');assert.deepEqual(restoredWorkspaces(),[]);
});

test('account dropdown offers Google login or personal workspace/logout and escapes account names',()=>{
 assert.match(profileMenuMarkup({authenticated:false}),/data-action="google"/);
 assert.doesNotMatch(profileMenuMarkup(alice),/data-action="google"/);
 assert.match(profileMenuMarkup(alice),/data-action="logout"/);
 assert.doesNotMatch(profileMenuMarkup({...alice,name:'<script>bad</script>'}),/<script>/);
});

test('settings removes OAuth setup and exposes sample data only when enabled by the server',()=>{
 const dependencies={icon:()=>'',actionButton:(action,label)=>`<button data-action="${action}">${label}</button>`,pageHeading:()=>''};
 const context={session:{authenticated:false,demoEnabled:false},space:'guest',month:'2026-11'};
 const disabled=settingsPage(context,dependencies);assert.doesNotMatch(disabled,/Google sign-in setup|google-setup|Authentication:Google|data-action="demo"/);
 assert.match(settingsPage({...context,session:{...context.session,demoEnabled:true}},dependencies),/data-action="demo"/);
});
