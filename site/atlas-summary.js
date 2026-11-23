"use strict";
/* Counts always come from the same catalog loaded by the directory page. */
(() => {
 const nodes=[...document.querySelectorAll('[data-aq-catalog-summary]')];
 if(!nodes.length)return;
 const catalog=window.AVENQIR_ATLAS_CATALOG;
 const paths=window.AVENQIR_ATLAS_PATHS;
 if(!catalog||!paths){for(const n of nodes)n.textContent='公开网址 · 点击查看目录';return;}
 function apply(info){
  const total=info.items.length;
  const text=total+' 个精选网址 · '+paths.flows.length+' 条任务路径';
  nodes.forEach(node=>{node.textContent=text;node.title=info.remote?'含服务器公开数据，按实际去重计数':'当前内置精选目录，后台数据暂不可用';});
 }
 apply({items:catalog.catalog(),remote:false});
 catalog.load().then(apply).catch(()=>{});
})();
