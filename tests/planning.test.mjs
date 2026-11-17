import test from 'node:test';import assert from 'node:assert/strict';
import {fromJalali,jalaliParts,monthOf,inMonth,monthBounds,addSolarMonths,solarText,budgetBounds} from '../src/DameDast.Web/wwwroot/calendar.js';
import {setLanguage} from '../src/DameDast.Web/wwwroot/i18n.js';
import {allocate,validatePlan,comparePlan,recurringForMonth,categoryList} from '../src/DameDast.Web/wwwroot/planning.js';
import {categories} from '../src/DameDast.Web/wwwroot/finance.js';
const record=(kind,data,id=crypto.randomUUID())=>({kind,data,id,version:1,deleted:false});

test('Persian month boundaries cross Gregorian months without losing transactions',()=>{
 assert.deepEqual(monthBounds('1405-08'),{start:'2026-10-23',end:'2026-11-22'});assert.equal(inMonth('2026-10-23','1405-08'),true);assert.equal(inMonth('2026-11-21','1405-08'),true);assert.equal(inMonth('2026-11-22','1405-08'),false);assert.equal(monthOf('2026-11-16'),'1405-08');
});
test('Solar Hijri conversion handles leap Esfand and clamps monthly schedules',()=>{
 assert.equal(fromJalali(1403,12,30),'2025-03-20');assert.throws(()=>fromJalali(1404,12,30));assert.equal(addSolarMonths(fromJalali(1403,6,31),1),fromJalali(1403,7,30));assert.equal(addSolarMonths(fromJalali(1403,12,30),12),fromJalali(1404,12,29));
});
test('English and Persian displays both use the Persian calendar',()=>{
 setLanguage('en');assert.match(solarText('2026-11-16'),/1405/);assert.match(solarText('2026-11-16'),/Aban/);assert.ok(!solarText('2026-11-16').includes('2026'));setLanguage('fa');assert.match(solarText('2026-11-16'),/آبان/);setLanguage('en');
});
test('legacy Gregorian budgets retain their original date window',()=>{
 assert.deepEqual(budgetBounds({month:'2026-11'}),{start:'2026-11-01',end:'2026-12-01'});assert.deepEqual(budgetBounds({calendar:'persian',month:'1405-08'}),{start:'2026-10-23',end:'2026-11-22'});
});
test('allocation uses exact whole-toman largest remainders, including unassigned money',()=>{
 const rows=[{category:'a',basisPoints:3333},{category:'b',basisPoints:3333},{category:'c',basisPoints:3333}];const result=allocate(100,rows);assert.equal(result.reduce((s,r)=>s+r.amount,0),100);assert.equal(result.find(r=>r.category==='__unassigned').basisPoints,1);assert.equal(allocate(1,rows).reduce((s,r)=>s+r.amount,0),1);assert.equal(allocate(1e12,rows).reduce((s,r)=>s+r.amount,0),1e12);
});
test('over-allocation and duplicate categories are rejected instead of silently normalized',()=>{
 assert.throws(()=>validatePlan({month:'1405-08',total:100,rows:[{category:'a',basisPoints:6000},{category:'b',basisPoints:5000}]}));assert.throws(()=>validatePlan({month:'1405-08',total:100,rows:[{category:'a',basisPoints:5000},{category:'a',basisPoints:5000}]}));assert.equal(allocate(100,[{category:'a',basisPoints:2500}]).find(r=>r.category==='__unassigned').amount,75);
});
test('actual allocation counts categorized transfers once and excludes ordinary transfers and income',()=>{
 const records=[record('allocationPlan',{month:'1405-08',total:1000,rows:[{category:'Food & drinks',basisPoints:5000},{category:'Investment',basisPoints:5000}]}),record('transaction',{date:'2026-10-24',type:'expense',category:'Food & drinks',amount:100}),record('transaction',{date:'2026-11-15',type:'transfer',category:'Investment',amount:300}),record('transaction',{date:'2026-11-15',type:'transfer',category:'Other',amount:500}),record('transaction',{date:'2026-11-15',type:'income',category:'Salary',amount:1000}),record('transaction',{date:'2026-11-22',type:'expense',category:'Food & drinks',amount:999})];const result=comparePlan(records,'1405-08');assert.equal(result.spent,400);assert.equal(result.remaining,600);assert.equal(result.rows.find(r=>r.category==='Investment').actual,300);
});
test('recurring bills clamp Persian month-end and derive payment state from ledger entries',()=>{
 const bill=record('monthlyExpense',{title:'Bill',amount:100,category:'Home',day:31,startMonth:'1403-01',endMonth:null});const payment=record('transaction',{recurringExpenseId:bill.id,recurringMonth:'1403-12',amount:90});const row=recurringForMonth([bill,payment],'1403-12')[0];assert.equal(row.dueDate,'2025-03-20');assert.equal(row.payment.data.amount,90);assert.equal(recurringForMonth([bill,{...payment,deleted:true}],'1403-12')[0].payment,undefined);
});
test('custom category labels and IDs stay separate from built-in categories',()=>{
 const id=crypto.randomUUID(),list=categoryList([record('category',{name:'My purpose',color:'#75b29a'},id)],categories);assert.equal(list.find(c=>c.id==='custom:'+id).name,'My purpose');assert.ok(list.some(c=>c.id==='Investment'));
});
