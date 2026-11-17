import {t,getLanguage,localizedNumber} from './i18n.js';
const fmt=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'}),maps=new Map();
export const faMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
export const enMonths=['Farvardin','Ordibehesht','Khordad','Tir','Mordad','Shahrivar','Mehr','Aban','Azar','Dey','Bahman','Esfand'];
const dateNumber=n=>new Intl.NumberFormat(getLanguage()==='fa'?'fa-IR':'en-US',{useGrouping:false}).format(n);
const pad=n=>String(n).padStart(2,'0');
export function validIso(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function jalaliParts(iso){if(!validIso(iso))throw Error('Invalid date.');const p=Object.fromEntries(fmt.formatToParts(new Date(iso+'T12:00:00Z')).map(x=>[x.type,x.value]));return {year:+p.year,month:+p.month,day:+p.day};}
function yearMap(year){if(!Number.isInteger(year)||year<1300||year>1500)throw Error('Invalid Persian year.');if(!maps.has(year)){const map=new Map(),start=Date.UTC(year+621,2,18);for(let i=0;i<370;i++){const d=new Date(start+i*86400000),p=Object.fromEntries(fmt.formatToParts(d).map(x=>[x.type,x.value]));if(+p.year===year)map.set(`${+p.month}/${+p.day}`,d.toISOString().slice(0,10));}maps.set(year,map);}return maps.get(year);}
export function fromJalali(year,month,day){const value=yearMap(Number(year)).get(`${+month}/${+day}`);if(!value)throw Error('Invalid Persian date.');return value;}
export function monthOf(iso){const p=jalaliParts(iso);return `${p.year}-${pad(p.month)}`;}
export function validMonth(key){if(typeof key!=='string'||!/^1[34]\d{2}-(0[1-9]|1[0-2])$/.test(key))return false;try{const [y,m]=key.split('-').map(Number);fromJalali(y,m,1);return y>=1378&&y<=1479;}catch{return false;}}
export function shiftMonth(key,offset){if(!validMonth(key)||!Number.isInteger(offset))throw Error('Invalid Persian month.');const [y,m]=key.split('-').map(Number),index=y*12+m-1+offset;return `${Math.floor(index/12)}-${pad((index%12)+1)}`;}
export function daysInMonth(year,month){return [...yearMap(+year).keys()].filter(k=>k.startsWith(`${+month}/`)).length;}
export function dateInMonth(key,day){if(!validMonth(key))throw Error('Invalid Persian month.');const [y,m]=key.split('-').map(Number);return fromJalali(y,m,Math.min(Math.max(1,Number(day)),daysInMonth(y,m)));}
export const monthBounds=key=>({start:dateInMonth(key,1),end:dateInMonth(shiftMonth(key,1),1)});
export function inMonth(iso,key){if(!validIso(iso)||!validMonth(key))return false;const {start,end}=monthBounds(key);return iso>=start&&iso<end;}
export function addSolarMonths(iso,offset){return dateInMonth(shiftMonth(monthOf(iso),offset),jalaliParts(iso).day);}
export const monthLabel=key=>{if(!validMonth(key))return '';const [y,m]=key.split('-').map(Number);return `${(getLanguage()==='fa'?faMonths:enMonths)[m-1]} ${dateNumber(y)}`;};
export function solarText(iso,year=true){if(!iso)return '';const p=jalaliParts(iso);return `${localizedNumber(p.day)} ${(getLanguage()==='fa'?faMonths:enMonths)[p.month-1]}${year?' '+dateNumber(p.year):''}`;}
export function solarNumeric(iso){const p=jalaliParts(iso);return `${p.year}/${pad(p.month)}/${pad(p.day)}`;}
export function budgetBounds(data){if(data.calendar==='persian')return monthBounds(data.month);const start=data.month+'-01';if(!validIso(start))throw Error('Invalid budget month.');const date=new Date(start+'T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);return {start,end:date.toISOString().slice(0,10)};}
export function overlapsBudget(data,key){try{const a=budgetBounds(data),b=monthBounds(key);return a.start<b.end&&a.end>b.start;}catch{return false;}}
function options(list,value,blank=false){return `${blank?'<option value="">—</option>':''}${list.map(([v,label])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${label}</option>`).join('')}`;}
export function monthControl(value,name='month',report=false){const [y,m]=value.split('-').map(Number);return `<div class="solar-month" data-month-control ${report?'data-reporting="true"':''}><input type="hidden" ${report?'id="month-picker"':`name="${name}"`} value="${value}"><select data-solar-month aria-label="${t('Month')}">${options((getLanguage()==='fa'?faMonths:enMonths).map((v,i)=>[i+1,v]),m)}</select><select data-solar-year aria-label="${t('Year')}">${options(Array.from({length:102},(_,i)=>[1378+i,dateNumber(1378+i)]),y)}</select></div>`;}
export function dateControl(label,name,value='',required=false){const p=value?jalaliParts(value):{year:'',month:'',day:''};const years=Array.from({length:102},(_,i)=>[1378+i,dateNumber(1378+i)]),days=Array.from({length:p.year&&p.month?daysInMonth(p.year,p.month):31},(_,i)=>[i+1,localizedNumber(i+1)]);
 return `<fieldset class="field solar-date" data-date-control ${required?'data-required="true"':''}><legend>${t(label)}</legend><input type="hidden" name="${name}" value="${value}"><div><select data-solar-day aria-label="${t(label)} · ${t('Day')}" ${required?'required':''}>${options(days,p.day,true)}</select><select data-solar-month aria-label="${t(label)} · ${t('Month')}" ${required?'required':''}>${options((getLanguage()==='fa'?faMonths:enMonths).map((v,i)=>[i+1,v]),p.month,true)}</select><select data-solar-year aria-label="${t(label)} · ${t('Year')}" ${required?'required':''}>${options(years,p.year,true)}</select></div></fieldset>`;
}
export function updateCalendarControl(element){const root=element.closest('[data-date-control],[data-month-control]');if(!root)return null;const y=root.querySelector('[data-solar-year]'),m=root.querySelector('[data-solar-month]'),d=root.querySelector('[data-solar-day]'),input=root.querySelector('input[type=hidden]');
 if(d){const selected=d.value,max=y.value&&m.value?daysInMonth(y.value,m.value):31;d.innerHTML=options(Array.from({length:max},(_,i)=>[i+1,localizedNumber(i+1)]),selected?Math.min(+selected,max):'',true);const any=y.value||m.value||d.value,complete=y.value&&m.value&&d.value;for(const select of [y,m,d])select.setCustomValidity(any&&!complete&&!select.value?t('Choose a complete Persian date.'):'');input.value=complete?fromJalali(y.value,m.value,d.value):'';}
 else input.value=`${y.value}-${pad(m.value)}`;
 return {root,value:input.value,reporting:root.dataset.reporting==='true'};
}
