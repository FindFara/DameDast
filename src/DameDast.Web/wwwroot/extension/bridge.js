(()=>{
  if(!document.querySelector('meta[name="damdast-app"][content="portfolio-v1"]'))return;
  const origin=location.origin;
  window.addEventListener('message',async event=>{
    if(event.source!==window||event.origin!==origin||!event.data||!/^damdast:(hello|read|clips|clip-ack)$/.test(event.data.type)||typeof event.data.nonce!=='string'||event.data.nonce.length>80)return;
    const nonce=event.data.nonce;
    if(event.data.type==='damdast:hello'){window.postMessage({type:'damdast:available',nonce,version:1},origin);return;}
    if(event.data.type==='damdast:clips'||event.data.type==='damdast:clip-ack'){
      try{const result=await chrome.runtime.sendMessage({type:event.data.type==='damdast:clips'?'clip-inbox':'clip-ack',id:event.data.id});window.postMessage({type:'damdast:clips-result',nonce,...result},origin);}catch{window.postMessage({type:'damdast:clips-result',nonce,ok:false},origin);}return;
    }
    try{const result=await chrome.runtime.sendMessage({type:'portfolio-bundle'});window.postMessage({type:'damdast:result',nonce,...result},origin);}catch{window.postMessage({type:'damdast:result',nonce,ok:false},origin);}
  });
})();
