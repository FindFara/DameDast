import {BUNDLE,normalizeSnapshot} from './shared/portfolio.js';
export function validTarget(raw) {
  const url=new URL(raw);if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('فقط نشانی اصلی برنامه را وارد کن؛ بدون مسیر، توکن یا پارامتر.');
  if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('نشانی باید HTTPS یا localhost باشد.');
  return url.origin;
}
async function registerBridge(origin) {
  await chrome.scripting.unregisterContentScripts({ids:['damdast-bridge']}).catch(()=>{});
  if(origin)await chrome.scripting.registerContentScripts([{id:'damdast-bridge',matches:[origin+'/*'],js:['bridge.js'],runAt:'document_idle',persistAcrossSessions:true}]);
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  void (async()=>{
    if(message?.type==='configure-target' && sender.id===chrome.runtime.id && sender.url && new URL(sender.url).origin===new URL(chrome.runtime.getURL('/')).origin && new URL(sender.url).pathname==='/manager.html'){
      const origin=validTarget(message.url);if(!await chrome.permissions.contains({origins:[origin+'/*']}))throw Error('مجوز اتصال داده نشده.');
      const old=(await chrome.storage.local.get('target')).target;
      await registerBridge(origin);await chrome.storage.local.set({target:origin});
      if(old&&old!==origin)await chrome.permissions.remove({origins:[old+'/*']});
      respond({ok:true,origin});return;
    }
    if(message?.type==='portfolio-bundle'){
      const {target,snapshots=[]}=await chrome.storage.local.get(['target','snapshots']);
      if(!target||!sender.tab||new URL(sender.url).origin!==target)throw Error('Untrusted destination.');
      respond({ok:true,bundle:{format:BUNDLE,snapshots:snapshots.map(normalizeSnapshot)}});return;
    }
    respond({ok:false,error:'Unknown request.'});
  })().catch(()=>respond({ok:false,error:'اتصال انجام نشد؛ مجوز و نشانی برنامه را بررسی کن.'}));
  return true;
});
chrome.permissions.onRemoved.addListener(()=>{void (async()=>{const {target}=await chrome.storage.local.get('target');if(target&&!await chrome.permissions.contains({origins:[target+'/*']})){await registerBridge(null);await chrome.storage.local.remove('target');}})();});

chrome.runtime.onInstalled.addListener(()=>{void chrome.storage.local.setAccessLevel({accessLevel:"TRUSTED_CONTEXTS"});});
