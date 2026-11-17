import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, randomKey, safeLink, validImageData, validateToolOptions } from '../src/DameDast.Web/wwwroot/desk-tools.js';
import { defaultWorkbench, validateWorkbench } from '../src/DameDast.Web/wwwroot/workbench.js';
import { plainCalendarMarkup, toolMarkup } from '../src/DameDast.Web/wwwroot/desk-tool-ui.js';
import { renderPage } from '../src/DameDast.Web/wwwroot/ui.js';
import { isNoteRoute } from '../src/DameDast.Web/wwwroot/note-page.js';
import { setLanguage } from '../src/DameDast.Web/wwwroot/i18n.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1cAAAAASUVORK5CYII=';
test('arithmetic has precedence, unary signs, Persian digits and no executable syntax', () => {
  for (const [input, result] of [['(12 + 3) * 4',60], ['۱۰ + ۲ × ۳',16], ['-2 * -(4 + 1)',10], ['0.1 + 0.2',.3], ['17%5',2], ['1/4',.25]]) assert.equal(calculate(input),result);
  for (const input of ['1/0','1%0','alert(1)','1;2','globalThis.process','2**3','(1+2','1e100','9'.repeat(161)]) assert.throws(()=>calculate(input));
});
test('keys use Web Crypto and the requested length and alphabet', () => {
  for (const format of ['hex','base64url']) for (const length of [16,32,128]) {
    const key=randomKey(length,format);
    assert.equal(key.length,length); assert.match(key, format==='hex'?/^[\da-f]+$/:/^[\w-]+$/);
  }
  assert.notEqual(randomKey(),randomKey());
  assert.throws(()=>randomKey(129)); assert.throws(()=>randomKey(15));
  let calls=0; const source={getRandomValues(bytes){calls++;bytes.fill(255);return bytes;}};
  assert.equal(randomKey(16,'hex',source),'f'.repeat(16)); assert.equal(calls,1);
});
test('links are bounded web addresses and previews cannot inject markup or opener access',()=>{
  assert.equal(safeLink('https://example.com/path?q=1'),'https://example.com/path?q=1');
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/x','https://user:pass@example.com','https://example.com\n/path','//example.com','https://example.com/'+ 'a'.repeat(2000)]) assert.throws(()=>safeLink(url));
  const html=toolMarkup({}, {type:'link',title:'<script>bad()</script>',options:{url:'https://example.com',description:'<img src=x>'}});
  assert.match(html,/target="_blank" rel="noopener noreferrer"/); assert.doesNotMatch(html,/<script>|<img src=x>/);
});
test('photos and widget options have the same bounded format in settings and backups',()=>{
  assert.equal(validImageData(png),true);
  for(const data of ['data:image/svg+xml;base64,PHN2Zz4=', 'https://example.com/photo.png', 'data:image/png;base64,YmFk',png+'A'.repeat(120000)]) assert.equal(validImageData(data),false);
  for(const [type,options] of [['image',{imageData:png}],['clock',{clockStyle:'analog',timeZone:'UTC'}],['pet',{petStyle:'cat'}],['plainCalendar',{calendar:'persian'}]]) validateToolOptions(type,options);
  for(const [type,options] of [['image',{imageData:'data:image/png;base64,YmFk'}],['clock',{clockStyle:'script'}],['pet',{petStyle:'unknown'}],['notes',{url:'https://example.com'}],['calculator',{imageData:png}]]) assert.throws(()=>validateToolOptions(type,options));
  const desk=defaultWorkbench(); desk.widgets=[];
  for(let i=0;i<4;i++) desk.widgets.push({id:crypto.randomUUID(),type:'image',x:i,y:0,width:1,height:1,background:null,options:{imageData:png}});
  validateWorkbench(desk);
  desk.widgets.push({...desk.widgets[0],id:crypto.randomUUID(),x:4}); assert.throws(()=>validateWorkbench(desk));
});
test('plain calendar has only dates, can navigate months and never renders note content',()=>{
  setLanguage('en');
  for(const calendar of ['persian','gregory']) {
    const current=plainCalendarMarkup({calendar},0,'2026-11-18T12:00:00Z');
    const next=plainCalendarMarkup({calendar},1,'2026-11-18T12:00:00Z');
    assert.notEqual(current,next); assert.match(current,/aria-current="date"/); assert.doesNotMatch(current,/data-action="edit"/);
  }
});
test('notes have a dedicated route and a plain composer without PDF or a duplicate create heading',()=>{
  assert.equal(isNoteRoute('note/new'),true); assert.equal(isNoteRoute(`note/${crypto.randomUUID()}`),true); assert.equal(isNoteRoute('notes'),false);
  const html=renderPage({page:'notes',records:[],space:'guest',now:'2026-11-18T12:00:00Z',filter:''});
  assert.equal((html.match(/data-action="note-pdf-add"/g)||[]).length,0);
  assert.doesNotMatch(html.split('</div><nav')[0],/New note/);
});
