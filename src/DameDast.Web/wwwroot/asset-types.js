import { today } from './finance.js';
import { decimalText } from './assets.js';
export const assetKinds = ['assetPosition','receivable','locked'];
export function preserveAssetTypes(current, kind, data) {
  if (!assetKinds.includes(kind)) return data;
  const archive = structuredClone(current?.data.assetTypeData || data.assetTypeData || {});
  if (current && current.kind !== kind) {
    const previous = structuredClone(current.data); delete previous.assetTypeData;
    archive[current.kind] = previous;
  }
  return Object.keys(archive).length ? {...data,assetTypeData:archive} : data;
}
export function assetTypePreset(current, kind, value = null) {
  const d = current.data, saved = d.assetTypeData?.[kind];
  const amount = value ?? (current.kind==='receivable' ? d.amount-d.returned : current.kind==='locked' ? d.amount : d.valuations?.at(-1)?.valueToman ?? '');
  const name = d.name || d.person || '';
  if (saved) return structuredClone(saved);
  if (kind==='receivable') return {person:name,amount:String(amount),returned:0,lentOn:today(),dueDate:d.releaseDate || '',note:d.note || ''};
  if (kind==='locked') return {name,amount:String(amount),releaseDate:d.dueDate || '',note:d.note || ''};
  return {name,sourceKey:null,marketSymbol:null,quantity:'1',lots:[{id:crypto.randomUUID(),quantity:'1',costToman:null,boughtOn:today()}],valuations:amount===''?[]:[{date:today(),valueToman:String(amount)}]};
}
// Cost-basis records linked to a tracked locked asset are details of that asset, not another asset.
export function separateAssetEntries(entries, records) {
  return entries.filter(entry => {
    const source = entry.position.sourceKey || entry.source?.key;
    try { const key=JSON.parse(source); return key[0]!=='locked' || !records.some(r=>!r.deleted && r.id===key[1]); }
    catch { return true; }
  });
}
export const assetValueText = entry => entry?.valueCents == null ? null : decimalText(entry.valueCents,2);
