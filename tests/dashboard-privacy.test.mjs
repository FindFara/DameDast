import test from 'node:test';
import assert from 'node:assert/strict';
import { amountText } from '../src/Poolo.Web/wwwroot/privacy.js';
import { renderPage } from '../src/Poolo.Web/wwwroot/ui.js';
import { today } from '../src/Poolo.Web/wwwroot/finance.js';
import { monthOf } from '../src/Poolo.Web/wwwroot/calendar.js';
import { setLanguage, localizedNumber } from '../src/Poolo.Web/wwwroot/i18n.js';

setLanguage('en');
const accountId = crypto.randomUUID();
const context = {
  page:'overview', space:'guest', month:monthOf(today()), flowPeriod:'monthly',
  now:new Date().toISOString(),
  records:[
    {id:accountId,kind:'account',data:{name:'Private account',openingBalance:987654321,color:'teal'}},
    {id:crypto.randomUUID(),kind:'transaction',data:{accountId,type:'income',amount:87654321,category:'Salary',date:today(),note:'Pay'}},
    {id:crypto.randomUUID(),kind:'goal',data:{name:'Private goal',saved:123456789,target:456789123,pinned:true}},
  ],
  marketData:{quotes:[{symbol:'GOLD',price:345678,asOf:new Date().toISOString(),changePercent:1,source:'Fixture'}]},
};

test('dashboard defaults to masked figures, including chart tooltips, pinned goals and quotes',()=>{
  const html=renderPage(context);
  for(const value of [987654321+87654321,87654321,123456789,456789123,345678])
    assert.equal(html.includes(localizedNumber(value)),false,`Leaked ${value}`);
  assert.match(html,/Show amounts/);
  assert.match(html,/Income: ••••/);
});
test('showing figures reveals the same balances and hiding them again restores masking',()=>{
  const html=renderPage({...context,amountsVisible:true});
  for(const value of [987654321+87654321,87654321,123456789,456789123,345678])
    assert.ok(html.includes(localizedNumber(value)),`Missing ${value}`);
  assert.match(html,/Hide amounts/);
  assert.equal(amountText(987654321,context),'••••');
});
test('dashboard masking does not conceal amounts on other pages or counts and dates',()=>{
  assert.equal(amountText(987654321,{page:'transactions',amountsVisible:false}),localizedNumber(987654321));
  const html=renderPage(context);
  assert.ok(html.includes('Private account'));
  assert.match(html,/1 accounts?/i);
});
