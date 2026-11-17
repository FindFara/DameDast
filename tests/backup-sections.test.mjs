import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup, validateBackup, restoreBackup, selectBackupRecords} from '../src/Poolo.Web/wwwroot/backup.js';
import {emptyDocument} from '../src/Poolo.Web/wwwroot/whiteboard/model.mjs';
const id = () => crypto.randomUUID();
const bytes = new TextEncoder().encode('%PDF-1.7\nexample fixture\n%%EOF');
const pdf = {id:id(),name:'study.pdf',size:bytes.length,type:'application/pdf'};
const canvas = id();
const note = {id:id(),kind:'note',version:1,data:{title:'Study',body:'Keep this text',checklist:[{id:id(),text:'Read chapter one',done:false}],whiteboardId:canvas,attachments:[pdf]}};
const finance = [{id:id(),kind:'account',data:{name:'Account',openingBalance:1000}},{id:id(),kind:'transaction',data:{amount:100,description:'Expense'}}];
const records = [note,...finance];
const deps = {records,scope:'guest',readCanvas:async()=>({document:emptyDocument()}),readPdfFile:async()=>({blob:new Blob([bytes],{type:'application/pdf'})})};
test('notes backup includes handwriting, todo text and exact PDF bytes without finances',async()=>{
 const backup=await createBackup({...deps,section:'notes'});
 assert.deepEqual(backup.records.map(r=>r.kind),['note']);
 assert.equal(backup.records[0].data.checklist[0].text,'Read chapter one');
 assert.equal(backup.whiteboards.length,1);
 assert.equal(backup.pdfs.length,1);
 assert.deepEqual(Buffer.from(backup.pdfs[0].data,'base64'),Buffer.from(bytes));
 assert.equal(backup.section,'notes');
});
test('financial export does not access or include note files',async()=>{
 const backup=await createBackup({...deps,section:'finance',readCanvas:()=>assert.fail('No canvas reads'),readPdfFile:()=>assert.fail('No PDF reads')});
 assert.deepEqual(backup.records,finance);
 assert.deepEqual(backup.pdfs,[]);assert.deepEqual(backup.whiteboards,[]);
});
test('restore installs the PDFs and canvases in the new workspace and updates references',async()=>{
 const backup=await createBackup({...deps,section:'notes'});const writes=[];
 const restored=await restoreBackup(backup,'guest',{writeCanvas:async(...args)=>writes.push(['canvas',...args]),writePdfFile:async(...args)=>writes.push(['pdf',...args])});
 assert.match(restored.scope,/^restore:/);
 const savedPdf=writes.find(w=>w[0]==='pdf');
 assert.equal(savedPdf[1],restored.scope);
 assert.equal(savedPdf[2].id,restored.records[0].data.attachments[0].id);
 assert.notEqual(savedPdf[2].id,pdf.id);
 assert.deepEqual(new Uint8Array(await savedPdf[3].arrayBuffer()),bytes);
 const savedCanvas=writes.find(w=>w[0]==='canvas');
 assert.equal(savedCanvas[2],restored.records[0].data.whiteboardId);
 assert.equal(restored.records[0].data.checklist[0].text,'Read chapter one');
});
test('missing or corrupted PDF files cannot produce or restore a silently incomplete backup',async()=>{
 await assert.rejects(createBackup({...deps,readPdfFile:async()=>null}),/PDF is unavailable/);
 const backup=await createBackup({...deps,section:'notes'});
 assert.throws(()=>validateBackup({...backup,pdfs:[]}),/missing a PDF/);
 assert.throws(()=>validateBackup({...backup,pdfs:[{...backup.pdfs[0],data:btoa('invalid')}]}),/PDF attachment/);
});
test('older complete backups and legacy tombstones remain readable',()=>{
 assert.equal(validateBackup({format:'poolo-v1',records:[{...finance[0],deleted:true}]}).format,'poolo-v1');
 assert.equal(validateBackup({format:'damdast-v2',records:finance,whiteboards:[]}).records.length,2);
 assert.throws(()=>selectBackupRecords(records,'wrong'),/Invalid backup section/);
});
