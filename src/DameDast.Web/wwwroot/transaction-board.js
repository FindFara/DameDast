import { money, dateText, escapeHtml as esc } from "./finance.js";
import { t, localizedNumber } from "./i18n.js";

export function groupTransactions(records, categoryOrder = []) {
  const groups = new Map();
  for (const record of records) {
    const key = record.data.category || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const order = [...new Set([...categoryOrder, ...groups.keys()])];
  return order.filter(key => groups.has(key)).map(category => ({category, records:groups.get(category)}));
}
export function transactionBoard(c, records, {icon, categoryTitle, accountName, dataText, categoryOrder}) {
  const groups = groupTransactions(records, categoryOrder);
  return `<div class="transaction-board" style="--transaction-columns:${groups.length}" role="region" aria-label="${t("Transactions by category")}" tabindex="0">${groups.map(group => {
    const totals = ["income", "expense", "transfer"].map(type => ({type, sum:group.records.filter(r=>r.data.type===type).reduce((sum,r)=>sum+r.data.amount,0)})).filter(x=>x.sum);
    return `<section class="transaction-column"><header><div><h2>${esc(categoryTitle(c,group.category))}</h2><span class="badge">${localizedNumber(group.records.length)}</span></div><div class="transaction-column-totals">${totals.map(x=>`<span>${t({income:"Income",expense:"Spending",transfer:"Transfer"}[x.type])}<bdi dir="ltr">${money(x.sum)}</bdi> ${t("toman")}</span>`).join("")}</div></header><div class="transaction-column-cards">${group.records.map(record=>{
      const d=record.data;
      return `<article class="transaction-card"><div class="transaction-card-meta"><span class="transaction-type ${d.type}">${icon(d.type === "transfer" ? "transactions" : d.type)}${t({income:"Income",expense:"Expense",transfer:"Transfer"}[d.type])}</span><time datetime="${d.date}">${dateText(d.date)}</time></div><h3 dir="auto">${dataText(c,d.note || categoryTitle(c,d.category))}</h3><p dir="auto">${dataText(c,accountName(c,d.accountId))}${d.destinationId ? ` ← ${dataText(c,accountName(c,d.destinationId))}` : ""}</p><bdi class="transaction-card-amount ${d.type==='income'?'positive':d.type==='expense'?'negative':''}" dir="ltr">${d.type==='income'?'+':d.type==='expense'?'−':''}${money(d.amount)} <small>${t("toman")}</small></bdi><footer><button type="button" class="icon-button" data-action="edit" data-id="${record.id}" aria-label="${t("Edit")}">${icon("edit")}</button><button type="button" class="icon-button" data-action="delete" data-id="${record.id}" aria-label="${t("Delete")}">${icon("trash")}</button></footer></article>`;
    }).join("")}</div></section>`;
  }).join("")}</div>`;
}
