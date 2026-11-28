import { dateInMonth, monthOf, jalaliParts, validIso, shiftMonth, validMonth } from './calendar.js';
import { today } from './finance.js';
const monthIndex = month => { const [y,m]=month.split('-').map(Number);return y*12+m-1; };
export function fixedExpenseForm(data = {}, month = monthOf(today())) {
  if ('recurrence' in data) return {...data};
  const start=data.startMonth || month, end=data.endMonth;
  return {...data,dueDate:data.startMonth?dateInMonth(start,data.day || 1):dateInMonth(start,jalaliParts(today()).day),recurrence:end===start?'once':'monthly',repeatCount:end?String(monthIndex(end)-monthIndex(start)+1):''};
}
export function normalizeFixedExpense(data, original = null, dateTouched = false) {
  if (!validIso(data.dueDate)) throw Error('Enter a valid date.');
  const startMonth=monthOf(data.dueDate);
  if (!validMonth(startMonth) || !['once','monthly'].includes(data.recurrence)) throw Error('Invalid recurring expense schedule.');
  let day=jalaliParts(data.dueDate).day;
  // Editing an existing day-31 schedule in a short start month must not silently change its recurring day.
  if (original && !dateTouched && data.dueDate===dateInMonth(original.startMonth,original.day)) day=original.day;
  const raw=String(data.repeatCount ?? '').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).trim();
  let endMonth=null;
  if (data.recurrence==='once') endMonth=startMonth;
  else if (raw) {
    const count=Number(raw);
    const previousCount=original?.endMonth?monthIndex(original.endMonth)-monthIndex(original.startMonth)+1:null;
    if (!Number.isInteger(count) || count<1 || (count>100 && count!==previousCount)) throw Error('Choose 1 to 100 payments.');
    endMonth=shiftMonth(startMonth,count-1);
    if (!validMonth(endMonth)) throw Error('Invalid recurring expense schedule.');
  }
  const result={...data,day,startMonth,endMonth,accountId:data.accountId || null};
  for (const key of ['dueDate','recurrence','repeatCount','hasEnd']) delete result[key];
  return result;
}
