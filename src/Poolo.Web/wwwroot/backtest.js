import {validIso,solarText} from './calendar.js';
import {parseDelimited,parseDate,parseMoney} from './extension/shared/extract.js';
export const benchmarkSymbols=['GOLD','FUND','BTC','USD'];
const ms=iso=>Date.parse(iso+'T12:00:00Z'),days=(a,b)=>(ms(a)-ms(b))/86400000;
export function cleanCurve(points,source=''){const unique=new Map();for(const p of points||[])if(validIso(p.date)&&Number.isFinite(p.price)&&p.price>0&&p.price<=1e15)unique.set(p.date,{date:p.date,price:p.price,source:p.source||source,fxDate:p.fxDate||null});return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function before(points,date,gap=7){const list=points.filter(p=>p.date<=date);const last=list.at(-1);return last&&days(date,last.date)<=gap?last:null;}
function after(points,date,valuation,gap=7){return points.find(p=>p.date>=date&&p.date<=valuation&&days(p.date,date)<=gap)||null;}
export function mergedCurves(api,records){const result={};for(const symbol of ['GOLD','USD','BTC_USD','FUND'])result[symbol]=cleanCurve(api?.series?.[symbol]?.points,api?.series?.[symbol]?.source||'');
 result.BTC=result.BTC_USD.flatMap(p=>{const fx=before(result.USD,p.date);return fx?[{date:p.date,price:p.price*fx.price,source:p.source+' × '+fx.source,fxDate:fx.date}]:[];});
 for(const symbol of benchmarkSymbols){const manual=records.filter(r=>r.kind==='benchmarkSeries'&&!r.deleted&&r.data.symbol===symbol).flatMap(r=>r.data.points.map(p=>({...p,source:(p.source||r.data.source)+' · manual'})));result[symbol]=cleanCurve([...result[symbol],...manual]);}
 return result;
}
export function historicalMix(results,maxWeight=40,minFund=20){
 if(!Number.isFinite(maxWeight)||!Number.isFinite(minFund)||maxWeight<25||maxWeight>100||minFund<0||minFund>maxWeight)throw Error('Use a cap of 25–100% and a fund minimum no larger than the cap.');
 if(benchmarkSymbols.some(s=>!results.find(r=>r.symbol===s)?.complete))return null;
 const weights=Object.fromEntries(benchmarkSymbols.map(s=>[s,s==='FUND'?minFund:0]));let remaining=100-minFund;
 for(const r of [...results].sort((a,b)=>b.returnPct-a.returnPct||benchmarkSymbols.indexOf(a.symbol)-benchmarkSymbols.indexOf(b.symbol))){const take=Math.min(maxWeight-weights[r.symbol],remaining);weights[r.symbol]+=take;remaining-=take;}
 if(remaining>0.000001)throw Error('These allocation limits cannot total 100%.');
 const value=results.reduce((sum,r)=>sum+r.value*weights[r.symbol]/100,0),invested=results[0].invested;
 return {weights,value,invested,profit:value-invested,returnPct:(value/invested-1)*100};
}
export function compareInvestments(steps,curves,asOf,maxWeight=40,minFund=20){
 if(!validIso(asOf))throw Error('Invalid valuation date.');
 const ordered=steps.filter(r=>!r.deleted).map(r=>r.data||r).sort((a,b)=>a.date.localeCompare(b.date));
 const present=benchmarkSymbols.filter(s=>curves[s]?.length),latest=present.map(s=>curves[s].filter(p=>p.date<=asOf).at(-1)?.date).filter(Boolean);
 const valuation=latest.length?latest.sort()[0]:asOf,invested=ordered.reduce((sum,s)=>sum+s.amount,0);
 const stale=days(asOf,valuation)>7;
 const results=benchmarkSymbols.map(symbol=>{const points=curves[symbol]||[],now=stale?null:before(points,valuation),rows=ordered.map(step=>{const buy=step.date<=valuation?after(points,step.date,valuation):null;if(!buy||!now||now.date<buy.date)return {step,available:false};const value=step.amount/buy.price*now.price;return {step,available:true,buyDate:buy.date,buyPrice:buy.price,buySource:buy.source,valuationDate:now.date,currentPrice:now.price,currentSource:now.source,value,profit:value-step.amount,returnPct:(now.price/buy.price-1)*100,fxDate:buy.fxDate};});const complete=!!ordered.length&&rows.every(r=>r.available),value=complete?rows.reduce((sum,r)=>sum+r.value,0):null;return {symbol,rows,complete,coverage:rows.filter(r=>r.available).length,count:rows.length,invested,value,profit:value===null?null:value-invested,returnPct:value===null?null:(value/invested-1)*100,valuationDate:now?.date||null};});
 const actualComplete=!!ordered.length&&ordered.every(s=>s.actualValue!==null&&s.actualValue!==undefined&&s.valueDate===valuation),actualValue=actualComplete?ordered.reduce((sum,s)=>sum+s.actualValue,0):null;
 return {valuation,asOf,stale,invested,results,actual:actualComplete?{value:actualValue,returnPct:(actualValue/invested-1)*100,profit:actualValue-invested}:null,mix:invested?historicalMix(results,maxWeight,minFund):null};
}
export function parseBenchmarkCsv(input,symbol,unit,source){if(!benchmarkSymbols.includes(symbol)||!['rial','toman'].includes(unit)||!source.trim()||source.length>80)throw Error('Choose a benchmark and source name.');const table=parseDelimited(input,5000),dateIndex=table.headers.findIndex(h=>/^(date|تاریخ)$/i.test(h.trim())),priceIndex=table.headers.findIndex(h=>/^(price|price_toman|price_rial|قیمت)$/i.test(h.trim()));if(dateIndex<0||priceIndex<0)throw Error('CSV needs date and price columns.');const header=table.headers[priceIndex].trim().toLowerCase();if(header==='price_rial'&&unit!=='rial'||header==='price_toman'&&unit!=='toman')throw Error('The price column unit must match the selected source unit.');const points=table.rows.map((row,i)=>{try{return {date:parseDate(row[dateIndex]),price:Number(parseMoney(row[priceIndex],unit)),source:source.trim()};}catch{throw Error('Invalid benchmark CSV row: '+(i+2));}});if(points.some(p=>p.price<=0||p.price>1e15)||new Set(points.map(p=>p.date)).size!==points.length)throw Error('Prices must be positive with unique dates.');const groups=new Map();for(const p of points){const year=Number(p.date.slice(0,4));if(!groups.has(year))groups.set(year,[]);groups.get(year).push(p);}return [...groups].map(([year,points])=>({symbol,year,source:source.trim(),points:points.sort((a,b)=>a.date.localeCompare(b.date))}));}
