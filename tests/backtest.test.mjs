import test from 'node:test';import assert from 'node:assert/strict';
import {mergedCurves,compareInvestments,historicalMix,parseBenchmarkCsv} from '../src/Poolo.Web/wwwroot/backtest.js';
const step=(date,amount=100)=>({data:{date,amount,title:'Step',actualValue:null,valueDate:null}});
const curve=(first,last)=>[{date:'2026-01-01',price:first},{date:'2026-02-01',price:last}];
const curves={GOLD:curve(100,150),FUND:curve(100,110),BTC:curve(100,200),USD:curve(100,120)};

test('same contributions and dates are compared with nominal, non-annualized returns',()=>{
 const report=compareInvestments([step('2026-01-01')],curves,'2026-02-01');assert.equal(report.results.find(r=>r.symbol==='GOLD').value,150);assert.equal(report.results.find(r=>r.symbol==='BTC').returnPct,100);assert.equal(report.actual,null);
});
test('different contribution dates buy different unit quantities',()=>{
 const c={GOLD:[...curve(100,200),{date:'2026-03-01',price:300}],FUND:[...curve(100,110),{date:'2026-03-01',price:120}],BTC:[...curve(100,200),{date:'2026-03-01',price:300}],USD:[...curve(100,120),{date:'2026-03-01',price:140}]};const r=compareInvestments([step('2026-01-01'),step('2026-02-01')],c,'2026-03-01');assert.equal(r.results.find(r=>r.symbol==='GOLD').value,450);assert.equal(r.results.find(r=>r.symbol==='GOLD').returnPct,125);
});
test('a contribution cannot buy at a past quote before the cash existed',()=>{
 const c={...curves,GOLD:[{date:'2026-01-01',price:100},{date:'2026-01-03',price:125},{date:'2026-02-01',price:150}]};const r=compareInvestments([step('2026-01-02')],c,'2026-02-01').results.find(r=>r.symbol==='GOLD');assert.equal(r.rows[0].buyDate,'2026-01-03');assert.equal(r.value,120);
});
test('missing purchase prices and stale histories disable complete comparisons and the optimized mix',()=>{
 const r=compareInvestments([step('2025-01-01')],curves,'2026-02-01');assert.equal(r.results[0].value,null);assert.equal(r.mix,null);const stale=compareInvestments([step('2026-01-01')],curves,'2026-03-01');assert.equal(stale.stale,true);assert.equal(stale.mix,null);
});
test('BTC USD prices are converted with historical toman exchange rates',()=>{
 const api={series:{BTC_USD:{points:curve(10000,20000),source:'BTC USD'},USD:{points:curve(50,60),source:'FX'}}};const c=mergedCurves(api,[]);assert.equal(c.BTC[0].price,500000);assert.equal(c.BTC[1].price,1200000);assert.equal(c.BTC[0].fxDate,'2026-01-01');
});
test('hindsight mix respects caps and minimum fixed income and finds the linear maximum',()=>{
 const r=compareInvestments([step('2026-01-01')],curves,'2026-02-01',40,20),w=r.mix.weights;assert.deepEqual(w,{GOLD:40,FUND:20,BTC:40,USD:0});assert.equal(r.mix.value,162);assert.ok(Math.abs(r.mix.returnPct-62)<1e-9);assert.equal(Object.values(w).reduce((s,v)=>s+v,0),100);assert.throws(()=>historicalMix(r.results,20,0));assert.throws(()=>historicalMix(r.results,40,50));
});
test('actual aggregate values need the same valuation date; zero value represents a real complete loss',()=>{
 const record=step('2026-01-01');record.data.actualValue=0;record.data.valueDate='2026-02-01';assert.equal(compareInvestments([record],curves,'2026-02-01').actual.returnPct,-100);record.data.valueDate='2026-01-31';assert.equal(compareInvestments([record],curves,'2026-02-01').actual,null);
});
test('manual history accepts Persian dates and explicitly converts rial once',()=>{
 const [imported]=parseBenchmarkCsv('date,price\n1405/08/01,50000\n1405/08/02,51000','FUND','rial','Fund CSV');assert.equal(imported.year,2026);assert.equal(imported.points[0].date,'2026-10-23');assert.equal(imported.points[0].price,5000);assert.throws(()=>parseBenchmarkCsv('date,price\n1405/08/01,50000\n1405/08/01,51000','FUND','rial','CSV'));
});
test('manual observations override the same day without erasing API data on other days',()=>{
 const c=mergedCurves({series:{GOLD:{points:curve(100,200),source:'Feed'}}},[{kind:'benchmarkSeries',data:{symbol:'GOLD',source:'User',points:[{date:'2026-01-01',price:110}]}}]);assert.equal(c.GOLD.length,2);assert.equal(c.GOLD[0].price,110);assert.match(c.GOLD[0].source,/manual/);
});

test('CSV unit headers cannot silently contradict the selected unit',()=>{assert.throws(()=>parseBenchmarkCsv('date,price_rial\n1405/08/01,50000','GOLD','toman','CSV'));assert.equal(parseBenchmarkCsv('date,price_rial\n1405/08/01,50000','GOLD','rial','CSV')[0].points[0].price,5000);});
