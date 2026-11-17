import test from 'node:test';
import assert from 'node:assert/strict';
import {groupTransactions} from '../src/DameDast.Web/wwwroot/transaction-board.js';
import {togglePin,validPins} from '../src/DameDast.Web/wwwroot/nav-pins.js';
import {filterOptions} from '../src/DameDast.Web/wwwroot/select-sheet.js';
import {holidayData,dayHoliday} from '../src/DameDast.Web/wwwroot/holidays.js';
import {dateInMonth,jalaliParts} from '../src/DameDast.Web/wwwroot/calendar.js';

test('seven categories yield seven columns and each transaction appears exactly once',()=>{
  const records=Array.from({length:21},(_,i)=>({id:String(i),data:{category:'category-'+(i%7),amount:i+1}}));
  const groups=groupTransactions(records,Array.from({length:7},(_,i)=>'category-'+i));
  assert.equal(groups.length,7);
  assert.deepEqual(groups.flatMap(x=>x.records).map(x=>x.id).sort(),records.map(x=>x.id).sort());
  assert.equal(groups.reduce((sum,g)=>sum+g.records.reduce((n,r)=>n+r.data.amount,0),0),231);
  assert.equal(groupTransactions(records.filter(x=>x.data.category==='category-2')).length,1);
});
test('pins keep their order, reject a fourth pin and allow replacing one after unpinning',()=>{
  let pins=[];
  for(const key of ['notes','calendar','transactions'])pins=togglePin(pins,key);
  assert.throws(()=>togglePin(pins,'accounts'),/3/);
  assert.deepEqual(pins,['notes','calendar','transactions']);
  pins=togglePin(pins,'calendar');pins=togglePin(pins,'accounts');
  assert.deepEqual(pins,['notes','transactions','accounts']);
  assert.deepEqual(validPins(['notes','notes','unknown','calendar','transactions','accounts'],['notes','calendar','transactions','accounts']),['notes','calendar','transactions']);
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
