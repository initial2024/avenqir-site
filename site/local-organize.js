"use strict";
(function(root){
  function history(value){return Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string'&&x.trim()&&x.length<=140).map(x=>x.trim()))].slice(0,10):[];}
  function move(rows,from,to){const a=rows.slice(),i=a.findIndex(x=>x.id===from),j=a.findIndex(x=>x.id===to);if(i<0||j<0||i===j)return a;const [item]=a.splice(i,1);a.splice(j,0,item);return a;}
  function rename(rows,from,to){if(typeof to!=='string'||!to.trim()||to.trim().length>32||typeof from!=='string')return rows.slice();return rows.map(x=>x.category===from?{...x,category:to.trim()}:x);}
  function tags(value){const list=Array.isArray(value)?value:typeof value==='string'?value.split(/[,，、]/):[];return [...new Set(list.filter(x=>typeof x==='string').map(x=>x.trim()).filter(x=>x&&x.length<=24&&!/[\u0000-\u001f\u007f]/.test(x)))].slice(0,8);}
  function escapeText(x){return String(x??'').replace(/[\r\n\t]+/g,' ').replace(/[\\\x60*_[\]<>#!|]/g,'\\$&');}
  function markdown(rows){const groups=new Map();for(const row of rows){let url;try{url=new URL(row.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)continue;}catch{continue;}const category=String(row.category||'Other');if(!groups.has(category))groups.set(category,[]);groups.get(category).push('- ['+escapeText(row.name)+'](<'+url.href.replace(/</g,'%3C').replace(/>/g,'%3E')+'>)'+(row.note?' — '+escapeText(row.note):'')+(tags(row.tags).length?' · Tags: '+tags(row.tags).map(escapeText).join(', '):''));}return '# AVENQIR bookmarks\n\n'+[...groups].map(([name,items])=>'## '+escapeText(name)+'\n\n'+items.join('\n')).join('\n\n')+'\n';}
  function usage(storage){let bytes=0,keys=0;try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(typeof key!=='string'||!/^avenqir[._]/i.test(key))continue;const value=storage.getItem(key)||'';bytes+=2*(key.length+value.length);keys++;}return {bytes,keys};}catch{return null;}}
  const api=Object.freeze({history,move,rename,tags,markdown,usage});root.AVENQIR_LOCAL_ORGANIZE=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
