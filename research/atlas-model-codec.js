"use strict";
(function(root){
function pack(m){
 const {classes,...meta}=m;const data=[];
 for(const [id,weights] of classes){
  let last=-1;
  for(const [k,w] of weights){if(!Number.isInteger(k)||k<=last||k>=m.bins||!Number.isInteger(w)||w<1||w>4096)throw Error('weight');data.push(k&255,k>>>8,w&255,w>>>8);last=k;}
 }
 return {format:'aq-u16le-1',meta,classes:classes.map(([id,w])=>[id,w.length]),data:Uint8Array.from(data)};
}
function unpack(p){
 if(p.format!=='aq-u16le-1'||![4096,8192].includes(p.meta.bins)||!Array.isArray(p.classes)||p.classes.length>64||!(p.data instanceof Uint8Array)||p.data.length>512*1024)throw Error('format');
 const ids=new Set();let i=0;
 const classes=p.classes.map(([id,n])=>{if(typeof id!=='string'||ids.has(id)||!Number.isInteger(n)||n<1||n>p.meta.bins||i+4*n>p.data.length)throw Error('class');ids.add(id);let last=-1;const weights=[];for(let j=0;j<n;j++){const k=p.data[i]|p.data[i+1]<<8,w=p.data[i+2]|p.data[i+3]<<8;i+=4;if(k<=last||k>=p.meta.bins||w<1||w>4096)throw Error('weight');last=k;weights.push([k,w]);}return [id,weights];});
 if(i!==p.data.length)throw Error('trailing bytes');
 return {...p.meta,classes};
}
function b64(data){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let s='';for(let i=0;i<data.length;i+=3){const a=data[i],b=data[i+1]||0,c=data[i+2]||0;s+=chars[a>>2]+chars[((a&3)<<4)|(b>>4)]+(i+1<data.length?chars[((b&15)<<2)|(c>>6)]:'=')+(i+2<data.length?chars[c&63]:'=');}return s;}
function unb64(s){if(typeof s!=='string'||s.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)||s.length>700000)throw Error('base64');const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const out=[];for(let i=0;i<s.length;i+=4){const a=chars.indexOf(s[i]),b=chars.indexOf(s[i+1]),c=chars.indexOf(s[i+2]),d=chars.indexOf(s[i+3]);if(a<0||b<0)throw Error('base64');out.push(a<<2|b>>4);if(c>=0)out.push((b&15)<<4|c>>2);if(d>=0)out.push((c&3)<<6|d);}const data=Uint8Array.from(out);if(b64(data)!==s)throw Error('noncanonical');return data;}
function serialize(m){const p=pack(m);return JSON.stringify({...p,data:b64(p.data)})+'\n';}
function deserialize(s){const p=JSON.parse(s);return unpack({...p,data:unb64(p.data)});}


const api=Object.freeze({pack,unpack,serialize,deserialize});if(typeof module==="object"&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_CODEC=api;
})(typeof self!=="undefined"?self:globalThis);
