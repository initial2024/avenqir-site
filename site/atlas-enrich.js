"use strict";
/* Local-only editorial classification and language matching. Not a security or website-content scan. */
(function(root){
 const UNKNOWN='待分类';
 const accepted=new Set([
  'zh-Hans','zh-Hant','en','ja','ko','fr','de','es','pt','it','nl','sv','no','da','fi','pl','cs','sk','hu',
  'ro','bg','hr','sr','sl','el','ru','uk','tr','ar','he','fa','hi','bn','ur','th','vi','id','ms','fil','af'
 ]);
 const domains=Object.freeze([
  ['github.com','开源项目'],['gitlab.com','开源项目'],['codeberg.org','开源项目'],['developer.mozilla.org','前端开发'],
  ['w3.org','前端开发'],['npmjs.com','开发'],['pypi.org','开发'],['stackoverflow.com','开发'],
  ['arxiv.org','学术'],['scholar.google.com','学术'],['pubmed.ncbi.nlm.nih.gov','学术'],
  ['sciencedirect.com','学术'],['nature.com','科研'],['researchgate.net','科研'],
  ['materialsproject.org','材料'],['mpds.io','材料'],['matweb.com','材料'],['webbook.nist.gov','化学'],
  ['desmos.com','数学'],['geogebra.org','数学'],['wolframalpha.com','数学'],
  ['openstreetmap.org','地图'],['amap.com','地图'],['map.baidu.com','地图'],['map.naver.com','地图'],
  ['huggingface.co','AI官网'],['openai.com','AI官网'],['anthropic.com','AI官网'],['deepmind.google','AI官网'],
  ['midjourney.com','AI绘图'],['ideogram.ai','AI绘图'],['runwayml.com','AI视频'],['pika.art','AI视频'],
  ['elevenlabs.io','AI语音'],['suno.com','AI语音'],['cursor.com','AI编程'],['aider.chat','AI编程'],
  ['weather.gov','环境气候'],['weather.gov.sg','环境气候'],['jma.go.jp','环境气候'],
  ['wikipedia.org','阅读'],['gutenberg.org','阅读'],['archive.org','互联网']
 ]);
 const rules=[
  ['AI编程',/\b(copilot|code assistant|ai coding|agentic coding)\b|智能编程|代码助手/i],
  ['AI绘图',/\b(image generat(or|ion)|text.to.image|stable diffusion)\b|文生图|ai绘图|图像生成/i],
  ['AI视频',/\b(video generat(or|ion)|text.to.video)\b|视频生成|文生视频/i],
  ['AI语音',/\b(text.to.speech|speech synthesis|voice clon(e|ing))\b|语音合成|配音生成/i],
  ['AI研究',/\b(ai research|literature review|scientific assistant)\b|智能科研|论文助手/i],
  ['网络',/\b(dns|ipv6|ip address|traceroute|network diagnostics)\b|网络诊断|域名解析/i],
  ['安全',/\b(cybersecurity|security audit|vulnerability|phishing)\b|网络安全|漏洞检测|安全配置/i],
  ['数据库',/\b(database|postgresql|mysql|sqlite)\b|数据库/i],
  ['前端开发',/\b(html|css|frontend|web components)\b|前端开发/i],
  ['运维部署',/\b(devops|deployment|serverless|cloud hosting)\b|部署|容器编排/i],
  ['材料',/\b(materials science|crystal structure|materials engineering)\b|材料科学|晶体结构|材料性能/i],
  ['化学',/\b(chemistry|chemical database|molecule)\b|化学物性|分子结构|化学数据库/i],
  ['数学',/\b(mathematics|graphing calculator|math solver)\b|数学公式|函数绘图|数学计算/i],
  ['学术',/\b(academic papers?|scholarly|preprint|citation search|research papers?)\b|学术论文|论文检索|学术搜索/i],
  ['地图',/\b(maps?|geospatial|gis|routing maps)\b|地图导航|地图数据/i],
  ['教育',/\b(online courses?|open courseware|learning platform)\b|公开课程|课程资源/i],
  ['旅游出行',/\b(train tickets?|railway|public transit|transportation)\b|铁路客运|交通出行|火车时刻/i],
  ['新闻',/\b(news|journalism|newspaper)\b|新闻媒体|新闻报道/i]
 ];
 function normalizeLang(input){
  if(typeof input!=='string')return null;
  const raw=input.trim().replace(/_/g,'-').toLowerCase();
  if(!raw||raw.length>45)return null;
  if(raw==='zh'||raw.startsWith('zh-cn')||raw.startsWith('zh-sg')||raw.startsWith('zh-hans'))return 'zh-Hans';
  if(raw.startsWith('zh-tw')||raw.startsWith('zh-hk')||raw.startsWith('zh-mo')||raw.startsWith('zh-hant'))return 'zh-Hant';
  let code=raw.split('-')[0];
  if(code==='nb'||code==='nn')code='no';
  if(code==='tl')code='fil';
  return accepted.has(code)?code:null;
 }
 function explicitLanguages(item){
  const entries=Array.isArray(item?.languages)?item.languages:
   typeof item?.languages==='string'?item.languages.split(','):
   item?.language?[item.language]:[];
  const valid=[];
  for(const entry of entries){const lang=normalizeLang(entry);if(lang&&!valid.includes(lang))valid.push(lang);}
  return valid.slice(0,8);
 }
 function urlLanguages(raw){
   let path;
   try{
     const u=new URL(raw);
     // A locale path is strong evidence about this URL, not a site-wide language claim.
     path=u.pathname.split('/').filter(Boolean)[0]||'';
     if(!path)return [];
     if(!/^(?:[a-z]{2,3}(?:-[a-z]{2,4})?|zh-(?:cn|tw|hk|hans|hant))$/i.test(path))return [];
     const code=normalizeLang(path);
     return code?[code]:[];
   }catch{return [];}
 }
 function languages(item){
  const explicit=explicitLanguages(item);
  if(explicit.length)return {values:explicit,source:'explicit'};
  const path=urlLanguages(item?.url);
  if(path.length)return {values:path,source:'url-path'};
  return {values:[],source:'unknown'};
 }
 function suggestCategory(item){
  if(!item||typeof item.url!=='string')return {category:UNKNOWN,confidence:'none',reason:'missing URL'};
  let hostname;
  try{hostname=new URL(item.url).hostname.toLowerCase();}catch{return {category:UNKNOWN,confidence:'none',reason:'invalid URL'};}
  // Only exact domains or child domains of established editorial categories.
  for(const [domain,category] of domains){
   if(hostname===domain||hostname.endsWith('.'+domain))
     return {category,confidence:'high',reason:'domain:'+domain};
  }
  const context=[item.name,item.description].filter(x=>typeof x==='string').join(' ').slice(0,700);
  const choices=rules.filter(([,pattern])=>pattern.test(context)).map(([category])=>category);
  if(choices.length===1)return {category:choices[0],confidence:'medium',reason:'keyword'};
  return {category:UNKNOWN,confidence:'none',reason:choices.length?'ambiguous':'insufficient evidence'};
 }
 function enrich(item){
  if(!item||typeof item!=='object')return item;
  const category=typeof item.category==='string'?item.category.trim():'';
  const suggestion=category&&category!==UNKNOWN?null:suggestCategory(item);
  const out={...item,category:category&&category!==UNKNOWN?category:(suggestion?.category||UNKNOWN)};
  const known=languages(item);
  out.languages=known.values;
  out.languageSource=known.source;
  out.categorySource=category&&category!==UNKNOWN?'editor':suggestion.confidence;
  return out;
 }
 function priority(item,desired){
  const selected=normalizeLang(desired);
  if(!selected)return 1;
  const langs=languages(item).values;
  if(langs.includes(selected))return 0;
  if(langs.length===0)return 1;
  if(langs.includes('en'))return 2;
  return 3;
 }
 const api=Object.freeze({UNKNOWN,normalizeLang,urlLanguages,explicitLanguages,languages,suggestCategory,enrich,priority,accepted:Object.freeze([...accepted])});
 root.AVENQIR_ATLAS_ENRICH=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
