"use strict";
/* Local first textual matching. CJK initials are best-effort, not a full pronunciation lexicon. */
(function(root){
 const collator=typeof Intl==='object'&&Intl.Collator?new Intl.Collator('zh-CN-u-co-pinyin'):null;
 const bounds=[...'阿八擦搭蛾发噶哈击喀拉妈拿哦啪期然撒塌挖昔压匝'];
 const letters=[...'abcdefghjklmnopqrstwxyz'];
 const corrected={
   '料':'l','络':'l','行':'x','重':'z','长':'c','乐':'l','和':'h',
   '签':'q','书':'s','网':'w','材':'c','图':'t','数':'s','学':'x',
   '浏':'l','览':'l','器':'q','收':'s','藏':'c','导':'d','入':'r','出':'c',
   '移':'y','动':'d','备':'b','份':'f','安':'a','全':'q','证':'z',
   '官':'g','方':'f','网':'w','站':'z','研':'y','究':'j','地':'d','区':'q',
   '科':'k','技':'j','资':'z','讯':'x','英':'y','语':'y','阅':'y','读':'d',
   '材':'c','化':'h','试':'s','测':'c','数':'s','据':'j','库':'k',
   '快':'k','速':'s','搜':'s','索':'s','工':'g','具':'j','统':'t','计':'j',
   '编':'b','程':'c','项':'x','目':'m','设':'s','计':'j','开':'k','发':'f',
   '文':'w','章':'z','链':'l','接':'j','图':'t','片':'p','保':'b','存':'c',
   '音':'y','频':'p','视':'s','绘':'h','画':'h','学':'x','习':'x',
   '电':'d','子':'z','物':'w','理':'l','机':'j','械':'x','工':'g',
   '运':'y','维':'w','部':'b','署':'s','问':'w','题':'t','解':'j','决':'j'
 };
 const cache=Object.create(null);
 const normalize=x=>String(x||'').normalize('NFKC').toLocaleLowerCase().trim();
 function initial(ch){
  if(/[a-z0-9]/i.test(ch))return ch.toLowerCase();
  if(!/\p{Script=Han}/u.test(ch))return '';
  if(Object.prototype.hasOwnProperty.call(cache,ch))return cache[ch];
  if(Object.prototype.hasOwnProperty.call(corrected,ch))return cache[ch]=corrected[ch];
  if(!collator)return '';
  let n=0;while(n<bounds.length-1&&collator.compare(ch,bounds[n+1])>=0)n++;
  return cache[ch]=letters[n]||'';
 }
 function initials(text){
  return Array.from(String(text||'')).map(initial).join('');
 }
 function matches(query,fields){
  const parts=normalize(query).split(/\s+/).filter(Boolean).slice(0,8);
  if(!parts.length)return true;
  const values=fields.map(normalize);
  return parts.every(term=>values.some(x=>x.includes(term))||(
   /^[a-z]{2,20}$/.test(term)&&fields.some(x=>initials(x).includes(term))
  ));
 }
 const api=Object.freeze({normalize,initials,matches});
 root.AVENQIR_ATLAS_FIND=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
