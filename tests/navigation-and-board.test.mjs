import test from 'node:test';
import assert from 'node:assert/strict';
import {filterTransactions,normalizeTransactionFilters,transactionBoard} from '../src/DameDast.Web/wwwroot/transaction-board.js';
import {togglePin,validPins} from '../src/DameDast.Web/wwwroot/nav-pins.js';
import {filterOptions} from '../src/DameDast.Web/wwwroot/select-sheet.js';
import {holidayData,dayHoliday} from '../src/DameDast.Web/wwwroot/holidays.js';
import {dateInMonth,jalaliParts} from '../src/DameDast.Web/wwwroot/calendar.js';

test('the transaction list contains every month and category once, including ungrouped records',()=>{
 const records=Array.from({length:21},(_,i)=>({id:String(i),kind:'transaction',data:{category:i===0?'':'category-'+(i%7),amount:i+1,date:i%2?'2026-10-01':'2026-11-18',type:'expense'}}));
 const all=filterTransactions(records);
 assert.equal(all.length,21);assert.equal(new Set(all.map(record=>record.id)).size,21);
 assert.equal(all[0].data.date,'2026-11-18');
 assert.equal(filterTransactions(records,{group:'__uncategorized'}).length,1);
 assert.equal(filterTransactions(records,{group:'category-2'}).length,3);
 const html=transactionBoard({},all,{icon:()=>'',categoryTitle:(c,id)=>id||'Other',accountName:()=>'',dataText:(c,s)=>s});
 assert.equal((html.match(/class="transaction-row"/g)||[]).length,21);assert.doesNotMatch(html,/transaction-column|<h2>/);
});
test('transaction group, amount and inclusive date filters compose and reject reversed ranges',()=>{
 const records=[{id:'a',kind:'transaction',data:{type:'expense',category:'food',note:'Tea',amount:100,date:'2026-11-01'}},{id:'b',kind:'transaction',data:{type:'expense',category:'food',note:'Coffee',amount:200,date:'2026-11-30'}},{id:'c',kind:'transaction',data:{type:'income',category:'food',amount:300,date:'2026-12-01'}}];
 const filters=normalizeTransactionFilters({minAmount:'۱۰۰',maxAmount:'۲۰۰',dateFrom:'2026-11-01',dateTo:'2026-11-30',group:'food',type:'expense'});
 assert.deepEqual(filterTransactions(records,filters).map(record=>record.id),['b','a']);
 assert.deepEqual(filterTransactions(records,{...filters,search:'tea'}).map(record=>record.id),['a']);
 assert.throws(()=>normalizeTransactionFilters({minAmount:'200',maxAmount:'100'}));
 assert.throws(()=>normalizeTransactionFilters({dateFrom:'2026-12-01',dateTo:'2026-11-01'}));
 assert.throws(()=>normalizeTransactionFilters({minAmount:'bad'}));
 assert.equal(filterTransactions([...records,{...records[0],deleted:true}]).length,3);
});
test('pins keep their order without a count limit and filter duplicate or unavailable menus',()=>{
  let pins=[];
  for(const key of ['notes','calendar','transactions','accounts'])pins=togglePin(pins,key);
  assert.deepEqual(pins,['notes','calendar','transactions','accounts']);
  pins=togglePin(pins,'calendar');
  assert.deepEqual(pins,['notes','transactions','accounts']);
  assert.deepEqual(validPins(['notes','notes','unknown','calendar','transactions','accounts'],['notes','calendar','transactions','accounts']),['notes','calendar','transactions','accounts']);
});
test('option search matches Persian and Arabic year digits and equivalent Persian letters',()=>{
  const options=[{text:'۱۴۰۵'},{text:'۱۴۰۶'},{text:'علي',hidden:false},{text:'hidden',hidden:true}];
  assert.deepEqual(filterOptions(options,'1405').map(x=>x.text),['۱۴۰۵']);
  assert.deepEqual(filterOptions(options,'١٤٠٦').map(x=>x.text),['۱۴۰۶']);
  assert.deepEqual(filterOptions(options,'علی').map(x=>x.text),['علي']);
  assert.equal(filterOptions(options,'hidden').length,0);
});
test('local holiday coverage includes every year through 1410, with explicit future lunar estimates',()=>{
  for(let year=1405;year<=1410;year++){
    assert.ok(holidayData.years.includes(year));
    assert.ok(dayHoliday(dateInMonth(`${year}-01`,1),{holidays:true,weekend:'friday'}).events.some(e=>/نوروز/.test(e.title)));
    assert.ok(holidayData.events.filter(e=>jalaliParts(e.date).year===year).length>=24);
  }
  assert.ok(holidayData.events.some(e=>e.provisional));
  assert.ok(holidayData.events.every(e=>e.title!=='جمعه'));
  assert.deepEqual(dayHoliday('2031-03-21',{holidays:false,weekend:'saturday-sunday'}).events,[]);
});
