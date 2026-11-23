"use strict";
/* Counts always come from the same catalog loaded by the directory page. */
(() => {
 const nodes=[...document.querySelectorAll('[data-aq-catalog-summary]')];
 if(!nodes.length)return;
 const catalog=window.AVENQIR_ATLAS_CATALOG;
 const paths=window.AVENQIR_ATLAS_PATHS;
 if(!catalog||!paths){for(const n of nodes)n.textContent='公开网址 · 点击查看目录';return;}
 let latest={items:catalog.catalog(),remote:false};
 function apply(info){
  latest=info;
  const total=info.items.length;
  const count=new Set(info.items.map(x=>x.category)).size;
  const lang=window.AVENQIR_I18N?.locale||'en';
  const other=!lang.startsWith('zh-');
  const text=other?
    total+' curated sites · '+count+' categories · '+paths.flows.length+' guided tasks':
    total+' 个精选网址 · '+count+' 个分类 · '+paths.flows.length+' 条任务路径';
  nodes.forEach(node=>{node.textContent=text;node.title=other?
    (info.remote?'Includes public backend entries, deduplicated':'Built-in directory, backend unavailable'):
    (info.remote?'含服务器公开数据，按实际去重计数':'当前内置精选目录，后台数据暂不可用');});
 }
 window.addEventListener('aq:language-change',()=>apply(latest));
 apply(latest);
 catalog.load().then(apply).catch(()=>{});
})();
