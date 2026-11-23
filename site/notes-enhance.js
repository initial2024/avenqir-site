"use strict";
/* Minimal, safe Markdown preview: never interpolate notebook text into HTML. */
(()=>{
  const body=document.getElementById('noteBody');
  const preview=document.getElementById('noteMarkdownPreview');
  const toggle=document.getElementById('notePreviewToggle');
  if(!body||!preview||!toggle)return;
  const inline=(line,parent)=>{
    const expr=/(\*\*([^*]+)\*\*|\*([^*]+)\*|\x60([^\x60]+)\x60)/g;
    let start=0,match;
    while((match=expr.exec(line))!==null){
      if(match.index>start)parent.append(document.createTextNode(line.slice(start,match.index)));
      const node=document.createElement(match[2]?'strong':match[3]?'em':'code');
      node.textContent=match[2]||match[3]||match[4];
      parent.append(node);start=match.index+match[0].length;
    }
    if(start<line.length)parent.append(document.createTextNode(line.slice(start)));
  };
  const render=()=>{
    if(preview.hidden)return;
    const lines=body.value.slice(0,30000).replace(/\r\n?/g,'\n').split('\n').slice(0,650);
    preview.replaceChildren();
    let inCode=false,pre=null;
    for(const line of lines){
      if(/^\x60{3}/.test(line)){
        if(inCode){inCode=false;pre=null;}else{inCode=true;pre=document.createElement('pre');preview.append(pre);}
        continue;
      }
      if(inCode){pre.textContent+=line+'\n';continue;}
      if(!line.trim())continue;
      const heading=line.match(/^(#{1,3})\s+(.+)$/);
      const bullet=line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
      const quote=line.match(/^\s*>\s?(.*)$/);
      const type=heading?'h'+heading[1].length:quote?'blockquote':bullet?'p':'p';
      const node=document.createElement(type);
      if(bullet){node.className='aq-note-bullet';node.append(document.createTextNode('• '));}
      inline(heading?heading[2]:quote?quote[1]:bullet?bullet[1]:line,node);
      preview.append(node);
    }
    if(!preview.childNodes.length){const p=document.createElement('p');p.textContent='当前笔记没有可预览内容。';preview.append(p);}
  };
  toggle.addEventListener('click',()=>{
    const show=preview.hidden;
    preview.hidden=!show;
    toggle.textContent=show?'关闭 Markdown 预览':'Markdown 安全预览';
    toggle.setAttribute('aria-expanded',String(show));
    if(show)render();
  });
  window.avenqirRefreshNotePreview=render;
  body.addEventListener('input',render);
})();