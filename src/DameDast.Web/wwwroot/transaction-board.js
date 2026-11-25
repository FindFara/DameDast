import { money, dateText } from "./finance.js";
import { t } from "./i18n.js";
import { plainNumeric } from "./number-inputs.js";

export function normalizeTransactionFilters(values = {}) {
  const filters = Object.fromEntries(["search", "type", "group", "minAmount", "maxAmount", "dateFrom", "dateTo"].map(key => [key, String(values[key] || "").trim()]));
  filters.sort = ["date-desc", "date-asc", "amount-desc", "amount-asc"].includes(values.sort) ? values.sort : "date-desc";
  for (const field of ["minAmount", "maxAmount"]) if (filters[field]) {
    filters[field] = plainNumeric(filters[field]);
    if (!/^\d+(?:\.\d+)?$/.test(filters[field]) || !Number.isFinite(Number(filters[field]))) throw Error("Enter a valid amount range.");
  }
  if (filters.minAmount && filters.maxAmount && Number(filters.minAmount) > Number(filters.maxAmount)) throw Error("Minimum amount must not exceed maximum amount.");
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) throw Error("Start date must not follow end date.");
  return filters;
}
export function filterTransactions(records, filters = {}, searchText = record => `${record.data.note || ""} ${record.data.category || ""}`) {
  const query = (filters.search || "").toLowerCase();
  return records.filter(record => !record.deleted && record.kind === "transaction")
    .filter(({data}) => (!filters.type || data.type === filters.type) && (!filters.group || (filters.group === "__uncategorized" ? !data.category : data.category === filters.group))
      && (!filters.minAmount || data.amount >= Number(filters.minAmount)) && (!filters.maxAmount || data.amount <= Number(filters.maxAmount))
      && (!filters.dateFrom || data.date >= filters.dateFrom) && (!filters.dateTo || data.date <= filters.dateTo))
    .filter(record => !query || searchText(record).toLowerCase().includes(query))
    .sort((a,b)=> {
      const byDate = b.data.date.localeCompare(a.data.date);
      if (filters.sort === "amount-desc") return b.data.amount - a.data.amount || byDate;
      if (filters.sort === "amount-asc") return a.data.amount - b.data.amount || byDate;
      return filters.sort === "date-asc" ? -byDate : byDate;
    });
}
export function transactionBoard(c, records, {icon, categoryTitle, accountName, dataText}) {
  return `<div class="transaction-board" role="region" aria-label="${t("Transactions")}"><ul class="transaction-rows transaction-all-rows">${records.map(record=>{
      const d=record.data;
      return `<li class="transaction-row"><div class="transaction-row-description"><strong dir="auto">${dataText(c,d.note || categoryTitle(c,d.category))}</strong><small><span dir="auto">${dataText(c,accountName(c,d.accountId))}${d.destinationId ? ` ← ${dataText(c,accountName(c,d.destinationId))}` : ""}</span><span class="transaction-type ${d.type}">${icon(d.type === "transfer" ? "transactions" : d.type)}${t({income:"Income",expense:"Expense",transfer:"Transfer"}[d.type])}</span></small></div><div class="transaction-row-value"><bdi class="${d.type==='income'?'positive':d.type==='expense'?'negative':''}" dir="ltr">${d.type==='income'?'+':d.type==='expense'?'−':''}${money(d.amount)} <small>${t("toman")}</small></bdi><time datetime="${d.date}">${dateText(d.date)}</time></div><div class="row-actions"><button type="button" class="icon-button" data-action="edit" data-id="${record.id}" aria-label="${t("Edit")}">${icon("edit")}</button><button type="button" class="icon-button" data-action="delete" data-id="${record.id}" aria-label="${t("Delete")}">${icon("trash")}</button></div></li>`;
    }).join("")}</ul></div>`;
}
