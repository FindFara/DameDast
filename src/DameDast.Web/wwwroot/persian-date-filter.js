import { jalaliParts, fromJalali, monthOf, monthLabel, dateInMonth, daysInMonth, shiftMonth, validMonth, solarText, faMonths, enMonths } from './calendar.js';
import { today, escapeHtml as esc } from './finance.js';
import { t, getLanguage, localizedNumber } from './i18n.js';
export function calendarFilterField(label,name,value='') {
  return `<div class="field range-date-field" data-range-date><label>${t(label)}</label><input type="hidden" name="${name}" value="${esc(value)}"><button type="button" data-range-date-trigger aria-label="${t(label)}" aria-haspopup="dialog" aria-expanded="false"><span>${value?solarText(value):t('Select Persian date')}</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg></button></div>`;
}
const addDays=(iso,days)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function persianCalendarCells(month) {
  const first=dateInMonth(month,1), offset=(new Date(first+'T12:00:00Z').getUTCDay()+1)%7;
  const [year,number]=month.split('-').map(Number), count=Math.ceil((offset+daysInMonth(year,number))/7)*7;
  return Array.from({length:count},(_,i)=>{const date=addDays(first,i-offset),parts=jalaliParts(date);return {date,day:parts.day,current:monthOf(date)===month,enabled:parts.year>=1378&&parts.year<=1479};});
}
export function installCalendarFilters() {
  const popup=document.createElement('div');popup.id='payment-date-calendar';popup.className='payment-date-calendar';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-label',t('Select Persian date'));document.body.append(popup);
  let active=null, month='';
  const close=(restore=false)=>{const trigger=active?.querySelector('[data-range-date-trigger]');trigger?.setAttribute('aria-expanded','false');popup.hidden=true;active=null;if(restore&&trigger?.isConnected)trigger.focus({preventScroll:true});};
  const position=()=>{
    if(!active?.isConnected){close();return;}
    const box=active.querySelector('button').getBoundingClientRect(), width=Math.min(320,innerWidth-24);popup.style.width=width+'px';
    const left=getLanguage()==='fa'?box.right-width:box.left;
    popup.style.left=Math.max(12,Math.min(left,innerWidth-width-12))+'px';
    const height=popup.offsetHeight;
    popup.style.top=(box.bottom+8+height<=innerHeight-12?box.bottom+8:Math.max(12,box.top-height-8))+'px';
  };
  const render=()=>{
    const selected=active.querySelector('input').value,[year,number]=month.split('-').map(Number), names=getLanguage()==='fa'?faMonths:enMonths;
    popup.dir=getLanguage()==='fa'?'rtl':'ltr';
    popup.innerHTML=`<header><button type="button" data-range-month-step="-1" aria-label="${t('Previous month')}" ${month==='1378-01'?'disabled':''}>${getLanguage()==='fa'?'›':'‹'}</button><div class="range-month-caption"><select data-native-select data-range-month aria-label="${t('Month')}">${names.map((name,i)=>`<option value="${i+1}" ${number===i+1?'selected':''}>${name}</option>`).join('')}</select><select data-native-select data-range-year aria-label="${t('Year')}">${Array.from({length:102},(_,i)=>1378+i).map(y=>`<option value="${y}" ${y===year?'selected':''}>${localizedNumber(y).replace(/[,٬]/g,'')}</option>`).join('')}</select></div><button type="button" data-range-month-step="1" aria-label="${t('Next month')}" ${month==='1479-12'?'disabled':''}>${getLanguage()==='fa'?'‹':'›'}</button></header><div class="range-weekdays" aria-hidden="true">${(getLanguage()==='fa'?['ش','ی','د','س','چ','پ','ج']:['Sa','Su','Mo','Tu','We','Th','Fr']).map(day=>`<span>${day}</span>`).join('')}</div><div class="range-calendar-grid" role="group" aria-label="${monthLabel(month)}">${persianCalendarCells(month).map(cell=>`<button type="button" data-range-day="${cell.date}" aria-label="${solarText(cell.date)}" aria-pressed="${selected===cell.date}" ${cell.date===today()?'aria-current="date"':''} class="${cell.current?'':'adjacent'}" ${cell.enabled?'':'disabled'}>${localizedNumber(cell.day)}</button>`).join('')}</div><footer><button type="button" data-range-today>${t('Today')}</button><button type="button" data-range-clear>${t('Clear')}</button><button type="button" data-range-close>${t('Close')}</button></footer>`;
    position();
  };
  const open=root=>{
    if(active===root){close();return;}
    close();active=root;month=monthOf(root.querySelector('input').value||today());popup.hidden=false;root.querySelector('button').setAttribute('aria-expanded','true');render();
    (popup.querySelector('[aria-pressed="true"]')||popup.querySelector(`[data-range-day="${today()}"]`)||popup.querySelector('[data-range-day]:not(.adjacent)'))?.focus({preventScroll:true});
  };
  const choose=value=>{const root=active,input=root.querySelector('input');input.value=value;root.querySelector('button span').textContent=value?solarText(value):t('Select Persian date');close(true);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-range-date-trigger]');if(trigger){open(trigger.closest('[data-range-date]'));return;}
    if(!active)return;
    if(!popup.contains(event.target)){close();return;}
    const day=event.target.closest('[data-range-day]');if(day&&!day.disabled){choose(day.dataset.rangeDay);return;}
    const step=event.target.closest('[data-range-month-step]');if(step&&!step.disabled){month=shiftMonth(month,Number(step.dataset.rangeMonthStep));render();return;}
    if(event.target.closest('[data-range-today]'))choose(today());
    else if(event.target.closest('[data-range-clear]'))choose('');
    else if(event.target.closest('[data-range-close]'))close(true);
  });
  popup.addEventListener('change',event=>{const focus=event.target.hasAttribute('data-range-year')?'data-range-year':'data-range-month';month=`${popup.querySelector('[data-range-year]').value}-${popup.querySelector('[data-range-month]').value.padStart(2,'0')}`;render();popup.querySelector(`[${focus}]`).focus();});
  document.addEventListener('keydown',event=>{
    if(event.target.matches('[data-range-date-trigger]')&&event.key==='ArrowDown'){event.preventDefault();open(event.target.closest('[data-range-date]'));return;}
    if(!active)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);return;}
    const day=event.target.closest('[data-range-day]');if(!day)return;
    const rtl=getLanguage()==='fa', offset=({ArrowLeft:rtl?1:-1,ArrowRight:rtl?-1:1,ArrowUp:-7,ArrowDown:7})[event.key];
    if(offset){event.preventDefault();const next=addDays(day.dataset.rangeDay,offset);if(!validMonth(monthOf(next)))return;month=monthOf(next);render();popup.querySelector(`[data-range-day="${next}"]`)?.focus();}
  });
  document.addEventListener('focusin',event=>{if(active&&!popup.contains(event.target)&&!active.contains(event.target))close();});
  window.addEventListener('hashchange',()=>close());window.addEventListener('resize',()=>{if(active)position();});
  document.addEventListener('scroll',()=>{if(active)position();},true);
  new MutationObserver(()=>{if(active&&!active.isConnected)close();}).observe(document.body,{childList:true,subtree:true});
}
if(typeof document!=='undefined')installCalendarFilters();
