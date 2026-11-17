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
