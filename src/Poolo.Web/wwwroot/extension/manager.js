import {PROVIDERS,BUNDLE,mergeSnapshot,scopeKey,normalizeBundle} from './shared/portfolio.js';
import {parseDelimited,suggestMapping,mapTable} from './shared/extract.js';
import {renderPortfolio,escape} from './shared/view.js';
const $=s=>document.querySelector(s),native=!!globalThis.chrome?.runtime?.id;
let snapshots=[],tables=[],capturedAt=new Date().toISOString(),filter='all',previewStore={},undo=null;
const read=async keys=>native?chrome.storage.local.get(keys):Object.fromEntries(keys.map(k=>[k,previewStore[k]]));
const write=async value=>{if(native)await chrome.storage.local.set(value);else Object.assign(previewStore,value);};
const labels={label:'نام / عنوان',key:'شناسه یکتا (اختیاری)',symbol:'نماد / ارز',quantity:'تعداد / مقدار',valueToman:'ارزش کل (نه قیمت واحد)',lockedToman:'ارزش بلوکه',amountToman:'مبلغ قسط',dueDate:'تاریخ سررسید',status:'وضعیت پرداخت'};
const errors={"Invalid text.": "نام، عنوان یا شناسه را بررسی کن.", "Invalid numeric cell.": "مقدار عددی این ردیف معتبر نیست.", "Currency label conflicts with selected unit.": "واحد انتخاب‌شده با متن مبلغ متفاوت است.", "Choose a label column.": "ستون نام یا عنوان را انتخاب کن.", "Use an explicit Persian or Gregorian date.": "تاریخ کامل شمسی یا میلادی لازم است.", "Invalid Persian date.": "تاریخ شمسی معتبر نیست.", "Invalid date.": "تاریخ معتبر نیست.", "An asset needs quantity or value.": "ستون تعداد یا ارزش دارایی لازم است.", "Duplicate row key. Choose a unique reference column.": "شناسه ردیف تکراری است؛ ستون شناسه یکتا را انتخاب کن.", "An older capture cannot replace newer data.": "اطلاعات قدیمی جایگزین اطلاعات جدیدتر نمی‌شود.", "Locked value exceeds value.": "مبلغ بلوکه از ارزش کل بیشتر است.", "Only rial or toman value columns are supported.": "ستون مبلغ باید ریالی یا تومانی باشد؛ ارزش دلاری را انتخاب نکن.", "Invalid portfolio file.": "فهرست واردشده معتبر نیست.", "Invalid decimal.": "عدد واردشده معتبر نیست.", "Table is too large.": "جدول بیش از حد بزرگ است.", "Unclosed CSV quote.": "علامت نقل‌قول CSV بسته نشده است.", "Provide a header and 1–500 data rows.": "جدول باید عنوان ستون و یک تا ۵۰۰ ردیف داشته باشد.", "This source has too many rows. Split it into named scopes.": "برای بیش از ۲۰۰ ردیف از نام فهرست‌های جدا استفاده کن."};
const human=e=>errors[e.message]||e.message||'عملیات انجام نشد.';
function error(e){$('#error').textContent=human(e);}
function render(){ $('#portfolio').innerHTML=renderPortfolio(snapshots,'fa',filter,true); }
function table(){return tables[Number($('#table-select').value)]||{headers:[],rows:[]};}
function renderMapping(){
  const category=$('#category').value,t=table(),map=suggestMapping(t.headers,category);
  $('#asset-type-field').hidden=category!=='assets';$('#status-default-field').hidden=category!=='installments';
  $('#mapping').innerHTML=Object.keys(map).map(k=>`<label>${labels[k]}<select data-map="${k}"><option value="-1">انتخاب نشده</option>${t.headers.map((h,i)=>`<option value="${i}" ${i===map[k]?'selected':''}>${escape(h)}</option>`).join('')}</select></label>`).join('');
  renderRaw();
}
function renderRaw(){ const t=table();$('#row-preview').innerHTML=t.rows.length?`<table><thead><tr><th>انتخاب</th>${t.headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r,i)=>`<tr><td><input type="checkbox" data-source-row="${i}" checked aria-label="ردیف ${i+1}"></td>${r.map(c=>`<td dir="auto">${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:''; }
function renderTables(){ $('#table-select').innerHTML=tables.map((t,i)=>`<option value="${i}">جدول ${i+1} · ${t.rows.length} ردیف</option>`).join('');$('#capture-status').textContent=tables.length?'فقط ردیف‌های بارگذاری‌شده خوانده شده‌اند.':'جدولی پیدا نشد؛ از جدول کپی‌شده یا CSV استفاده کن.';renderMapping(); }
function mapCurrent(){
  const t=table(),selected=[...document.querySelectorAll('[data-source-row]:checked')].map(c=>Number(c.dataset.sourceRow));
  if(!selected.length)throw Error('حداقل یک ردیف انتخاب کن.');
  return mapTable({...t,rows:selected.map(i=>t.rows[i])},{provider:$('#provider').value,account:$('#account').value.trim(),scope:$('#scope').value.trim(),category:$('#category').value,assetType:$('#asset-type').value,unit:$('#unit').value,defaultStatus:$('#default-status').value,coverage:$('#complete').checked?'complete':'partial',capturedAt,mapping:Object.fromEntries([...document.querySelectorAll('[data-map]')].map(s=>[s.dataset.map,Number(s.value)]))});
}
function showPreview(){const result=mapCurrent();if(result.failures.length)throw Error(result.failures.map(f=>`ردیف ${f.row}: ${human(f)}`).join(' · '));$('#review-error').textContent=`${result.items.length} ردیف معتبر. ${result.items.slice(0,3).map(i=>`${i.label}: ${i.valueToman??i.amountToman??i.quantity} ${i.valueToman!==null&&i.valueToman!==undefined||i.amountToman?'تومان':''}`).join(' · ')}`;return result.snapshot;}
async function openReview(){
  $('#review-error').textContent='';$('#complete').checked=false;
  if(native){const {capture}=await chrome.storage.session.get('capture');if(capture){tables=capture.tables||[];capturedAt=capture.capturedAt;$('#provider').value=capture.provider;$('#category').value=['digipay','snapppay'].includes(capture.provider)?'installments':'assets';$('#asset-type').value=capture.provider==='nobitex'?'crypto':'equity';$('#scope').value=$('#category').value==='assets'?'پرتفو':'اقساط';}}
  renderTables();$('#review').showModal();
}
$('#provider').innerHTML=Object.entries(PROVIDERS).map(([p,d])=>`<option value="${p}">${d.fa}</option>`).join('');
$('#review-open').onclick=()=>void openReview().catch(error);$('#close-review').onclick=()=>$('#review').close();
$('#category').onchange=renderMapping;$('#table-select').onchange=renderMapping;
$('#paste-toggle').onclick=()=>{$('#paste-area').hidden=!$('#paste-area').hidden;};
$('#parse-paste').onclick=()=>{try{tables=[parseDelimited($('#paste').value)];capturedAt=new Date().toISOString();renderTables();$('#review-error').textContent='';}catch(e){$('#review-error').textContent=human(e);}};
$('#preview-rows').onclick=()=>{try{showPreview();}catch(e){$('#review-error').textContent=human(e);}};
$('#review-form').onsubmit=async event=>{event.preventDefault();try{const next=showPreview(),key=scopeKey(next),index=snapshots.findIndex(s=>scopeKey(s)===key),merged=mergeSnapshot(index<0?null:snapshots[index],next);const updated=[...snapshots];if(index<0)updated.push(merged);else updated[index]=merged;if(updated.length>20)throw Error('حداکثر ۲۰ فهرست.');await write({snapshots:updated});snapshots=updated;$('#review').close();$('#error').textContent='';render();if(native)await chrome.storage.session.remove('capture');}catch(e){$('#review-error').textContent=human(e);}};
$('#portfolio').onclick=async event=>{const f=event.target.closest('[data-portfolio-filter]');if(f){filter=f.dataset.portfolioFilter;render();}const r=event.target.closest('[data-connected-remove]');if(r){undo=snapshots;snapshots=snapshots.filter(s=>s.captureId!==r.dataset.connectedRemove);await write({snapshots});render();$('#error').innerHTML='فهرست حذف شد. <button class="text-button" id="undo">بازگرداندن</button>';$('#undo').onclick=async()=>{snapshots=undo;await write({snapshots});render();$('#error').textContent='';};}};
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({format:BUNDLE,snapshots},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='damdast-portfolio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#connect').onclick=async()=>{
  try{if(!native)throw Error('این صفحه پیش‌نمایش است؛ اتصال فقط از افزونه نصب‌شده انجام می‌شود.');
    const u=new URL($('#target').value);if(u.pathname!=='/'||u.search||u.hash||u.username||u.password||(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))throw Error('نشانی اصلی HTTPS برنامه را بدون مسیر و پارامتر وارد کن.');
    const granted=await chrome.permissions.request({origins:[u.origin+'/*']});if(!granted)throw Error('مجوز اتصال داده نشد.');
    const response=await chrome.runtime.sendMessage({type:'configure-target',url:u.origin+'/'});if(!response.ok)throw Error(response.error);$('#connection').textContent='متصل شد. برنامه را باز کن و «دریافت از افزونه» را بزن.';
  }catch(e){error(e);}
};
$('#open-app').onclick=async()=>{const {target}=await read(['target']);if(!target){error(Error('اول نشانی برنامه را ثبت و اتصال را تأیید کن.'));return;}if(native)await chrome.tabs.create({url:target+'/#connected'});else location.href=target+'/#connected';};
$('#theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';};
async function boot(){
  const saved=await read(['snapshots','target']);snapshots=(saved.snapshots||[]).flatMap(s=>{try{return normalizeBundle(s);}catch{return [];}});$('#target').value=saved.target||'https://poolo-finance.sahar-tarkha-0855.chatgpt.site/';
  document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  if(!native)$('#preview-notice').hidden=false;render();if(location.hash==='#review')await openReview();
}
void boot().catch(error);
