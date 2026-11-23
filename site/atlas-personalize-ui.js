"use strict";
/* UI only; recommender has no fetch, beacon, third-party scripts or backend endpoint. */
(function(root){
 const engine=root.AVENQIR_LOCAL_RECOMMEND;
 function mount({items,favorites,open,reviewed}){
  if(!engine||typeof document==='undefined')return null;
  const $=id=>document.getElementById(id);
  const toggle=$('atlasLocalToggle'),body=$('atlasLocalBody'),categories=$('atlasLocalCategories'),cards=$('atlasLocalCards'),status=$('atlasLocalStatus'),clear=$('atlasLocalClear');
  if(!toggle||!body||!categories||!cards||!status||!clear)return null;
  let storage=null;try{storage=root.localStorage;}catch{}
  const model=engine.create(storage);
  const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  function render(){
   const state=model.read();toggle.checked=state.enabled;body.hidden=!state.enabled;
   toggle.setAttribute('aria-checked',String(state.enabled));
   if(!state.enabled){
     status.textContent='目前关闭。只有你主动开启后才记录站内目录的分类操作。';
     return;
   }
   status.textContent='仅本机 · 使用记录按分类汇总，60 天自动过期 · 关闭即清除';
   const available=Array.from(new Set(items().map(x=>x.category))).filter(engine.category).sort((a,b)=>a.localeCompare(b,'zh-CN'));
   categories.replaceChildren();
   for(const c of available){
     const selected=state.interests.includes(c);
     const b=el('button','atlas-local-interest'+(selected?' selected':''),(selected?'✓ ':'＋ ')+c);
     b.type='button';b.setAttribute('aria-pressed',String(selected));b.title=selected?'取消这个兴趣':'将此分类加入兴趣';
     b.addEventListener('click',()=>{
       if(!selected&&state.interests.length>=12){status.textContent='最多选择 12 个兴趣分类。';return;}
       if(model.setInterest(c,!selected))render();
       else status.textContent='本机存储不可用；无法保存偏好。';
     });
     categories.append(b);
   }
   cards.replaceChildren();
   const picks=model.recommend(items(),favorites(),6);
   if(!picks.length){
     const box=el('p','atlas-local-empty','还没有足够的本地偏好。请选择感兴趣的分类，或在开启后访问、收藏公开网址。');
     cards.append(box);return;
   }
   for(const {item,reason} of picks){
     const box=el('article','atlas-local-card');
     const top=el('div','atlas-local-card-head');
     const category=el('span','atlas-local-category',item.category);
     const reasonEl=el('small','atlas-local-reason',reason);
     top.append(category,reasonEl);
     const a=el('a','atlas-local-link',item.name+' ↗');
     a.href=reviewed(item.url)?item.url:'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(item.name);
     a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';
     a.addEventListener('click',e=>{
       if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
       e.preventDefault();open(item.url,item.name);
     });
     const desc=el('p','atlas-local-description',item.description);
     const trust=el('small','atlas-local-trust',reviewed(item.url)?'来源已核对（非安全认证）':'第三方来源未核对 · 跳转前确认');
     box.append(top,a,desc,trust);cards.append(box);
   }
  }
  toggle.addEventListener('change',()=>{
    if(toggle.checked){
      if(!model.setEnabled(true)){
        toggle.checked=false;status.textContent='本机存储不可用，已保持关闭，不会记录。';
      }else render();
    }else{
      // Turning off is a privacy action; erase the model automatically.
      model.setEnabled(false);render();
    }
  });
  clear.addEventListener('click',()=>{
    model.setEnabled(false);render();
    status.textContent='已清除本机推荐分类记录并关闭；其他收藏和私人数据不变。';
  });
  render();
  return Object.freeze({render,recordOpen:(c)=>{if(model.record(c,'open'))render();},recordSave:(c)=>{if(model.record(c,'save'))render();}});
 }
 const api=Object.freeze({mount});
 root.AVENQIR_LOCAL_RECOMMEND_UI=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
