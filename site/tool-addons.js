"use strict";
/* Pure client-side text + color utilities. No network requests. */
(() => {
  const $=id=>document.getElementById(id);
  if(!$('codecInput')||!$('colorHex'))return;
  const msg=(id,s)=>{$(id).textContent=s;};
  const encode64=s=>{
    const bytes=new TextEncoder().encode(s);
    let b='';for(let i=0;i<bytes.length;i+=8192)b+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(b);
  };
  const decode64=s=>{
    if(s.length>80000)throw Error('Base64 输入过长');
    const trimmed=s.replace(/\s+/g,'');
    if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(trimmed))throw Error('Base64 语法无效');
    const raw=atob(trimmed);
    const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  };
  function transform(type){
    const v=$('codecInput').value;
    if(v.length>30000){msg('codecStatus','文本超过 30,000 字符限制');return;}
    try{
      const output=type==='b64e'?encode64(v):type==='b64d'?decode64(v):type==='urle'?encodeURIComponent(v):decodeURIComponent(v);
      $('codecOutput').value=output;
      msg('codecStatus','转换完成（纯本地），结果长度 '+output.length+' 字符。');
    }catch(e){$('codecOutput').value='';msg('codecStatus','转换失败：'+String(e.message||e).slice(0,130));}
  }
  for(const [id,type] of [['codecB64Encode','b64e'],['codecB64Decode','b64d'],['codecUrlEncode','urle'],['codecUrlDecode','urld']]){
    $(id).addEventListener('click',()=>transform(type));
  }
  $('codecCopy').addEventListener('click',async()=>{
    try{
      if(!$('codecOutput').value)throw Error('没有可复制的内容');
      await navigator.clipboard.writeText($('codecOutput').value);
      msg('codecStatus','结果已复制到剪贴板。');
    }catch(e){msg('codecStatus','复制未完成，可长按选择结果框手动复制。');}
  });
  $('codecReset').addEventListener('click',()=>{$('codecInput').value='';$('codecOutput').value='';msg('codecStatus','已清空。');});
  const hexColor=value=>{
    const raw=value.trim().replace(/^#/,'');
    if(/^[0-9a-f]{3}$/i.test(raw))return '#'+raw.split('').map(c=>c+c).join('').toLowerCase();
    if(/^[0-9a-f]{6}$/i.test(raw))return '#'+raw.toLowerCase();
    throw Error('请输入 #RGB 或 #RRGGBB 颜色值');
  };
  const hsl=([r,g,b])=>{
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let h=0,s=0;const l=(max+min)/2;
    if(delta){
      s=delta/(1-Math.abs(2*l-1));
      switch(max){
        case r:h=((g-b)/delta)%6;break;
        case g:h=(b-r)/delta+2;break;
        default:h=(r-g)/delta+4;
      }
      h=(h*60+360)%360;
    }
    return [Math.round(h),Math.round(s*100),Math.round(l*100)];
  };
  const addRow=(root,title,value)=>{
    const line=document.createElement('div');line.className='record';
    const a=document.createElement('strong');a.textContent=title;
    const b=document.createElement('p');b.textContent=value;
    line.append(a,b);root.append(line);
  };
  function convert(){
    try{
      const hex=hexColor($('colorHex').value);
      const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
      const hs=hsl(rgb),output=$('colorOutput');
      output.replaceChildren();
      addRow(output,'HEX',hex);
      addRow(output,'RGB','rgb('+rgb.join(', ')+')');
      addRow(output,'HSL','hsl('+hs[0]+', '+hs[1]+'%, '+hs[2]+'%)');
      $('colorHex').value=hex;$('colorPicker').value=hex;
      $('colorSample').style.backgroundColor=hex;
      msg('colorStatus','颜色换算完成。');
    }catch(e){msg('colorStatus',String(e.message||e));}
  }
  $('colorConvert').addEventListener('click',convert);
  $('colorPicker').addEventListener('input',()=>{$('colorHex').value=$('colorPicker').value;convert();});
  $('colorHex').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();convert();}});
  $('colorCopy').addEventListener('click',async()=>{
    try{const hex=hexColor($('colorHex').value);await navigator.clipboard.writeText(hex);msg('colorStatus','HEX 已复制。');}
    catch(e){msg('colorStatus','复制失败或 HEX 格式不正确。');}
  });
  convert();
})();
