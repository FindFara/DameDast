import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedMarketSymbols, validMarketSymbols, deskMarketQuote } from '../src/DameDast.Web/wwwroot/desk-markets.js';
import { validateToolOptions } from '../src/DameDast.Web/wwwroot/desk-tools.js';
import { marketsWidget } from '../src/DameDast.Web/wwwroot/workbench-ui.js';
import { toolMarkup, optionsFromForm } from '../src/DameDast.Web/wwwroot/desk-tool-ui.js';
import { defaultWorkbench } from '../src/DameDast.Web/wwwroot/workbench.js';
import { setLanguage } from '../src/DameDast.Web/wwwroot/i18n.js';
const now='2026-11-28T12:00:00Z';
const quote=(symbol,price,unit,changePercent=1,asOf=now)=>({symbol,price,unit,changePercent,asOf,source:'TGJU'});
test('selected prices default to BTC, gold, silver and dollar and save a bounded unique selection',()=>{
 assert.deepEqual(selectedMarketSymbols(null),['BTC','GOLD','SILVER','USD']);
 assert.ok(defaultWorkbench().widgets.some(w=>w.type==='markets'));
 const options=optionsFromForm('markets',{'market-ETH':'on','market-GOLD':'on'});
 assert.deepEqual(selectedMarketSymbols(options),['GOLD','ETH']);validateToolOptions('markets',options);
 for(const value of ['', 'BTC,BTC','FAKE','BTC,GOLD,SILVER,USD,ETH,USDT,XRP,DOGE,ADA']){
  assert.equal(validMarketSymbols(value),false);assert.throws(()=>validateToolOptions('markets',{symbols:value}));
 }
});
test('dollar-priced assets use the dollar quote with matching percentage and freshness, and retain the USD unit if conversion is unavailable',()=>{
 const market={quotes:[quote('BTC',100,'USD / BTC',10),quote('USD',50000,'toman / USD',2,'2026-11-28T08:00:00Z')]};
 const converted=deskMarketQuote('BTC',market,now);assert.equal(converted.price,5000000);assert.equal(converted.unit,'toman');assert.ok(Math.abs(converted.change-12.2)<0.0001);assert.equal(converted.delayed,true);
 const original=deskMarketQuote('BTC',{quotes:[market.quotes[0]]},now);assert.equal(original.price,100);assert.equal(original.unit,'USD');
 assert.equal(deskMarketQuote('GOLD',market,now),null);
});
test('market rows render real values, percentage and unavailable states without inventing missing prices',()=>{
 setLanguage('en');
 const html=marketsWidget({now,marketData:{quotes:[quote('USD',50000,'toman / USD',null)]}},{options:{symbols:'USD,ETH'}});
 assert.match(html,/data-symbol="USD"/);assert.match(html,/50,000/);assert.match(html,/data-symbol="ETH"/);assert.doesNotMatch(html,/0\.00%/);
 const clock=toolMarkup({now},{type:'clock',options:{timeZone:'local'}});
 assert.match(clock,/desk-clock-time/);assert.doesNotMatch(clock,/Device time/);
});
