import {normalizeClip} from './shared/clips.js';
import {captureVisibleTables} from './shared/extract.js';
import {providerForUrl} from './shared/portfolio.js';
const status=document.querySelector('#status');
document.querySelector('#manager').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('manager.html')});
document.querySelector('#capture').onclick=async()=>{
  const button=document.querySelector('#capture');button.disabled=true;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const provider=providerForUrl(tab?.url);if(!provider)throw Error('ابتدا صفحه رسمی یکی از پنج سرویس را باز کن.');
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:captureVisibleTables});
    await chrome.storage.session.set({capture:{...result,provider}});
    await chrome.tabs.create({url:chrome.runtime.getURL('manager.html#review')});window.close();
  }catch(error){status.textContent=error.message||'خواندن صفحه انجام نشد.';button.disabled=false;}
};

document.querySelector('#clip').onclick=async()=>{
  const button=document.querySelector('#clip');button.disabled=true;
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({url:location.href,title:document.title.slice(0,200),excerpt:String(window.getSelection()||'').slice(0,4000)})});
    const clip=normalizeClip({...result,id:crypto.randomUUID()});
    const {clips=[]}=await chrome.storage.local.get('clips');
    if(clips.length>=100)throw Error('ابتدا مقاله‌های قبلی را به برنامه منتقل کن.');
    await chrome.storage.local.set({clips:[...clips,clip]});status.textContent='با تگ «بعداً بخوانم» ذخیره شد. در برنامه «دریافت از افزونه» را بزن.';
  }catch(error){status.textContent=error.message||'ذخیره انجام نشد.';}
  finally{button.disabled=false;}
};
document.querySelector('#open-clips').onclick=async()=>{
  const {target}=await chrome.storage.local.get('target');
  if(!target){status.textContent='ابتدا از داشبورد تجمیع، آدرس برنامه را تنظیم کن.';return;}
  await chrome.tabs.create({url:target+'/#bookmarks'});
};
