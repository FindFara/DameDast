import { instruments } from './market-catalog.js';
export const defaultMarketSymbols = ['BTC','GOLD','SILVER','USD'];
export const marketChoices = [...defaultMarketSymbols,...instruments.map(i=>i.symbol).filter(s=>!defaultMarketSymbols.includes(s))];
export function selectedMarketSymbols(options = {}) {
  return options?.symbols ? options.symbols.split(',') : [...defaultMarketSymbols];
}
export function validMarketSymbols(value) {
  if (typeof value !== 'string') return false;
  const symbols=value.split(',');
  return symbols.length>=1 && symbols.length<=8 && new Set(symbols).size===symbols.length && symbols.every(symbol=>instruments.some(i=>i.symbol===symbol));
}
export function deskMarketQuote(symbol, market, now) {
  const quote=market?.quotes?.find(q=>q.symbol===symbol);
  if (!quote) return null;
  let price=quote.price, change=quote.changePercent, unit=quote.unit.startsWith('USD')?'USD':'toman', asOf=quote.asOf;
  if (unit==='USD') {
    const dollar=market.quotes.find(q=>q.symbol==='USD');
    if (dollar && dollar.price>0) {
      price*=dollar.price; unit='toman';
      change=change==null || dollar.changePercent==null ? null : ((1+change/100)*(1+dollar.changePercent/100)-1)*100;
      if(Date.parse(dollar.asOf)<Date.parse(asOf))asOf=dollar.asOf;
    }
  }
  return {price,change,unit,asOf,source:quote.source,delayed:market.stale || Date.parse(now)-Date.parse(asOf)>7200000};
}
export function marketMark(symbol) {
  const shapes={
    BTC:'<text x="16" y="24" text-anchor="middle" fill="white" font-size="24" font-weight="700" font-family="Arial,sans-serif">₿</text>',
    GOLD:'<path d="m9 12 3-5h8l3 5 3 12H6Z" fill="white"/><path d="M9 12h14M16 12v12" stroke="#cda536" stroke-width="1.8"/>',
    SILVER:'<path d="m8 13 4-6h8l4 6 2 11H6Z" fill="white"/><path d="M8 13h16M16 13v11" stroke="#8391a5" stroke-width="1.8"/>',
    USD:'<text x="16" y="24" text-anchor="middle" fill="white" font-size="25" font-weight="700" font-family="Arial,sans-serif">$</text>',
    USDT:'<path d="M7 8h18v4h-7v3c6 .2 9 1 9 2s-4 2-9 2v8h-4v-8c-5 0-9-1-9-2s3-1.8 9-2v-3H7Zm7 8c-4 .1-6 .5-6 1s3 1 8 1 8-.5 8-1-2-.9-6-1v1h-4Z" fill="white"/>',
    ETH:'<path d="m16 3 8 13-8 5-8-5Zm0 20 8-5-8 11-8-11Z" fill="white"/>',
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${shapes[symbol]||'<path d="m16 5 11 11-11 11L5 16Z" fill="white"/>'}</svg>`;
}
