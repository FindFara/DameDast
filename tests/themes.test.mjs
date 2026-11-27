import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { themeOptions, isTheme, resolveTheme } from '../src/DameDast.Web/wwwroot/themes.js';
import { setTheme, getTheme, effectiveTheme, applyPreferences } from '../src/DameDast.Web/wwwroot/i18n.js';
const custom = ['azki-blue', 'dark-green', 'dark-blue', 'gray-yellow', 'white-yellow', 'white-green', 'dracula', 'nord', 'catppuccin-mocha', 'tokyo-night', 'gruvbox'];
const bootstrap = fs.readFileSync(new URL('../src/DameDast.Web/wwwroot/appearance.js',import.meta.url),'utf8');
test('all custom themes restore the same palette and light/dark behavior before and after app startup',()=>{
  assert.ok(custom.every(isTheme));
  assert.equal(isTheme('unknown'),false);
  for(const id of [...themeOptions.map(theme=>theme.id),'light','dark','dark-brown','system','unknown']) for(const dark of [false,true]){
    const root={dataset:{},style:{setProperty(){}}};
    vm.runInNewContext(bootstrap,{URLSearchParams,location:{search:''},localStorage:{getItem:key=>key==='damdast-azki-theme'?id:null},matchMedia:()=>({matches:dark}),document:{documentElement:root}});
    const expected=resolveTheme(id,dark);
    assert.equal(root.dataset.palette,expected.id);
    assert.equal(root.dataset.theme,expected.mode);
    assert.equal(root.style.colorScheme,expected.mode);
  }
});
test('custom theme choices persist and apply globally while existing light/dark consumers retain valid modes',context=>{
  const old={localStorage:globalThis.localStorage,document:globalThis.document,matchMedia:globalThis.matchMedia};
  const values=new Map([['damdast-theme','dracula']]),styles=new Map(); let meta;
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  globalThis.document={documentElement:{dataset:{},style:{setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)}},querySelector:()=>({setAttribute:(_,value)=>meta=value})};
  globalThis.matchMedia=()=>({matches:true});
  context.after(()=>{for(const [key,value] of Object.entries(old)) if(value===undefined)delete globalThis[key];else globalThis[key]=value;setTheme('system');});
  for(const id of custom){
    setTheme(id);applyPreferences();
    const theme=resolveTheme(id);
    assert.equal(getTheme(),id);
    assert.equal(values.get('damdast-azki-theme'),id);
    assert.equal(document.documentElement.dataset.palette,id);
    assert.equal(effectiveTheme(),theme.mode);
    assert.equal(document.documentElement.style.colorScheme,theme.mode);
    assert.equal(meta,theme.background);
  }
  assert.equal(values.get('damdast-theme'),'dracula');
  setTheme('unknown');assert.equal(getTheme(),'gruvbox');
  setTheme('system');assert.equal(effectiveTheme(),'dark');
});
const luminance=hex=>{
  const c=hex.replace('#','');const full=c.length===3?c.split('').map(v=>v+v).join(''):c;
  const values=[0,2,4].map(i=>parseInt(full.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('palette text, muted labels and primary buttons have readable contrast',()=>{
  const css=fs.readFileSync(new URL('../src/DameDast.Web/wwwroot/themes.css',import.meta.url),'utf8');
  for(const id of custom){
    const block=css.split(`:root[data-palette="${id}"] {`)[1].split('}')[0];
    const tokens=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]+);/g)].map(m=>[m[1],m[2]]));
    assert.equal(tokens.bg,resolveTheme(id).background);
    assert.ok(contrast(tokens.ink,tokens.surface)>=7,id+' text');
    assert.ok(contrast(tokens.muted,tokens.surface)>=4.5,id+' labels');
    assert.ok(contrast(tokens['theme-on-accent'],tokens['theme-action']||tokens.accent)>=4.5,id+' button');
    assert.ok(contrast(tokens.accent,tokens.surface)>=4.5,id+' accent text');
  }
});

test('theme picker offers eleven two-color radio choices and an explicit save action',async()=>{
  const { parseHTML } = await import('linkedom');
  const { themePicker } = await import('../src/DameDast.Web/wwwroot/settings-ui.js');
  const previous = getTheme();
  const {document}=parseHTML(themePicker('dark-blue'));
  assert.equal(document.querySelectorAll('input[type="radio"]').length,11);
  assert.equal(document.querySelector('input:checked').value,'dark-blue');
  assert.equal(document.querySelector('select'),null);
  assert.ok(document.querySelector('[data-theme-form] button[type="submit"]'));
  assert.equal(getTheme(),previous);
  assert.deepEqual(themeOptions.map(t=>t.id),custom);
  assert.ok(themeOptions.every(t=>/^#[0-9a-f]{6}$/.test(t.background)&&/^#[0-9a-f]{6}$/.test(t.accent)));
  assert.equal(resolveTheme('light').id,'white-green');
  assert.equal(resolveTheme('dark').id,'dark-green');
  assert.equal(resolveTheme('dark-brown').id,'dark-green');
});
