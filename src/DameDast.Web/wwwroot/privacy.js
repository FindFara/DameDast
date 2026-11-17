import { localizedNumber } from "./i18n.js";

export const amountsHidden = (context) =>
  context?.page === "overview" && context.amountsVisible !== true;

export function amountText(value, context, decimals = 0) {
  return amountsHidden(context) ? "••••" : localizedNumber(value, decimals);
}
