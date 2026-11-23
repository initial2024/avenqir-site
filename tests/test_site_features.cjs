"use strict";
const assert=require('node:assert/strict');
const path=require('node:path');
const dirname=path.resolve(__dirname,'..');
require(path.join(dirname,'site','backup-schema.js'));
const API=globalThis.AVENQIR_TRANSFER;
assert.ok(API);
const key={
 bookmarks:'avenqir_v6_bookmarks',
 notes:'avenqir_v6_notes',
 timer:'avenqir_v5_timer',
 game:'avenqir_v5_2048',
 tasks:'avenqir_v5_tasks'
};
const bookmark=[{id:'x',name:'官方文档',url:'https://example.com/a',category:'开发',note:'示例',
fav:true,todo:false,custom:true,at:Date.now()}];
const notes=[{id:'y',title:'测试',body:'# 标题\n**中文**',at:Date.now()}];
const game={board:Array(16).fill(0),score:0,prev:null,won:false};
game.board[0]=2;
const data={
 [key.bookmarks]:bookmark,
 [key.notes]:notes,
 [key.timer]:{total:1500,remaining:1200,running:false,endAt:0,label:'专注 25 分钟'},
 [key.game]:game,
 [key.tasks]:{day:'2026-11-23',items:[{text:'学习',done:true}]},
 avenqir_v5_2048best:128,
 avenqir_v5_memorybest:15,
 avenqir_v5_pop:7
};
for(const [k,v] of Object.entries(data))assert.equal(API.validate(k,v),true,'valid '+k);
function storage(init={}){
 const map=new Map(Object.entries(init));let throwKey=null;
 return {getItem:k=>map.has(k)?map.get(k):null,setItem(k,v){if(k===throwKey)throw Error('QuotaExceeded');map.set(k,String(v));},
 removeItem:k=>map.delete(k),failAt(k){throwKey=k}};
}
const mine=storage(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])));
const out=API.makeExport(mine,['bookmarks','notes','daily']);
assert.equal(out.archive.format,API.FORMAT);
assert.deepEqual(Object.keys(out.archive.data).sort(),Object.keys(data).sort());
assert.equal(out.skipped.length,0);
const imported=API.readArchive(JSON.parse(JSON.stringify(out.archive)));
assert.equal(API.selectedKeys(imported,['bookmarks']).length,1);
assert.equal(API.selectedKeys(imported,['notes']).length,1);
const another=storage({'untouched':'preserved'});
assert.equal(API.importInto(another,imported,[key.bookmarks,key.notes]),2);
assert.equal(another.getItem('untouched'),'preserved');
assert.deepEqual(JSON.parse(another.getItem(key.notes)),notes);
const oldJSON=JSON.stringify([{...bookmark[0],name:'旧条目'}]);
const rollback=storage({[key.bookmarks]:oldJSON});
rollback.failAt(key.notes);
assert.throws(()=>API.importInto(rollback,imported,[key.bookmarks,key.notes]));
assert.equal(rollback.getItem(key.bookmarks),oldJSON,'rollback restored original bookmark bytes');
assert.equal(rollback.getItem(key.notes),null);
assert.equal(API.validate(key.bookmarks,[{...bookmark[0],url:'javascript:alert(1)'}]),false);
assert.equal(API.validate(key.bookmarks,[bookmark[0],bookmark[0]]),false);
assert.equal(API.validate(key.notes,[{...notes[0],body:'x'.repeat(30001)}]),false);
assert.throws(()=>API.readArchive({format:API.FORMAT,data:{'unknown-key':'bad'}}));
assert.throws(()=>API.readArchive({format:'unexpected',data:{}}));
const oldTimer={...data[key.timer],running:true,endAt:Date.now()+300000,remaining:1500};
const migrated=API.readArchive({format:API.FORMAT,data:{[key.timer]:oldTimer}});
assert.equal(migrated[key.timer].running,false);
assert.equal(migrated[key.timer].endAt,0);
assert.ok(migrated[key.timer].remaining<=300 && migrated[key.timer].remaining>=298);
global.document={readyState:'loading',addEventListener(){}};
const palette=require(path.join(dirname,'site','quick-search.js'));
assert.ok(palette.find('dns').some(x=>x.url==='tools.html#dns'));
assert.ok(palette.find('2048').some(x=>x.url==='fun.html#game2048'));
assert.ok(palette.find('备份').some(x=>x.url==='backup.html'));
assert.equal(palette.find('一个不存在的随机功能标签').length,0);
console.log('PASS: backup/restore, rollback, hostile input, timer pause and quick-search tests');
