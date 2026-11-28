import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentEntries, receivableEntries, financeTypeField } from '../src/DameDast.Web/wwwroot/finance-collections.js';
import { preserveAssetTypes, assetTypePreset, separateAssetEntries } from '../src/DameDast.Web/wwwroot/asset-types.js';
import { navigationGroups, resolveFinanceRoute } from '../src/DameDast.Web/wwwroot/navigation.js';
import { validPins } from '../src/DameDast.Web/wwwroot/nav-pins.js';
import { assetEntries } from '../src/DameDast.Web/wwwroot/assets.js';
const row=(id,kind,data)=>({id,kind,data,version:1,deleted:false});
test('menus combine payment kinds and asset kinds while migrating old routes and pins',()=>{
 const pages=navigationGroups.flatMap(g=>g.items);
 assert.ok(navigationGroups.find(g=>g.id==='money').items.includes('installments'));
 assert.ok(!navigationGroups.some(g=>g.id==='obligations'));
 assert.ok(pages.includes('installments'));assert.ok(pages.includes('assets'));
 for(const page of ['monthlyExpenses','receivables','locked','connected'])assert.ok(!pages.includes(page));
 assert.equal(resolveFinanceRoute('monthlyExpenses'),'installments');assert.equal(resolveFinanceRoute('locked'),'assets');
 assert.deepEqual(validPins(['locked','receivables','assets','monthlyExpenses','installments'],pages),['assets','installments']);
 assert.match(financeTypeField('assetPosition',true),/data-finance-kind/);assert.doesNotMatch(financeTypeField('assetPosition',true),/disabled/);
});
test('payment list combines installments with the selected month of fixed costs without counting payment transactions twice',()=>{
 const installment=row('i','installment',{title:'Loan',amount:100,dueDate:'2026-11-28',paid:false});
 const bill=row('b','monthlyExpense',{title:'Bill',amount:50,day:31,startMonth:'1405-01',endMonth:null});
 const payment=row('p','transaction',{recurringExpenseId:'b',recurringMonth:'1405-09',amount:40});
 const entries=paymentEntries([installment,bill,payment,{...installment,id:'deleted',deleted:true}],'1405-09');
 assert.equal(entries.length,2);assert.equal(entries.find(e=>e.id==='b').paid,true);assert.equal(entries.find(e=>e.id==='b').amount,40);
 assert.equal(entries.find(e=>e.id==='b').date,'2026-12-21');
});
test('asset classification round trips retain original repayments and value instead of silently resetting them',()=>{
 const current=row('r','receivable',{person:'Person',amount:200,returned:50,lentOn:'2026-11-28',note:'note'});
 const locked=assetTypePreset(current,'locked');assert.equal(locked.amount,'150');
 const data=preserveAssetTypes(current,'locked',locked);
 const restored=assetTypePreset({...current,kind:'locked',data},'receivable');
 assert.equal(restored.amount,200);assert.equal(restored.returned,50);
 assert.equal(receivableEntries([current,row('l','locked',{name:'Deposit',amount:30})])[0].amount,30);
});
test('locked source cost basis is not counted again and reclassified external assets do not reappear as ordinary assets',()=>{
 const locked=row('l','locked',{name:'Deposit',amount:30});
 const entries=assetEntries([locked],[],null,'2026-11-28T12:00:00Z');
 assert.equal(separateAssetEntries(entries,[locked]).length,0);
 const sourceKey=JSON.stringify(['external','nobitex','Account','Portfolio','assets','btc']);
 const converted=row('c','locked',{name:'Bitcoin',amount:100,assetTypeData:{assetPosition:{sourceKey}}});
 const snapshot={provider:'nobitex',account:'Account',scope:'Portfolio',category:'assets',capturedAt:'2026-11-28T12:00:00Z',items:[{key:'btc',label:'Bitcoin',quantity:'1',valueToman:'100'}]};
 const result=assetEntries([converted],[snapshot],null,'2026-11-28T12:00:00Z');
 assert.equal(result.filter(a=>a.source?.source==='nobitex').length,0);
});
