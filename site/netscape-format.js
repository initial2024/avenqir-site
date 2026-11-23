"use strict";
/* AVENQIR Netscape Bookmark HTML interchange. Pure text parser: no DOMParser,
   innerHTML, external resource loading, eval, or network requests. */
(function (root) {
  const MAX_BYTES = 1024 * 1024;
  const LIMIT = 200;
  const htmlEsc = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const decode = str => String(str).replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{
    const lower=entity.toLowerCase();
    const common={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    if(Object.prototype.hasOwnProperty.call(common,lower))return common[lower];
    const numeric=lower[1]==='x'?parseInt(lower.slice(2),16):parseInt(lower.slice(1),10);
    return numeric>0 && numeric<=0x10ffff && !(numeric>=0xd800&&numeric<=0xdfff)
      ? String.fromCodePoint(numeric) : '';
  });
  const strip = s => decode(String(s).replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();
  const attribute=(s,key)=>{
    const expr=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i');
    const m=String(s).match(expr);
    return m?decode(m[1]??m[2]??m[3]):null;
  };
  function safeLink(raw) {
    if(typeof raw!=='string'||raw.length>1600)return null;
    try {
      const url=new URL(raw.trim());
      if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password) return null;
      return url.href;
    }catch{return null;}
  }
  function createRecord(name,url,category,at) {
    const href=safeLink(url);
    const title=String(name??'').trim().slice(0,80);
    if(!href||!title) return null;
    return {name:title,url:href,category:String(category||'其他').trim().slice(0,32)||'其他',note:'',
      fav:false,todo:false,custom:true,at:Number.isFinite(at)&&at>0&&at<1e15?at:Date.now()};
  }
  function parse(text) {
    if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('HTML 书签文件超过 1 MB');
    if(!/<!doctype\s+netscape-bookmark-file-1\b|<dt\b|<a\s+href\s*=/i.test(text))throw Error('不是可识别的 Netscape 书签 HTML');
    const tokens=/<\s*(\/?)\s*(DL|H3|A)\b([^>]*)>/gi;
    const stack=[],found=[],urls=new Set();
    let pending=null,capture=null,bad=0,duplicates=0,count=0,tag;
    const done=(type,offset)=>{
      if(!capture||capture.type!==type)return;
      const value=strip(text.slice(capture.start,offset));
      if(type==='H3')pending=value.slice(0,32)||'其他';
      if(type==='A'){
        count++;
        if(count>LIMIT)throw Error('文件包含超过 '+LIMIT+' 个网址，请分批导入');
        const record=createRecord(value,attribute(capture.attrs,'href'),capture.category,
          Number(attribute(capture.attrs,'add_date'))*1000);
        if(!record)bad++;
        else if(urls.has(record.url))duplicates++;
        else {urls.add(record.url);found.push(record);}
      }
      capture=null;
    };
    for(const match of text.matchAll(tokens)){
      const closing=!!match[1],type=match[2].toUpperCase();
      if(closing){
        done(type,match.index);
        if(type==='DL'&&stack.length)stack.pop();
      }else if(type==='DL'){
        stack.push(pending||stack.at(-1)||'其他');
        pending=null;
      }else if(type==='H3'||type==='A'){
        if(capture)continue;
        capture={type,start:match.index+match[0].length,attrs:match[3],
          category:stack.at(-1)||'其他'};
      }
    }
    if(!count)throw Error('文件中没有可导入的网址');
    if(!found.length)throw Error('文件中没有有效的 http/https 网址');
    return {records:found,skipped:bad,duplicates,total:count};
  }
  function exportHTML(links) {
    if(!Array.isArray(links)||links.length>LIMIT)throw Error('书签数量超过上限');
    const groups=new Map();
    for(const x of links){
      const record=createRecord(x?.name,x?.url,x?.category,x?.at);
      if(!record)continue;
      const category=record.category;
      if(!groups.has(category))groups.set(category,[]);
      groups.get(category).push(record);
    }
    const lines=['<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<!-- Generated locally by AVENQIR. No private notes or login data exported. -->',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>AVENQIR Bookmarks</TITLE>','<H1>AVENQIR Bookmarks</H1>','<DL><p>'];
    for(const [category,records] of groups){
      lines.push('    <DT><H3>'+htmlEsc(category)+'</H3>','    <DL><p>');
      for(const r of records)lines.push('        <DT><A HREF="'+htmlEsc(r.url)+'" ADD_DATE="'+Math.floor(r.at/1000)+'">'+htmlEsc(r.name)+'</A>');
      lines.push('    </DL><p>');
    }
    lines.push('</DL><p>');
    return lines.join('\n')+'\n';
  }
  const API=Object.freeze({parse,exportHTML,safeLink,MAX_BYTES,LIMIT});
  root.AVENQIR_NETSCAPE=API;
  if(typeof module==='object'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
