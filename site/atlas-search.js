"use strict";
(function(root){
const normalize=x=>String(x||'').normalize('NFKC').toLowerCase().trim();
const groups=[
['pdf','pdf文件','portable document format'],['图片','图像','照片','photo','image','picture'],['修图','图片编辑','photo editing','image editor'],['压缩','compress','compression','缩小'],['合并','merge','combine'],['拆分','split'],['转换','convert','converter'],['幻灯片','演示文稿','ppt','powerpoint','slides','presentation'],['论文','文献','学术','research papers','scholar','journal'],['课程','网课','公开课','courses','lessons'],['人工智能','ai','大模型','chatbot','llm'],['翻译','translate','translation'],['词典','字典','dictionary'],['编程','代码','coding','programming'],['网速','测速','speedtest','speed test','bandwidth'],['ip','ip地址','公网ip','ip address'],['归属地','ip geolocation'],['asn','自治系统号'],['域名','domain','domain name'],['dns','域名解析','dns lookup'],['隐私','privacy'],['浏览器指纹','fingerprint'],['钓鱼','phishing'],['地图','map','maps'],['游戏','games','game'],['电子书','ebook','ebooks'],['统计','statistics'],['数据集','dataset','datasets'],['时区','timezone','time zone'],['音频','audio'],['音乐','music'],['视频','video'],['书签','bookmark','bookmarks'],['备份','backup'],['汇率','exchange rate'],['素材','stock images','design assets'],['日历','calendar'],['二维码','qr code','qrcode'],['正则表达式','正则','regex','regular expression'],['打字练习','typing practice','touch typing','盲打'],['配色','color palette','colour palette'],['流程图','flowchart','flow chart'],['字体','font','fonts'],['公版电子书','public domain ebooks','public domain books'],['会议时区','meeting time zones'],['dns传播','dns propagation','dns 传播'],['图片尺寸','image size','photo size'],['音频编辑','audio editing','audio editor']
];
const lookup=new Map();for(const g of groups)for(const a of g)lookup.set(a,g);
const words=x=>normalize(x).match(/[a-z0-9]+/g)||[];
function contains(text,term){return /^[a-z0-9]{1,3}$/.test(term)?new RegExp('(?:^|[^a-z0-9])'+term+'(?:$|[^a-z0-9])').test(text):text.includes(term);}
function distance(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i),prev2=null;for(let i=1;i<=a.length;i++){const row=[i];let min=i;for(let j=1;j<=b.length;j++){let v=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]?1:0));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,prev2[j-2]+1);row[j]=v;min=Math.min(min,v);}if(min>max)return max+1;prev2=prev;prev=row;}return prev[b.length];}
const phraseLength=Math.max(...[...lookup.keys()].map(x=>x.split(/\s+/).length));
function prepare(query){const q=normalize(query).slice(0,140);if(lookup.has(q))return {q,terms:[q]};const parts=q.split(/\s+/).filter(Boolean),terms=[];for(let i=0;i<parts.length&&terms.length<10;){let found='';for(let n=Math.min(phraseLength,parts.length-i);n>=2;n--){const phrase=parts.slice(i,i+n).join(' ');if(lookup.has(phrase)){found=phrase;i+=n;break;}}if(found)terms.push(found);else terms.push(parts[i++]);}return {q,terms};}
const fieldIndex=new WeakMap();
function fieldInfo(fields){let result=fieldIndex.get(fields);if(!result){const values=fields.map(normalize);const candidates=[...new Set(words(values[0]+' '+(values[1]||'')))].filter(w=>w.length>=4&&w.length<=34);result={values,candidates};fieldIndex.set(fields,result);}return result;}
function analyze(prepared,fields,initialsMatch=()=>false){
 const {q,terms}=prepared;if(!q)return {rank:1,kind:'exact'};
 const {values,candidates}=fieldInfo(fields);let total=0,kind='exact';
 for(const t of terms){
  const exact=values.map(v=>contains(v,t));
  if(exact.some(Boolean)){total+=20+(values[0]===t?12:values[0]?.startsWith(t)?8:exact[0]?6:0)+(exact[1]?4:0)+(exact[2]?3:0)+(exact[3]?1:0);continue;}
  if(initialsMatch(t)){total+=15;continue;}
  const aliases=lookup.get(t);
  if(aliases&&aliases.some(a=>a!==t&&values.some(v=>contains(v,a)))){total+=9;if(kind==='exact')kind='synonym';continue;}
  if(/^[a-z]{4,32}$/.test(t)){const max=t.length>=9?2:1;if(candidates.some(w=>distance(t,w,max)<=max)){total+=5;kind='fuzzy';continue;}}
  return {rank:-1,kind:'none'};
 }
 return {rank:(kind==='exact'?1000:kind==='synonym'?500:100)+total,kind};
}
function rank(prepared,fields,initialsMatch){return analyze(prepared,fields,initialsMatch).rank;}
const api=Object.freeze({normalize,prepare,rank,analyze,distance});root.AVENQIR_ATLAS_SEARCH=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
