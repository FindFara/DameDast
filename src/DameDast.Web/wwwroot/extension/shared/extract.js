import { digits, normalizeSnapshot, FORMAT } from './portfolio.js';
// Runs only after the extension action is invoked. Never reads inputs, storage, cookies or network traffic.
export function captureVisibleTables() {
  const visible=el=>!!el.getClientRects().length && getComputedStyle(el).visibility!=='hidden' && !el.closest('[aria-hidden="true"]');
  const clean=el=>el.innerText.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,300);
  const tables=[];let remaining=250000;
  for(const root of document.querySelectorAll('table,[role="grid"],[role="table"],.ag-root,.dx-datagrid')) {
    if(!visible(root)||root.parentElement?.closest('table,[role="grid"],[role="table"],.ag-root,.dx-datagrid'))continue;
    const headers=[...root.querySelectorAll('thead th,[role="columnheader"],.ag-header-cell-text,.dx-header-row td')].filter(visible).map(clean);
    let rows=[...root.querySelectorAll('tbody tr,[role="row"],.ag-row')].filter(visible).map(r=>[...r.querySelectorAll('td,[role="cell"],[role="gridcell"],.ag-cell')].filter(visible).map(clean)).filter(r=>r.length && r.some(Boolean));
    if(!headers.length){const tr=root.querySelector('tr');if(tr){headers.push(...[...tr.querySelectorAll('th,td')].filter(visible).map(clean));if(rows.length&&JSON.stringify(rows[0])===JSON.stringify(headers))rows.shift();}}
    rows=rows.slice(0,500);if(!headers.length||!rows.length||!/(تعداد|ارزش|مبلغ|موجودی|مانده|سررسید|quantity|balance|amount|value|due)/i.test(headers.join(' ')))continue;
    const encoded=JSON.stringify({headers,rows}).length;if(encoded>remaining)continue;remaining-=encoded;
    const width=Math.max(headers.length,...rows.map(r=>r.length));if(width>40)continue;
    while(headers.length<width)headers.push('Column '+(headers.length+1));
    tables.push({headers,rows});if(tables.length>=12)break;
  }
  return {host:location.hostname,capturedAt:new Date().toISOString(),tables};
}
export function parseDelimited(input,maxRows=500) {
  if(typeof input!=='string'||input.length>250000)throw Error('Table is too large.');
  const delimiter=input.includes('\t')?'\t':',',rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++) {const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===delimiter&&!quoted){row.push(cell.trim());cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length<2||rows.length>maxRows+1||rows.some(r=>r.length>40))throw Error('Provide a header and 1–500 data rows.');
  return {headers:rows[0],rows:rows.slice(1)};
}
export function parseNumber(raw,scale=2) {
  const value=digits(raw).replace(/[٬,\s\u200c\u200e\u200f]/g,'').replace(/٫/g,'.').replace(/(?:تومان|ریال|تومن|IRR|IRT|TMN|تعداد|سهم)/gi,'');
  if(!new RegExp('^\\+?\\d{1,15}(?:\\.\\d{1,'+scale+'})?$').test(value))throw Error('Invalid numeric cell.');
  const [whole,part='']=value.replace(/^\+/,'').split('.');return (whole.replace(/^0+(?=\d)/,'')||'0')+(part?'.'+part:'');
}
export function parseMoney(raw,unit) {
  const s=String(raw);const hasRial=/ریال|\bIRR\b/i.test(s),hasToman=/تومان|تومن|\bIRT\b|\bTMN\b/i.test(s);
  if((hasRial&&unit!=='rial')||(hasToman&&unit!=='toman'))throw Error('Currency label conflicts with selected unit.');
  const n=parseNumber(raw,unit==='rial'?1:2);if(unit==='toman')return n;
  const [a,b='']=n.split('.'),hundredth=BigInt(a)*10n+BigInt(b.padEnd(1,'0'));
  return `${hundredth/100n}.${String(hundredth%100n).padStart(2,'0')}`;
}
const persianMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const jalaliCache=new Map();
function jalaliDate(y,m,d) {
  if(!jalaliCache.has(y)) {
    const map=new Map(),fmt=new Intl.DateTimeFormat('en-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
    const start=Date.UTC(y+621,2,18);for(let i=0;i<370;i++){const dt=new Date(start+i*86400000),p=Object.fromEntries(fmt.formatToParts(dt).map(p=>[p.type,p.value]));map.set(`${+p.year}/${+p.month}/${+p.day}`,dt.toISOString().slice(0,10));}jalaliCache.set(y,map);
  }
  return jalaliCache.get(y).get(`${y}/${m}/${d}`)||null;
}
export function parseDate(raw) {
  let s=digits(raw).trim(),match=s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:\s.*)?$/);
  if(!match){const month=persianMonths.findIndex(m=>s.includes(m));const numbers=s.match(/\d+/g);if(month>=0&&numbers?.length===2)match=[s,numbers[1],String(month+1),numbers[0]];}
  if(!match)throw Error('Use an explicit Persian or Gregorian date.');
  const [y,m,d]=match.slice(1).map(Number);if(y>=1300&&y<1500){const iso=jalaliDate(y,m,d);if(!iso)throw Error('Invalid Persian date.');return iso;}
  const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  if(y<2000||y>2099||!Number.isFinite(Date.parse(iso+'T12:00:00Z'))||new Date(iso+'T12:00:00Z').toISOString().slice(0,10)!==iso)throw Error('Invalid date.');return iso;
}
export function parseStatus(raw) {
  const s=String(raw).trim().toLowerCase().replace(/\u200c/g,' ');
  if(/پرداخت نشده|پرداخت\s*نشده|تسویه نشده|سررسید|معوق|بدهکار|unpaid|overdue|pending/.test(s))return 'unpaid';
  if(/پرداخت شده|پرداخت\s*شده|تسویه شده|^paid$|settled/.test(s))return 'paid';
  return 'unknown';
}
const normalized=s=>digits(s).toLowerCase().replace(/[\s\u200c\u200f\u200e\(\)\[\]\-_/]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک');
export function suggestMapping(headers,category) {
  const patterns=category==='installments'?{label:['عنوان','نامفروشگاه','شرح','title','description','merchant'],key:['شناسهقسط','کدقسط','شمارهقسط','reference','installmentid'],amountToman:['مبلغقسط','مبلغبدهی','مبلغ','amount','debt'],dueDate:['سررسید','تاریخسررسید','duedate'],status:['وضعیت','status']}
    :{label:['نامدارایی','نامنماد','نماد','رمزارز','ارز','asset','symbol','currency'],symbol:['نماد','symbol','currency','رمزارز'],key:['شناسه','id'],quantity:['تعداد','تعدادسپرده','تعدادسهام','ماندهتعداد','quantity','amount','balance','موجودی'],valueToman:['ارزشروز','ارزشداریی','ارزشدارایی','ارزشپرتفو','ارزش','معادلریالی','rialbalance','value'],lockedToman:['ارزشبلوکه','مبلغبلوکه','lockedvalue']};
  return Object.fromEntries(Object.entries(patterns).map(([key,list])=>[key,headers.findIndex(h=>list.some(p=>normalized(h)===normalized(p)))]));
}
export function mapTable(table,options) {
  const {mapping,category}=options;const failures=[],items=[];
  for(const key of category==='assets'?['valueToman','lockedToman']:['amountToman'])if(mapping[key]>=0 && /دلار|تتر|یورو|\b(?:USD|USDT|EUR|BTC)\b/i.test(table.headers[mapping[key]]))throw Error('Only rial or toman value columns are supported.');
  for(let index=0;index<table.rows.length;index++) {
    const cells=table.rows[index];const cell=k=>mapping[k]>=0?String(cells[mapping[k]]??'').trim():'';
    try {
      const label=cell('label');if(!label)throw Error('Choose a label column.');
      const row={label,key:cell('key')||''};
      if(category==='assets') {
        row.assetType=options.assetType;row.symbol=cell('symbol');
        row.quantity=cell('quantity')?parseNumber(cell('quantity'),18):null;
        row.valueToman=cell('valueToman')?parseMoney(cell('valueToman'),options.unit):null;
        row.lockedToman=cell('lockedToman')?parseMoney(cell('lockedToman'),options.unit):null;
        row.key ||= row.symbol||row.label;
      } else {
        row.amountToman=parseMoney(cell('amountToman'),options.unit);
        row.dueDate=cell('dueDate')?parseDate(cell('dueDate')):null;
        row.status=mapping.status>=0?parseStatus(cell('status')):options.defaultStatus;
        row.key ||= `${row.label}|${row.dueDate||'unknown'}`;
      }
      items.push(row);
    }catch(error){failures.push({row:index+1,message:error.message});}
  }
  // Never silently skip failed rows or silently aggregate ambiguous installments.
  if(failures.length)return {items,failures};
  const snapshot=normalizeSnapshot({format:FORMAT,captureId:options.captureId||crypto.randomUUID(),provider:options.provider,account:options.account,scope:options.scope,category,capturedAt:options.capturedAt||new Date().toISOString(),coverage:options.coverage||'partial',items});
  return {snapshot,items,failures};
}
