import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FORMAT,BUNDLE,normalizeSnapshot,normalizeBundle,mergeSnapshot,portfolioTotals,providerForUrl,sumMoney} from '../src/Poolo.Web/wwwroot/extension/shared/portfolio.js';
import {parseMoney,parseDate,parseStatus,parseDelimited,mapTable,suggestMapping} from '../src/Poolo.Web/wwwroot/extension/shared/extract.js';
import {renderPortfolio} from '../src/Poolo.Web/wwwroot/extension/shared/view.js';
import {syncBatch} from '../src/Poolo.Web/wwwroot/connected-store.js';
const at='2026-11-15T12:00:00.000Z';
const asset=(key,value='100')=>({key,label:key,assetType:'equity',symbol:key,quantity:'2',valueToman:value,lockedToman:null,observedAt:at});
const snapshot=(items=[asset('A')],extra={})=>({format:FORMAT,captureId:'capture-1',provider:'easytrader',account:'Personal',scope:'Portfolio',category:'assets',capturedAt:at,coverage:'partial',items,...extra});
const loan=(key,status='unpaid')=>({key,label:key,amountToman:'100',dueDate:'2026-11-25',status,observedAt:at});

test('money is parsed from Persian and Arabic digits and rial is divided exactly once',()=>{
 assert.equal(parseMoney('۱۲۳٬۴۵۶ ریال','rial'),'12345.60');assert.equal(parseMoney('١٢٣٫٥ تومان','toman'),'123.5');assert.equal(parseMoney('۱ ریال','rial'),'0.10');
 assert.throws(()=>parseMoney('۱۰۰ تومان','rial'));assert.throws(()=>parseMoney('1,000 USD','toman'));assert.throws(()=>parseMoney('-100','toman'));
});
test('dates convert Persian years and month names without guessing missing dates',()=>{
 assert.equal(parseDate('۱۴۰۳/۱۲/۳۰'),'2025-03-20');assert.equal(parseDate('۲۵ آبان ۱۴۰۵'),'2026-11-16');assert.equal(parseDate('2026/11/25'),'2026-11-25');
 assert.throws(()=>parseDate('۱۴۰۴/۱۲/۳۰'));assert.throws(()=>parseDate('2026-02-30'));assert.throws(()=>parseDate('آخر ماه'));
});
test('negative payment status cannot accidentally become paid',()=>{
 assert.equal(parseStatus('پرداخت نشده'),'unpaid');assert.equal(parseStatus('پرداخت‌شده'),'paid');assert.equal(parseStatus('تسویه نشده'),'unpaid');assert.equal(parseStatus('در حال بررسی'),'unknown');
});
test('CSV quoting, embedded commas and tabs are preserved',()=>{
 assert.deepEqual(parseDelimited('name,value\n"ABC, fund",100\n').rows,[['ABC, fund','100']]);
 assert.deepEqual(parseDelimited('نماد\tتعداد\nفولاد\t۱۲').headers,['نماد','تعداد']);assert.throws(()=>parseDelimited('name,value\n"unclosed,100'));
});
test('five provider table fixtures become reviewed snapshots with explicit units',()=>{
 const fixtures=[
  {provider:'easytrader',category:'assets',headers:['نماد','تعداد','ارزش روز'],rows:[['فولاد','۱۰۰','۲۵۰٬۰۰۰']],assetType:'equity'},
  {provider:'agah',category:'assets',headers:['نماد','تعداد سهام','ارزش دارایی'],rows:[['فملی','۲۰۰','۴۵۰٬۰۰۰']],assetType:'equity'},
  {provider:'nobitex',category:'assets',headers:['currency','balance','rialBalance'],rows:[['BTC','0.000000000000000001','10000']],assetType:'crypto'},
  {provider:'digipay',category:'installments',headers:['عنوان','مبلغ قسط','سررسید','وضعیت'],rows:[['Laptop','۱۲٬۰۰۰٬۰۰۰','۱۴۰۵/۹/۱','پرداخت نشده']]},
  {provider:'snapppay',category:'installments',headers:['merchant','amount','due date','status'],rows:[['Shop','500000','2026-11-25','unpaid']]},
 ];
 for(const f of fixtures){const result=mapTable(f,{...f,account:'Personal',scope:'Reviewed',mapping:suggestMapping(f.headers,f.category),unit:'rial',defaultStatus:'unknown',capturedAt:at});assert.equal(result.failures.length,0);assert.equal(result.snapshot.items.length,1);assert.equal(result.snapshot.coverage,'partial');}
});
test('unknown valuation and payment status stay unknown instead of zero or unpaid',()=>{
 const table={headers:['نماد','تعداد'],rows:[['A','12']]};const r=mapTable(table,{provider:'agah',category:'assets',account:'P',scope:'P',assetType:'equity',unit:'rial',mapping:suggestMapping(table.headers,'assets'),capturedAt:at});
 assert.equal(r.items[0].valueToman,null);const total=portfolioTotals([r.snapshot,snapshot([loan('loan','unknown')],{category:'installments',provider:'digipay'})]);assert.equal(total.unpriced,1);assert.equal(total.debt,'0.00');assert.equal(total.unknownDebt,1);
});
test('bad numeric rows are reported and are never silently imported',()=>{
 const table={headers:['نماد','تعداد'],rows:[['A','۱۰'],['B','not loaded']]};const r=mapTable(table,{provider:'agah',category:'assets',account:'P',scope:'P',assetType:'equity',unit:'rial',mapping:suggestMapping(table.headers,'assets'),capturedAt:at});assert.equal(r.snapshot,undefined);assert.equal(r.failures[0].row,2);
});
test('ambiguous same-name installments require a unique reference',()=>{
 assert.throws(()=>normalizeSnapshot(snapshot([loan('same'),loan('same')],{category:'installments'})),/Duplicate/);
});
test('partial captures merge by stable row key and repeated imports do not duplicate holdings',()=>{
 const old=snapshot([asset('A'),asset('B')]);const incoming=snapshot([asset('A','150')],{captureId:'capture-2',capturedAt:'2026-11-15T13:00:00.000Z'});
 const merged=mergeSnapshot(old,incoming);assert.equal(merged.items.length,2);assert.equal(merged.items[0].valueToman,'150');assert.equal(merged.items[1].observedAt,at);assert.deepEqual(mergeSnapshot(merged,incoming),merged);
});
test('only an explicitly complete list removes missing rows and older snapshots are rejected',()=>{
 const old=snapshot([asset('A'),asset('B')]);const incoming=snapshot([asset('A')],{captureId:'capture-2',capturedAt:'2026-11-15T13:00:00.000Z',coverage:'complete'});
 assert.equal(mergeSnapshot(old,incoming).items.length,1);assert.throws(()=>mergeSnapshot(incoming,old),/older/);assert.throws(()=>mergeSnapshot(old,{...incoming,account:'Other'}),/Mismatched/);
});
test('totals use decimal fixed precision and unknown installment statuses are excluded',()=>{
 assert.equal(sumMoney(['0.1','0.2']),'0.30');const total=portfolioTotals([snapshot([asset('A','0.1'),asset('B','0.2')]),snapshot([loan('unpaid'),loan('paid','paid'),loan('unknown','unknown')],{category:'installments',provider:'digipay'})]);
 assert.equal(total.assets,'0.30');assert.equal(total.debt,'100.00');
});
test('source hosts reject lookalikes and HTTP provider pages',()=>{
 assert.equal(providerForUrl('https://d.easytrader.emofid.com/portfolio'),'easytrader');assert.equal(providerForUrl('https://online.agah.com'),'agah');assert.equal(providerForUrl('https://app.snapp.taxi/?superapp_service=25'),'snapppay');
 assert.equal(providerForUrl('https://app.mydigipay.com.evil.example'),null);assert.equal(providerForUrl('http://nobitex.ir'),null);
});
test('only schema fields leave the extractor; credentials and arbitrary page content are removed',()=>{
 const clean=normalizeSnapshot({...snapshot([{...asset('A'),token:'must-not-leave'}]),cookies:'must-not-leave',url:'https://example?token=secret'});
 assert.ok(!JSON.stringify(clean).includes('must-not-leave'));assert.ok(!JSON.stringify(clean).includes('secret'));
});
test('rendering escapes financial labels and shows tiny crypto quantities without losing digits',()=>{
 const html=renderPortfolio([snapshot([{...asset('A'),label:'<img src=x onerror=alert(1)>',quantity:'0.000000000000000001',assetType:'crypto'}])],'en');
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(html.includes('0.000000000000000001'));
});
test('sync batches are bounded by UTF-8 bytes as well as item count',()=>{
 const pending=Array.from({length:5},(_,id)=>({id,data:'ف'.repeat(40000)}));const batch=syncBatch(pending);assert.equal(batch.length,2);assert.ok(new TextEncoder().encode(JSON.stringify({changes:batch})).length<256000);
});
test('extension uses an explicit active-tab capture and no cookie or global read permission',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../src/Poolo.Web/wwwroot/extension/manifest.json',import.meta.url),'utf8'));
 assert.deepEqual(manifest.permissions,['activeTab','scripting','storage']);assert.equal(manifest.host_permissions,undefined);assert.equal(manifest.content_scripts,undefined);assert.ok(!manifest.permissions.includes('cookies'));
});
test('bundle limits and malformed date, valuation and quantities are rejected',()=>{
 assert.throws(()=>normalizeBundle({format:BUNDLE,snapshots:[]}));assert.throws(()=>normalizeSnapshot(snapshot([{...asset('A'),valueToman:'1e20'}])));assert.throws(()=>normalizeSnapshot(snapshot([{...asset('A'),lockedToman:'101'}])));assert.throws(()=>normalizeSnapshot(snapshot([{...loan('x'),dueDate:'2026-02-30'}],{category:'installments'})));
});
