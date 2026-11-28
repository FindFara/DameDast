import { validIso, monthOf, dateInMonth, shiftMonth, validMonth } from './calendar.js';
export const emptyPaymentFilters = () => ({from:'',to:'',minAmount:'',maxAmount:''});
const plain=value=>String(value ?? '').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[,٬\s]/g,'');
export function normalizePaymentFilters(input = {}) {
  const result={...emptyPaymentFilters(),...input};
  for(const key of ['from','to']) if(result[key]&&(!validIso(result[key])||!validMonth(monthOf(result[key]))))throw Error('Enter a valid date.');
  if(result.from&&result.to&&result.from>result.to)throw Error('The start date must be before the end date.');
  for(const key of ['minAmount','maxAmount']) {
    const value=plain(result[key]);
    if(value===''){result[key]='';continue;}
    if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>1e12)throw Error('Enter a valid amount.');
    result[key]=String(Number(value));
  }
  if(result.minAmount!==''&&result.maxAmount!==''&&Number(result.minAmount)>Number(result.maxAmount))throw Error('The minimum amount must not exceed the maximum.');
  return result;
}
export function filterPayments(entries,input = {}) {
  const f=normalizePaymentFilters(input);
  return entries.filter(r=>(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(f.minAmount===''||r.amount>=Number(f.minAmount))&&(f.maxAmount===''||r.amount<=Number(f.maxAmount)));
}
export function fixedExpenseEntries(records,month,filters = {}) {
  const f=normalizePaymentFilters(filters), first=f.from?monthOf(f.from):f.to&&monthOf(f.to)<month?monthOf(f.to):month,
    last=f.to?monthOf(f.to):f.from&&monthOf(f.from)>month?monthOf(f.from):month;
  const payments=new Map();
  for(const r of records)if(!r.deleted&&r.kind==='transaction'&&r.data.recurringExpenseId)payments.set(`${r.data.recurringExpenseId}:${r.data.recurringMonth}`,r);
  const rows=[];
  for(const r of records.filter(r=>r.kind==='monthlyExpense'&&!r.deleted)) {
    const start=r.data.startMonth>first?r.data.startMonth:first, end=r.data.endMonth&&r.data.endMonth<last?r.data.endMonth:last;
    for(let key=start;key<=end;key=shiftMonth(key,1)) {
      const payment=payments.get(`${r.id}:${key}`);
      rows.push({...r,date:dateInMonth(key,r.data.day),dueDate:dateInMonth(key,r.data.day),occurrenceMonth:key,payment,paid:!!payment,amount:payment?.data.amount ?? r.data.amount});
    }
  }
  return rows;
}
