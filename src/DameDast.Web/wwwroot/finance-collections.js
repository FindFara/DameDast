import { assetEntries } from './assets.js';
import { separateAssetEntries } from './asset-types.js';
import { t } from './i18n.js';
import { escapeHtml as esc, dueDays } from './finance.js';
import { inMonth, solarText } from './calendar.js';
import { recurringForMonth } from './planning.js';

export const financeGroups = {
  installments: [['installment', 'Installment'], ['monthlyExpense', 'Monthly expense']],
  assets: [['assetPosition', 'Asset'], ['receivable', 'Money lent'], ['locked', 'Locked asset']],
};
export const financeGroup = kind => Object.keys(financeGroups).find(group => financeGroups[group].some(([value]) => value === kind));
export function financeTypeField(kind, editing = false, sourceKey = null) {
  const group = financeGroup(kind);
  try { if (kind === "assetPosition" && JSON.parse(sourceKey)?.[0] === "locked") return ""; } catch {}
  return group ? `<label class="field">${t('Type')}<select data-finance-kind ${editing && group !== 'assets' ? 'disabled' : ''}>${financeGroups[group].map(([value, label]) => `<option value="${value}" ${value === kind ? 'selected' : ''}>${t(label)}</option>`).join('')}</select></label>` : '';
}
export function paymentEntries(records, month) {
  return [
    ...records.filter(r => !r.deleted && r.kind === 'installment').map(r => ({...r, date:r.data.dueDate, paid:r.data.paid, amount:r.data.amount})),
    ...recurringForMonth(records, month).map(r => ({...r, date:r.dueDate, paid:!!r.payment, amount:r.payment?.data.amount ?? r.data.amount})),
  ].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function receivableEntries(records) {
  return records.filter(r => !r.deleted && ['receivable','locked'].includes(r.kind)).map(r => ({...r,
    date:r.kind === 'locked' ? r.data.releaseDate : r.data.dueDate,
    amount:r.kind === 'locked' ? r.data.amount : r.data.amount-r.data.returned,
  })).sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999') || a.id.localeCompare(b.id));
}
const typeLabel = kind => financeGroups[financeGroup(kind)].find(([value]) => value === kind)[1];
const typeBadge = kind => `<span class="badge finance-type">${t(typeLabel(kind))}</span>`;
const title = (c, value) => esc(c.space === 'demo' ? t(value) : value);
const typeFilter = (group, value) => `<div class="toolbar"><label class="field finance-type-filter">${t('Type')}<select data-finance-filter><option value="all" ${value === 'all' ? 'selected' : ''}>${t('All types')}</option>${financeGroups[group].map(([kind,label]) => `<option value="${kind}" ${value === kind ? 'selected' : ''}>${t(label)}</option>`).join('')}</select></label></div>`;
const selected = (c, entries) => c.financeType && c.financeType !== 'all' ? entries.filter(r => r.kind === c.financeType) : entries;
const defaultKind = (c, group) => financeGroups[group].some(([kind]) => kind === c.financeType) ? c.financeType : financeGroups[group][0][0];
const sum = entries => entries.reduce((total,r) => total+r.amount,0);
const empty = () => `<div class="panel empty"><p>${t('No items for this type.')}</p></div>`;

export function paymentsPage(c, ui) {
  const {pageHeading, amountCard, icon, number, unit, actionButton:button} = ui;
  const entries = selected(c, paymentEntries(c.records,c.month)), unpaid = entries.filter(r => !r.paid);
  const heading = pageHeading(c,'Installments and fixed expenses',defaultKind(c,'installments'),c.financeType && c.financeType !== 'all' ? null : 'New payment');
  const stats = c.financeType === 'monthlyExpense'
    ? `<div class="stats-grid">${amountCard('Expected this month',entries.reduce((s,r)=>s+r.data.amount,0),'featured')}${amountCard('Recorded payments',sum(entries.filter(r=>r.paid)))}${amountCard('Still to pay',sum(unpaid))}</div>`
    : `<div class="stats-grid">${amountCard('Total remaining',sum(unpaid),'featured')}${amountCard('Due this month',sum(unpaid.filter(r => inMonth(r.date,c.month))))}${amountCard('Overdue',sum(unpaid.filter(r => dueDays(r.date)<0)))}</div>`;
  const rows = entries.map(r => {
    const payment = r.kind === 'installment' ? button('paid',r.paid?'Mark unpaid':'Mark paid',`data-id="${r.id}"`,'small-button')
      : r.paid ? button('edit','View payment',`data-id="${r.payment.id}"`,'small-button') : button('recurring-pay','Record payment',`data-id="${r.id}"`,'small-button');
    return `<article class="installment-row ${r.paid?'paid':''}" data-finance-record="${r.id}" data-finance-type="${r.kind}"><span class="category-icon">${icon(r.kind === 'installment'?'installments':'monthlyExpenses')}</span><div class="installment-description">${typeBadge(r.kind)}<strong dir="auto">${title(c,r.data.title)}</strong><small>${solarText(r.date)} · <span class="${!r.paid && dueDays(r.date)<0?'negative':''}">${r.paid?t('Paid'):dueDays(r.date)<0?t('Overdue'):t('Unpaid')}</span></small></div><div class="movement-amount">${number(r.amount)}${unit()}</div><div class="row-actions">${payment}<button type="button" class="icon-button" data-action="edit" data-id="${r.id}" aria-label="${t('Edit')}">${icon('edit')}</button><button type="button" class="icon-button" data-action="delete" data-id="${r.id}" aria-label="${t('Delete')}">${icon('trash')}</button></div></article>`;
  }).join('');
  return heading + typeFilter('installments',c.financeType || 'all') + stats + `<div class="toolbar">${button('push','Enable reminders','','secondary')}</div>` + (rows ? `<section class="panel installment-list">${rows}</section>` : empty()) + `<p class="small-note">${t('Fixed expenses are shown for the selected month. Installments include all scheduled dates.')}</p><p class="small-note">${t('Recording a payment creates an expense in the selected account. Reversing it removes that expense.')}</p>`;
}
export function assetsCollectionPage(c, ui) {
  const {pageHeading, amountCard, icon, number, unit, actionButton:button} = ui;
  const positions = separateAssetEntries(assetEntries(c.records,c.connectedSnapshots,c.marketData,c.now),c.records);
  const tracked = receivableEntries(c.records);
  const entries = selected(c,tracked);
  const visiblePositions = !c.financeType || ['all','assetPosition'].includes(c.financeType) ? positions : [];
  const known = visiblePositions.filter(a=>a.valueCents!==null).reduce((sum,a)=>sum+a.valueCents,0n);
  const trackedValue = entries.reduce((sum,r)=>sum+BigInt(r.amount)*100n,0n);
  const stats = `<div class="stats-grid">${amountCard('Known asset value',Number(known+trackedValue)/100,'featured')}${amountCard('Money lent',sum(entries.filter(r=>r.kind==='receivable')))}${amountCard('Total locked',sum(entries.filter(r=>r.kind==='locked')))}</div>`;
  const assetCards = visiblePositions.map(a => `<article class="panel" data-finance-type="assetPosition" data-asset-key="${esc(a.key)}"><div class="card-heading">${typeBadge('assetPosition')}<small>${esc(t(a.source?.source || 'Personal asset'))}</small></div><h2 dir="auto">${title(c,a.name)}</h2><div class="amount">${a.valueCents===null?'—':number(Number(a.valueCents)/100,2)}${unit()}</div><div class="card-foot"><button type="button" class="text-button" data-action="asset-edit" data-key="${esc(a.key)}">${t('Edit')}</button><button type="button" class="text-button" data-action="asset-select" data-key="${esc(a.key)}">${t('Performance')}</button>${a.record?button('delete','Delete',`data-id="${a.record.id}"`,'text-button'):''}</div></article>`).join('');
  const cards = entries.map(r => `<article class="panel" data-finance-record="${r.id}" data-finance-type="${r.kind}"><div class="card-heading">${typeBadge(r.kind)}<button type="button" class="icon-button" data-action="edit" data-id="${r.id}" aria-label="${t('Edit')}">${icon('edit')}</button></div><h2 dir="auto">${title(c,r.data.person || r.data.name)}</h2><div class="amount">${number(r.amount)}${unit()}</div>${r.kind==='receivable'?`<div class="progress-track"><div class="progress-fill" style="width:${r.data.returned/r.data.amount*100}%"></div></div><div class="progress-detail"><span>${t('Returned')} ${number(r.data.returned)}</span><span>${number(r.data.amount)}</span></div>`:''}<div class="card-foot"><span>${r.kind==='receivable' && !r.amount?t('Settled'):r.date?solarText(r.date):t(r.kind==='locked'?'No release date':'No due date')}</span>${r.kind==='locked'?button('release','Mark released',`data-id="${r.id}"`,'text-button'):button('edit','Record repayment',`data-id="${r.id}"`,'text-button')}<button type="button" class="icon-button" data-action="delete" data-id="${r.id}" aria-label="${t('Delete')}">${icon('trash')}</button></div></article>`).join('');
  return pageHeading(c,'Assets',defaultKind(c,'assets')) + assetViews(c.assetView) + typeFilter('assets',c.financeType || 'all') + stats + (assetCards || cards?`<div class="cards-grid">${assetCards}${cards}</div>`:empty()) + `<p class="small-note">${t('Trackers do not change account balances.')}</p>`;
}
export const assetViews = (view = 'all') => `<div class="segment-control asset-collection-views">${[['all','All assets'],['performance','Performance'],['import','Import and sync']].map(([key,label])=>`<button type="button" data-assets-view="${key}" aria-pressed="${key===view}" class="${key===view?'active':''}">${t(label)}</button>`).join('')}</div>`;
