export const FORMAT = 'damdast-portfolio-v1';
export const BUNDLE = 'damdast-portfolio-bundle-v1';
export const PROVIDERS = {
  easytrader: { name: 'EasyTrader', fa: 'ایزی‌تریدر', hosts: ['easytrader.ir','easytrader.emofid.com'] },
  digipay: { name: 'Digipay', fa: 'دیجی‌پی', hosts: ['mydigipay.com'] },
  snapppay: { name: 'SnappPay', fa: 'اسنپ‌پی', hosts: ['snapppay.ir','app.snapp.taxi'] },
  agah: { name: 'Agah', fa: 'آگاه', hosts: ['agah.com'] },
  nobitex: { name: 'Nobitex', fa: 'نوبیتکس', hosts: ['nobitex.ir'] },
};
export function providerForUrl(input) {
  try { const u = new URL(input); if (u.protocol !== 'https:') return null;
    return Object.keys(PROVIDERS).find(p => PROVIDERS[p].hosts.some(h => u.hostname === h || u.hostname.endsWith('.'+h))) || null;
  } catch { return null; }
}
export const digits = value => String(value ?? '').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
export function decimal(value, nullable = false, scale = 2) {
  if ((value === null || value === '') && nullable) return null;
  if (typeof value !== 'string' || !new RegExp('^(0|[1-9]\\d{0,14})(?:\\.\\d{1,'+scale+'})?$').test(value)) throw Error('Invalid decimal.');
  return value;
}
export function cents(value) { const [a,b=''] = decimal(value).split('.'); return BigInt(a)*100n+BigInt(b.padEnd(2,'0')); }
export function fromCents(value) { return `${value/100n}.${String(value%100n).padStart(2,'0')}`; }
export function sumMoney(values) { return fromCents(values.filter(v=>v!==null).reduce((a,v)=>a+cents(v),0n)); }
function text(value, max=80) { if (typeof value !== 'string' || !value.trim() || value.length>max || /[\u0000-\u001f\u007f]/u.test(value)) throw Error('Invalid text.'); return value.trim(); }
function timestamp(value) { if (typeof value !== 'string' || !/^20\d{2}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,7})?(?:Z|\+00:00)$/.test(value) || !Number.isFinite(Date.parse(value))) throw Error('Invalid capture time.'); return new Date(value).toISOString(); }
export function validDate(value) {
  return typeof value === 'string' && /^20\d\d-\d\d-\d\d$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
export function normalizeSnapshot(input) {
  if (!input || input.format!==FORMAT || !Object.hasOwn(PROVIDERS,input.provider) || !['assets','installments'].includes(input.category) || !['partial','complete'].includes(input.coverage) || !Array.isArray(input.items) || input.items.length>200) throw Error('Invalid portfolio file.');
  const result={ format:FORMAT, captureId:text(input.captureId,64), provider:input.provider, account:text(input.account,50), scope:text(input.scope,50), category:input.category, capturedAt:timestamp(input.capturedAt), coverage:input.coverage, items:[] };
  if (Date.parse(result.capturedAt)>Date.now()+300000) throw Error('Capture time is in the future.');
  const keys=new Set();
  result.items=input.items.map(item=>{
    const key=text(item.key,120); if(keys.has(key))throw Error('Duplicate row key. Choose a unique reference column.');keys.add(key);
    const row={key,label:text(item.label),observedAt:timestamp(item.observedAt||result.capturedAt)};
    if(Date.parse(row.observedAt)>Date.parse(result.capturedAt))throw Error('Invalid observation time.');
    if(result.category==='assets') {
      if(!['cash','equity','crypto','other'].includes(item.assetType))throw Error('Invalid asset type.');
      row.assetType=item.assetType; row.symbol=item.symbol?text(item.symbol,30):'';
      row.quantity=decimal(item.quantity,true,18);row.valueToman=decimal(item.valueToman,true);row.lockedToman=decimal(item.lockedToman,true);
      if(row.valueToman!==null && row.lockedToman!==null && cents(row.lockedToman)>cents(row.valueToman))throw Error('Locked value exceeds value.');
      if(row.quantity===null && row.valueToman===null)throw Error('An asset needs quantity or value.');
    } else {
      if(!['paid','unpaid','unknown'].includes(item.status) || (item.dueDate!==null && !validDate(item.dueDate)))throw Error('Invalid installment date or status.');
      row.amountToman=decimal(item.amountToman); row.dueDate=item.dueDate;row.status=item.status;
    }
    return row;
  });
  if(new TextEncoder().encode(JSON.stringify(result)).length>120000)throw Error('Portfolio snapshot is too large.');
  return result;
}
export const scopeKey = s => JSON.stringify([s.provider,s.account,s.scope,s.category]);
export function mergeSnapshot(current, incoming) {
  const next=normalizeSnapshot(incoming);
  if(!current)return next;
  const old=normalizeSnapshot(current);
  if(scopeKey(old)!==scopeKey(next))throw Error('Mismatched source.');
  if(next.captureId===old.captureId)return old;
  if(Date.parse(next.capturedAt)<Date.parse(old.capturedAt))throw Error('An older capture cannot replace newer data.');
  if(next.coverage==='complete')return next;
  const merged=new Map(old.items.map(i=>[i.key,i]));for(const row of next.items)merged.set(row.key,row);
  if(merged.size>200)throw Error('This source has too many rows. Split it into named scopes.');
  return normalizeSnapshot({...next,items:[...merged.values()]});
}
export function normalizeBundle(input) {
  const list=input?.format===BUNDLE?input.snapshots:[input];
  if(!Array.isArray(list)||list.length<1||list.length>20)throw Error('Invalid portfolio file.');
  return list.map(normalizeSnapshot);
}
export function portfolioTotals(snapshots) {
  const assets=snapshots.filter(s=>s.category==='assets').flatMap(s=>s.items);
  const installments=snapshots.filter(s=>s.category==='installments').flatMap(s=>s.items);
  return {assets:sumMoney(assets.map(a=>a.valueToman)),locked:sumMoney(assets.map(a=>a.lockedToman)),debt:sumMoney(installments.filter(i=>i.status==='unpaid').map(i=>i.amountToman)),unpriced:assets.filter(a=>a.valueToman===null).length,unknownDebt:installments.filter(i=>i.status==='unknown').length,positions:assets.filter(a=>a.assetType==='equity'||a.assetType==='crypto').length};
}
