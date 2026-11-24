import test from 'node:test';
import assert from 'node:assert/strict';
let listener,removed;const stored={target:'https://app.example',snapshots:[]},registrations=[];
globalThis.chrome={runtime:{id:'self',getURL:p=>'chrome-extension://self/'+p.replace(/^\//,''),onMessage:{addListener:fn=>listener=fn},onInstalled:{addListener:()=>{}}},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,stored[k]])),set:async v=>Object.assign(stored,v),remove:async key=>delete stored[key],setAccessLevel:async()=>{}}},permissions:{contains:async()=>true,remove:async()=>true,onRemoved:{addListener:fn=>removed=fn}},scripting:{unregisterContentScripts:async()=>{},registerContentScripts:async entries=>registrations.push(...entries)}};
const {validTarget}=await import('../src/DameDast.Web/wwwroot/extension/background.js');
const send=(message,sender)=>new Promise(resolve=>listener(message,sender,resolve));

test('destination validation rejects credentials, queries, insecure hosts and nested paths',()=>{
 assert.equal(validTarget('https://app.example/'),'https://app.example');assert.equal(validTarget('http://localhost:5000/'),'http://localhost:5000');
 for(const u of ['http://app.example/','https://user:pass@app.example/','https://app.example/?token=secret','https://app.example/page'])assert.throws(()=>validTarget(u));
});
test('only the trusted extension manager can configure the bridge',async()=>{
 const denied=await send({type:'configure-target',url:'https://evil.example/'},{id:'self',url:'https://app.example/'});assert.equal(denied.ok,false);
 const accepted=await send({type:'configure-target',url:'https://app.example/'},{id:'self',url:'chrome-extension://self/manager.html#review'});assert.equal(accepted.ok,true);assert.deepEqual(registrations.at(-1).matches,['https://app.example/*']);
});
test('portfolio data is delivered only to the exact configured PWA origin',async()=>{
 assert.equal((await send({type:'portfolio-bundle'},{tab:{id:1},url:'https://app.example.evil/'})).ok,false);
 assert.equal((await send({type:'portfolio-bundle'},{tab:{id:1},url:'https://app.example/#connected'})).ok,true);
 assert.equal((await send({type:'portfolio-bundle'},{url:'https://app.example/'})).ok,false);
});

test('article clips can only be read or acknowledged by the configured app, without losing other clips',async()=>{
 const clip={id:crypto.randomUUID(),title:'.NET',url:'https://dot.net/',excerpt:'Selected text'};
 stored.clips=[clip,{...clip,id:crypto.randomUUID(),title:'Another'}];
 assert.equal((await send({type:'clip-inbox'},{tab:{id:1},url:'https://app.example.evil/'})).ok,false);
 const received=await send({type:'clip-inbox'},{tab:{id:1},url:'https://app.example/#bookmarks'});
 assert.equal(received.ok,true);assert.equal(received.clips.length,2);assert.deepEqual(received.clips[0].tags,['Read later']);
 assert.equal((await send({type:'clip-ack',id:clip.id},{tab:{id:1},url:'https://else.example/'})).ok,false);
 assert.equal(stored.clips.length,2);
 assert.equal((await send({type:'clip-ack',id:clip.id},{tab:{id:1},url:'https://app.example/#bookmarks'})).ok,true);
 assert.equal(stored.clips.length,1);assert.equal(stored.clips[0].title,'Another');
});
