import test from 'node:test';
import assert from 'node:assert/strict';
import { fixedExpenseForm, normalizeFixedExpense } from '../src/DameDast.Web/wwwroot/fixed-expense-schedule.js';
import { normalizePaymentFilters, filterPayments, fixedExpenseEntries } from '../src/DameDast.Web/wwwroot/payment-filters.js';
import { persianCalendarCells } from '../src/DameDast.Web/wwwroot/persian-date-filter.js';
import { fromJalali, monthOf, dateInMonth } from '../src/DameDast.Web/wwwroot/calendar.js';
const row=(id,kind,data)=>({id,kind,data,version:1,deleted:false});
const bill=row('bill','monthlyExpense',{title:'Rent',amount:100,day:31,startMonth:'1403-06',endMonth:'1403-08',accountId:null});
test('fixed costs use one full due date and finite, ongoing or one-time monthly schedules',()=>{
 const form={title:'Rent',amount:100,dueDate:fromJalali(1403,6,31),recurrence:'monthly',repeatCount:'۳',accountId:''};
 const saved=normalizeFixedExpense(form);assert.equal(saved.day,31);assert.equal(saved.startMonth,'1403-06');assert.equal(saved.endMonth,'1403-08');assert.equal(saved.accountId,null);
 for(const key of ['dueDate','recurrence','repeatCount'])assert.ok(!(key in saved));
 assert.equal(normalizeFixedExpense({...form,repeatCount:''}).endMonth,null);
 assert.equal(normalizeFixedExpense({...form,recurrence:'once'}).endMonth,'1403-06');
 assert.throws(()=>normalizeFixedExpense({...form,repeatCount:'101'}));
 assert.throws(()=>normalizeFixedExpense({...form,dueDate:'bad'}));
});
test('editing legacy day-31 schedules in a short month preserves their day until a date is explicitly selected',()=>{
 const original={...bill.data,startMonth:'1403-07',endMonth:null};
 const form=fixedExpenseForm(original);assert.equal(form.dueDate,fromJalali(1403,7,30));assert.equal(form.repeatCount,'');
 assert.equal(normalizeFixedExpense(form,original).day,31);
 assert.equal(normalizeFixedExpense(form,original,true).day,30);
 const finite=fixedExpenseForm(bill.data);assert.equal(finite.repeatCount,'3');assert.equal(finite.recurrence,'monthly');
});
test('date and amount filters are inclusive and normalize Persian and Arabic amounts without losing zero',()=>{
 const rows=[{date:'2026-11-01',amount:0},{date:'2026-11-02',amount:1000},{date:'2026-11-03',amount:2000}];
 assert.deepEqual(normalizePaymentFilters({minAmount:'۱٬۰۰۰',maxAmount:'٢٬٠٠٠'}).minAmount,'1000');
 assert.equal(filterPayments(rows,{from:'2026-11-02',to:'2026-11-03',minAmount:'۱٬۰۰۰',maxAmount:'۲۰۰۰'}).length,2);
 assert.equal(filterPayments(rows,{maxAmount:'0'}).length,1);
 assert.throws(()=>normalizePaymentFilters({from:'2026-11-03',to:'2026-11-02'}));
 assert.throws(()=>normalizePaymentFilters({minAmount:'200',maxAmount:'100'}));
 assert.throws(()=>normalizePaymentFilters({minAmount:'1.5'}));
});
test('filtering multiple months projects each fixed-cost occurrence and its own payment without changing the original schedule',()=>{
 const payment=row('payment','transaction',{recurringExpenseId:'bill',recurringMonth:'1403-07',amount:90});
 const records=[bill,payment],before=structuredClone(records);
 const filters={from:fromJalali(1403,6,31),to:fromJalali(1403,8,30)};
 const entries=fixedExpenseEntries(records,'1403-09',filters);
 assert.deepEqual(entries.map(r=>r.occurrenceMonth),['1403-06','1403-07','1403-08']);
 assert.deepEqual(entries.map(r=>r.date),[fromJalali(1403,6,31),fromJalali(1403,7,30),fromJalali(1403,8,30)]);
 assert.equal(entries[1].paid,true);assert.equal(entries[1].amount,90);assert.equal(entries[2].paid,false);
 assert.equal(fixedExpenseEntries(records,'1403-09').length,0);assert.deepEqual(records,before);
});
test('Persian calendar grids start on Saturday, include leap Esfand and preserve canonical ISO days',()=>{
 const cells=persianCalendarCells('1403-12'),march=fromJalali(1403,12,30);
 assert.equal((new Date(cells[0].date+'T12:00:00Z').getUTCDay()+1)%7,0);
 assert.ok(cells.some(c=>c.date===march&&c.current));
 assert.equal(cells.filter(c=>c.current).length,30);assert.equal(persianCalendarCells('1404-12').filter(c=>c.current).length,29);
 assert.equal(monthOf(cells.find(c=>c.current).date),'1403-12');
});
