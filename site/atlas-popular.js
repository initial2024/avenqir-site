"use strict";
(function(root){
 const topics=[
  ['ai','🤖','AI 效率','AI tools'],['study','📚','学习神器','Study'],
  ['design','🎨','图片设计','Design'],['world','🌍','有趣地图','Explore the world'],
  ['tools','🧰','在线工具','Online tools'],['play','🎮','摸鱼解压','Take a break'],
  ['network','🛡️','网络自查','Network checks'],['travel','🧭','出行参考','Travel'],
  ['media','🎧','音乐与影音','Music and video'],['developer','⌨️','开发交互','Developer tools'],
  ['reference','📖','开发资料','Developer reference']
 ];
 const tasks=[
  ['ai','我想找 AI 帮忙','Get help from AI',['dA054','dA056','dA055','dA057','dA059','popular26-001']],
  ['study','我想学习','Learn something',['r11','r12','e69','n050','n047','n048','s026']],
  ['slides','我要做 PPT','Make slides',['n078','r10','e79','popular26-056','popular26-057','popular26-037']],
  ['images','我要处理图片','Edit images',['a98','r9','ai88017','ai88019','popular26-050','popular26-051']],
  ['pdf','我要处理 PDF','Work with a PDF',['dB016','dB017','dB018','popular26-066','popular26-065']],
  ['papers','我要查论文','Find research papers',['r13','r14','e64','e63','e35','dB044']],
  ['assets','我要找免费素材','Find free design assets',['r8','n074','n075','e50','r7']],
  ['world','我要看看世界','Explore the world',['dA037','dA069','e42','e40','r15','popular26-084','popular26-086']],
  ['speed','我要测网速','Test my connection',['r21','a101','popular26-128','r17']],
  ['check','我要检查网址','Check a public URL',['r24','e49','e48','e74','r20']],
  ['play','我要放松一下','Take a break',['n072','dB008','dB002','n071','e42','popular26-106']],
  ['random','我不知道干什么，随机看看','Surprise me',[]]
 ];
 const data=root.AVENQIR_ATLAS_POPULAR_PICKS||(typeof require==='function'?require('./atlas-popular-picks.js'):[]);
 function pool(catalog,picks=data){
  const byId=new Map(catalog.map(entry=>[entry.id,entry]));
  return picks.flatMap(pick=>{
   const entry=byId.get(pick.id);
   return entry?[{...pick,entry}]:[];
  });
 }
 function access(url,gate,safety){
  const risk=gate?.urlRisk(url);
  const blocked=!risk||!safety||risk.blocked||safety.threatStatus(url)==='listed';
  const confirmed=!blocked&&!risk.forcePrompt&&gate.officialSourceReviewed(url);
  return {blocked,confirmed};
 }
 function drawRandom(entries,gate,safety,previous,random=Math.random){
  const eligible=entries.filter(({entry,randomSafe})=>randomSafe&&access(entry.url,gate,safety).confirmed);
  const choices=eligible.length>1?eligible.filter(x=>x.entry.id!==previous):eligible;
  return choices[Math.floor(random()*choices.length)]||null;
 }
 const api=Object.freeze({topics,tasks,pool,access,drawRandom});
 root.AVENQIR_ATLAS_POPULAR=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
