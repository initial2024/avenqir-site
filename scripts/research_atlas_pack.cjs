"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");

const {serialize,deserialize}=require('../research/atlas-model-codec.js');
const root=path.join(__dirname,'../research');
for(const name of ['atlas-model-v2','atlas-multilingual-weights']){
 const original=fs.readFileSync(path.join(root,name+'.json'),'utf8'),m=JSON.parse(original),encoded=serialize(m),round=deserialize(encoded);
 assert.deepEqual(round,m);assert.ok(Buffer.byteLength(encoded)<Buffer.byteLength(original));
 const bad=JSON.parse(encoded);bad.data=bad.data.slice(0,-4);assert.throws(()=>deserialize(JSON.stringify(bad)));
 const target=path.join(root,name+'.packed.json');
 if(process.argv.includes('--write'))fs.writeFileSync(target,encoded);
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),encoded);
 console.log('LOSSLESS_PACK',name,Buffer.byteLength(original),Buffer.byteLength(encoded));
}
