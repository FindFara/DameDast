import {loadSpace,saveSpace} from './store.js';
import {materialize} from './finance.js';
import {normalizeBundle,normalizeSnapshot,mergeSnapshot,scopeKey} from './extension/shared/portfolio.js';
const empty=()=>({snapshot:{revision:0,records:[]},pending:[]});
export function syncBatch(pending) {
  const result=[];let size=20;
  for(const item of pending.slice(0,100)){const bytes=new TextEncoder().encode(JSON.stringify(item)).length;if(bytes>220000)throw Error('Portfolio snapshot is too large.');if(size+bytes>220000)break;result.push(item);size+=bytes+1;}
  return result;
}
export class ConnectedStore {
  constructor(onChange){this.onChange=onChange;this.state=empty();this.session={authenticated:false};this.key='portfolio:guest';this.status='local';this.busy=false;this.error='';}
  get snapshots(){return materialize(this.state).filter(r=>!r.deleted&&r.kind==='externalSnapshot').map(r=>({...normalizeSnapshot(r.data),recordId:r.id}));}
  async request(path,options={}) {return fetch(path,{...options,cache:'no-store',signal:AbortSignal.timeout(25000)});}
  lock(run){return navigator.locks?navigator.locks.request(this.key,run):run();}
  async initialize(){
    try{const r=await this.request('/api/portfolio/session');if(r.ok)this.session=await r.json();if(this.session.authenticated)localStorage.setItem('damdast-portfolio-user',this.session.userId);}
    catch{const last=localStorage.getItem('damdast-portfolio-user');if(last)this.session={authenticated:false,userId:last};}
    this.key='portfolio:'+(this.session.userId||'guest');this.state=await loadSpace(this.key);this.status=this.session.authenticated?'synced':'local';this.onChange();void this.sync();
  }
  async import(input){
    const imports=normalizeBundle(input);
    await this.lock(async()=>{
      const state=await loadSpace(this.key),records=materialize(state);const pending=[...state.pending];
      for(const packet of imports){
        const current=records.find(r=>!r.deleted&&r.kind==='externalSnapshot'&&scopeKey(r.data)===scopeKey(packet));
        const data=mergeSnapshot(current?.data,packet);if(current?.data.captureId===data.captureId)continue;
        const id=current?.id||crypto.randomUUID();pending.push({operationId:crypto.randomUUID(),id,kind:'externalSnapshot',expectedVersion:current?.version||0,delete:false,data});
        const updated={id,kind:'externalSnapshot',version:(current?.version||0)+1,deleted:false,data};if(current)records[records.indexOf(current)]=updated;else records.push(updated);
      }
      if(records.filter(r=>!r.deleted).length>20||pending.length>100)throw Error('Too many sources or unsynced changes.');
      this.state={...state,pending};await saveSpace(this.key,this.state);
    });this.error='';this.onChange();await this.sync();
  }
  async remove(id){
    await this.lock(async()=>{this.state=await loadSpace(this.key);const row=materialize(this.state).find(r=>r.id===id&&!r.deleted);if(!row)return;this.state.pending.push({operationId:crypto.randomUUID(),id,kind:'externalSnapshot',expectedVersion:row.version,delete:true,data:null});await saveSpace(this.key,this.state);});this.onChange();await this.sync();
  }
  async sync(){
    if(this.busy||!this.session.authenticated||!navigator.onLine)return;
    this.busy=true;this.status='syncing';this.onChange();
    try{await this.lock(async()=>{
      this.state=await loadSpace(this.key);
      while(this.state.pending.length){
        const changes=syncBatch(this.state.pending),r=await this.request('/api/portfolio/sync',{method:'POST',headers:{'Content-Type':'application/json','X-DameDast-Portfolio':'1',...(this.session.csrf?{'X-CSRF-TOKEN':this.session.csrf}:{})},body:JSON.stringify({changes})});
        if(r.status===409){this.status='conflict';throw Error('Cloud conflict. Export local data before reloading cloud data.');}
        if(r.status===401){this.status='sign-in';throw Error('Sign in again to sync.');}
        if(!r.ok)throw Error('Portfolio sync failed. Your data is kept locally.');
        this.state.snapshot=await r.json();const sent=new Set(changes.map(c=>c.operationId));this.state.pending=this.state.pending.filter(c=>!sent.has(c.operationId));await saveSpace(this.key,this.state);
      }
      const r=await this.request('/api/portfolio');if(!r.ok)throw Error('Portfolio sync failed. Your data is kept locally.');
      this.state.snapshot=await r.json();await saveSpace(this.key,this.state);this.status='synced';this.error='';
    });}catch(e){this.error=e.message;if(!['conflict','sign-in'].includes(this.status))this.status='pending';}
    finally{this.busy=false;this.onChange();}
  }
  async reloadCloud(){
    if(!this.session.authenticated)return;const r=await this.request('/api/portfolio');if(!r.ok)throw Error('Server unavailable.');const snapshot=await r.json();await this.lock(async()=>{this.state={snapshot,pending:[]};await saveSpace(this.key,this.state);});this.error='';this.status='synced';this.onChange();
  }
  async clearLocal(){
    const previousKey=this.key;
    this.session={authenticated:false};
    await this.lock(async()=>{if(previousKey!=='portfolio:guest')await saveSpace(previousKey,empty());this.state=await loadSpace('portfolio:guest');});
    this.key='portfolio:guest';localStorage.removeItem('damdast-portfolio-user');this.status='local';this.error='';this.onChange();
  }
}
