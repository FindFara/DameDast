import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { dashboardSections, defaultDashboardLayout, normalizeDashboardLayout, moveDashboardSection, toggleDashboardSection } from '../src/DameDast.Web/wwwroot/dashboard-layout.js';
import { preferences, savePreferences, validatePreferences } from '../src/DameDast.Web/wwwroot/preferences.js';
import { setAccountScope } from '../src/DameDast.Web/wwwroot/account-scope.js';
import { makeDemo, materialize } from '../src/DameDast.Web/wwwroot/finance.js';
import { renderPage } from '../src/DameDast.Web/wwwroot/ui.js';
import { monthOf } from '../src/DameDast.Web/wwwroot/calendar.js';

function storage(context) {
  const old = globalThis.localStorage, values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
  setAccountScope(null);
  context.after(() => {setAccountScope(null);if(old === undefined)delete globalThis.localStorage;else globalThis.localStorage = old;});
  return values;
}
const base = () => {
  const demo = makeDemo('2026-11-26');
  return {page:'overview',space:'demo',records:materialize(demo).filter(r=>!r.deleted),month:monthOf('2026-11-26'),now:'2026-11-26T10:00:00Z',session:{authenticated:false},marketData:{quotes:[]},amountsVisible:false};
};

test('layout normalization preserves known order and visibility, removes duplicate/unknown sections and appends new defaults',()=>{
  const layout = normalizeDashboardLayout([{id:'budgets',visible:false},{id:'unknown',visible:true},{id:'budgets',visible:true},null,{id:'week',visible:true}]);
  assert.deepEqual(layout.slice(0,2),[{id:'budgets',visible:false},{id:'week',visible:true}]);
  assert.equal(layout.length,dashboardSections.length);
  assert.equal(new Set(layout.map(r=>r.id)).size,dashboardSections.length);
  assert.deepEqual(normalizeDashboardLayout(null),defaultDashboardLayout());
  const fresh=defaultDashboardLayout();fresh[0].visible=false;assert.equal(defaultDashboardLayout()[0].visible,true);
});
test('moving a section retains its visibility, respects boundaries and never mutates the saved layout',()=>{
  const layout=toggleDashboardSection(defaultDashboardLayout(),'week',false);
  const moved=moveDashboardSection(layout,'week',-1);
  assert.deepEqual(moved[0],{id:'week',visible:false});assert.equal(layout[0].id,'summary');
  assert.deepEqual(moveDashboardSection(moved,'week',-1),moved);
  assert.deepEqual(moveDashboardSection(moved,'week',4),moved);
});
test('saving and reloading keeps the complete layout account-scoped and compatible with old backups',context=>{
  storage(context);
  const layout=moveDashboardSection(toggleDashboardSection(defaultDashboardLayout(),'market',false),'week',-1);
  savePreferences({dashboardLayout:layout});assert.deepEqual(preferences().dashboardLayout,layout);
  setAccountScope({authenticated:true,userId:'alice'});assert.deepEqual(preferences().dashboardLayout,defaultDashboardLayout());
  savePreferences({dashboardLayout:toggleDashboardSection(defaultDashboardLayout(),'summary',false)});
  setAccountScope(null);assert.deepEqual(preferences().dashboardLayout,layout);
  const legacy={...preferences()};delete legacy.dashboardLayout;
  assert.deepEqual(validatePreferences(legacy).dashboardLayout,defaultDashboardLayout());
});
test('the actual dashboard respects the saved order and hidden sections, including a completely empty layout',context=>{
  storage(context);
  let layout=defaultDashboardLayout().map(item=>({...item,visible:['summary','market','budgets'].includes(item.id)}));
  layout=moveDashboardSection(layout,'summary',1);
  for(let i=0;i<7;i++)layout=moveDashboardSection(layout,'budgets',-1);
  savePreferences({dashboardLayout:layout});
  const {document}=parseHTML(renderPage(base()));
  assert.deepEqual([...document.querySelectorAll('[data-dashboard-section]')].map(el=>el.dataset.dashboardSection),['budgets','summary','market']);
  assert.ok(document.querySelector('.dashboard-single [data-dashboard-section="budgets"]'));
  assert.equal(document.querySelector('.weekly-agenda'),null);assert.equal(document.querySelector('.movement-list'),null);
  savePreferences({dashboardLayout:layout.map(item=>({...item,visible:false}))});
  const empty=parseHTML(renderPage(base())).document;
  assert.equal(empty.querySelectorAll('[data-dashboard-section]').length,0);
  assert.ok(empty.querySelector('[data-action="dashboard-customize"]'));
});
test('settings preview reflects unsaved visibility and order while leaving the saved dashboard unchanged',context=>{
  storage(context);
  const draft=moveDashboardSection(toggleDashboardSection(defaultDashboardLayout(),'summary',false),'week',-1);
  const {document}=parseHTML(renderPage({...base(),page:'settings',settingsGroupsOpen:{dashboard:true},dashboardLayoutDraft:draft}));
  assert.equal(document.querySelectorAll('[data-dashboard-visible]').length,8);
  assert.equal(document.querySelector('[data-dashboard-row]').dataset.dashboardRow,'week');
  assert.equal(document.querySelector('[data-dashboard-visible="summary"]').hasAttribute('checked'),false);
  assert.equal(document.querySelector('.preview-summary'),null);
  assert.equal(document.querySelector('.dashboard-preview-block').classList.contains('preview-week'),true);
  assert.ok(document.querySelector('[data-dashboard-layout-form] [type="submit"]'));
  assert.deepEqual(preferences().dashboardLayout,defaultDashboardLayout());
});
