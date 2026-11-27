import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { azkiHeader, azkiDashboard } from '../src/DameDast.Web/wwwroot/azki-ui.js';
import { icon, sections } from '../src/DameDast.Web/wwwroot/ui.js';
import { setLanguage } from '../src/DameDast.Web/wwwroot/i18n.js';

test('the new header keeps real routes, translated labels and active page state in both languages',()=>{
  for(const language of ['fa','en']){
    setLanguage(language);
    const {document}=parseHTML(azkiHeader('accounts',icon,sections));
    const links=[...document.querySelectorAll('a[href]')];
    assert.ok(links.length>20);
    assert.ok(links.every(link=>sections[link.getAttribute('href').slice(1)]));
    assert.equal(document.querySelector('a[aria-current="page"]').getAttribute('href'),'#accounts');
    assert.ok(document.querySelector('.azki-nav-menu > summary.is-current'));
    assert.ok(links.every(link=>link.textContent.trim().length>0));
  }
});
test('all eight dashboard service cards navigate to working pages without embedding financial data',()=>{
  setLanguage('fa');
  const {document}=parseHTML(azkiDashboard({records:[]},icon));
  const links=[...document.querySelectorAll('.azki-service')];
  assert.equal(links.length,8);
  assert.ok(links.every(link=>sections[link.getAttribute('href').slice(1)]));
  assert.equal(document.querySelector('button[data-action="workspace-search"]')!==null,true);
  assert.ok(document.querySelector('.azki-home-tabs a[aria-current="page"]'));
  assert.equal(document.querySelector('img[src^="http"]'),null);
});
