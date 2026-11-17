import test from 'node:test';
import assert from 'node:assert/strict';
import {materialize,balance,totals,addMonths} from '../src/Poolo.Web/wwwroot/finance.js';

test('internal transfer preserves total balance and does not become income or expense',()=>{
 const a={id:'a',data:{openingBalance:1000}},b={id:'b',data:{openingBalance:2000}};
 const tx=[{data:{type:'transfer',accountId:'a',destinationId:'b',amount:500}}];
 assert.equal(balance(a,tx),500);assert.equal(balance(b,tx),2500);assert.equal(balance(a,tx)+balance(b,tx),3000);
 assert.deepEqual(totals(tx),{income:0,expense:0});
});
test('offline edits and deletion keep monotonically increasing versions',()=>{
 const state={snapshot:{records:[{id:'a',kind:'account',version:4,deleted:false,data:{name:'old'}}]},pending:[{id:'a',kind:'account',delete:false,data:{name:'new'}},{id:'a',kind:'account',delete:true,data:null}]};
 const [record]=materialize(state);assert.equal(record.version,6);assert.equal(record.deleted,true);assert.equal(record.data.name,'new');assert.equal(state.snapshot.records[0].data.name,'old');
});
test('income and expense contribute exactly once to account balance',()=>{
 const a={id:'a',data:{openingBalance:100}},tx=[{data:{accountId:'a',type:'income',amount:80}},{data:{accountId:'a',type:'expense',amount:30}},{data:{accountId:'b',type:'expense',amount:50}}];
 assert.equal(balance(a,tx),150);
});
test('monthly installments follow Persian month boundaries and shorter months',()=>{
 assert.equal(addMonths('2024-09-21',1),'2024-10-21');
 assert.equal(addMonths('2025-03-20',12),'2026-03-20');
});
