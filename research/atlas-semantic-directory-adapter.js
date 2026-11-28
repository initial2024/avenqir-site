"use strict";
// Research directory adapter. This does not replace the production script until release review.
(function(root){
 const scriptURL=new URL(document.currentScript.src),baseURL=new URL('.',scriptURL),PREF='avenqir.semantic.preference.v2';
 const spec=root.AVENQIR_RESEARCH_MANIFEST,locales=root.AVENQIR_RESEARCH_SEMANTIC_LOCALE;
 function mount(onChange,t,getItems){
  const $=id=>document.getElementById(id),panel=$('atlasSemanticPanel'),open=$('atlasSemanticOpen');
  if(!panel||!open||!spec||!locales||typeof getItems!=='function')return null;
  // Only the runtime follows the candidate revision; the immutable model URL does not.
  const workerURL=new URL('atlas-search-worker.js',baseURL);
  const revision=scriptURL.searchParams.get('v');
  if(/^154-[a-f0-9]{16}$/.test(revision||''))workerURL.searchParams.set('v',revision);
  const loader=root.AVENQIR_RESEARCH_LOADER.create([{...spec,file:new URL(spec.file,baseURL).href}]);
  let busy=false,phase='idle',error='',session=null,persisted=false,offered=false,bytes=0,rate=0,lastItems=null,lastQuery='',result=null,serial=0,rankTimer=null,suggested=null;
  const pref=()=>{try{return localStorage.getItem(PREF)||'';}catch{return '';}};
  const save=v=>{try{localStorage.setItem(PREF,v);}catch{}};
  const lang=()=>locales.get(root.AVENQIR_I18N?.locale||'en');
  // Candidate-only UI: never rewrite a query until a real user selects the
  // reviewed replacement. Both ordinary results and filters take precedence.
  const input=$('atlasQuery'),form=$('atlasForm'),dialog=$('atlasNoMatchDialog');
  const suggestionViews=[];
  function makeSuggestionView(id,anchor){
   if(!anchor||!input||!form)return;
   const box=document.createElement('div');box.id=id;box.hidden=true;
   const label=document.createElement('span');label.id=id+'Label';
   const button=document.createElement('button');button.type='button';button.className='btn ghost';
   button.setAttribute('aria-describedby',label.id);button.dir='ltr';button.lang='en';
   box.append(label,document.createTextNode(' '),button);
   anchor.before(box);suggestionViews.push({box,label,button});
   button.addEventListener('click',()=>{
    if(!suggested||!canSuggest()||box.hidden)return;
    const phrase=suggested.phrase;
    if(dialog?.open)dialog.close();
    resetRank();input.value=phrase;form.requestSubmit();
   });
  }
  function canSuggest(){
   return !!session&&!!suggested&&!!result&&result.size===0&&!!lastQuery&&input?.value.trim()===lastQuery.trim()&&
    $('atlasEmpty')?.hidden===false&&$('atlasFilteredHint')?.hidden!==false;
  }
  function drawSuggestions(){
   const visible=canSuggest();
   for(const {box,label,button} of suggestionViews){
    box.hidden=!visible;
    label.textContent=lang().suggestion;
    button.textContent=visible?suggested.phrase:'';
   }
  }
  makeSuggestionView('atlasSemanticSuggestion',$('atlasQuickCategories'));
  makeSuggestionView('atlasSemanticDialogSuggestion',dialog?.querySelector('.atlas-no-match-actions'));
  input?.addEventListener('input',()=>{suggested=null;drawSuggestions();});
  input?.addEventListener('compositionstart',()=>{suggested=null;drawSuggestions();});
  // Result visibility can change independently through filters or lexical
  // matching. Observe only the two flags, not the rendered result subtree.
  if(root.MutationObserver){
   const observer=new MutationObserver(drawSuggestions);
   for(const node of [$('atlasEmpty'),$('atlasFilteredHint')])if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});
  }
  function format(n){return (n/1024).toFixed(1)+' KiB';}
  function draw(){
   const l=lang();panel.dataset.state=phase;
   open.textContent=session?l.on:l.title;
   $('atlasSemanticTitle').textContent=l.title;$('atlasSemanticNote').textContent=l.note;
   $('atlasSemanticSize').textContent=format(spec.bytes)+' ('+spec.bytes.toLocaleString()+' B)';
   $('atlasSemanticStatus').textContent=phase==='ready'?(persisted?l.ready:l.session):phase==='error'?l.error+' ['+error+']':busy?l.loading:phase==='cancelled'?l.cancel:'';
   const progress=$('atlasSemanticProgress');progress.max=spec.bytes;progress.value=bytes;progress.hidden=!busy&&phase!=='ready';progress.setAttribute('aria-label',l.loading);
   $('atlasSemanticDetail').textContent=busy||phase==='ready'?format(bytes)+' / '+format(spec.bytes)+' · '+Math.floor(bytes/spec.bytes*100)+'%'+(rate>0?' · '+format(rate)+'/s':''):'';
   for(const [id,key,hidden] of [['atlasSemanticDownload','download',busy||!!session],['atlasSemanticLater','later',busy||!!session],['atlasSemanticCancel','cancel',!busy],['atlasSemanticRemove','remove',busy||(!session&&pref()!=='enabled'&&!persisted)],['atlasSemanticClose','close',false]]){const e=$(id);e.textContent=l[key];e.hidden=hidden;}
  }
  function resetRank(){clearTimeout(rankTimer);rankTimer=null;lastQuery='';result=null;suggested=null;drawSuggestions();}
  function workerFailure(id,code='worker'){if(id!==serial)return;serial++;session?.close();session=null;resetRank();phase='error';error=code;draw();notify();}
  function notify(){onChange?.();drawSuggestions();}
  function show(){panel.hidden=false;draw();}
  function offer(){if(!offered&&!session&&!busy&&pref()!=='declined'){offered=true;show();}}
  function scores(q,items){
   if(!q.trim()){resetRank();return null;}
   if(!session||!items?.length)return null;
   if(lastItems!==items){lastItems=items;resetRank();session.replaceCatalog(items);}
   if(lastQuery!==q){resetRank();lastQuery=q;const id=serial;rankTimer=setTimeout(()=>workerFailure(id,'worker_timeout'),8000);session.query(q);}
   return result;
  }
  async function begin(restore=false){
   if(busy||session)return;
   busy=true;phase=restore?'checking':'downloading';error='';bytes=0;rate=0;const id=++serial;draw();
   let next=null;
   try{
    const state=await loader.load({consent:true,restore,onProgress:p=>{if(id===serial){bytes=p.bytes;rate=p.rate;draw();}},activate:async(values,signal)=>{
     const items=getItems();
     next=await root.AVENQIR_RESEARCH_ACTIVATION.activate({values,items,signal,workerURL:workerURL.href,onResult:(urls,q,ms,suggestions)=>{
      if(id!==serial||!session||q!==lastQuery)return;
      clearTimeout(rankTimer);rankTimer=null;result=new Map(urls.map((url,i)=>[url,1.99-i*.02]));suggested=!urls.length&&suggestions?.length===1?suggestions[0]:null;notify();
     },onError:()=>workerFailure(id)});
     lastItems=items;return next;
    }});
    // A worker can fail after its ready acknowledgement but during cache finalization.
    // Do not resurrect a closed session or retain the failed activation's cache.
    if(id!==serial){next?.close();try{await loader.remove();persisted=false;}catch{error='storage';}return;}
    if(state.state==='missing'){phase='idle';persisted=false;save('');return;}
    session=next;persisted=state.persisted;bytes=spec.bytes;rate=0;phase='ready';save(persisted?'enabled':'');resetRank();notify();
   }catch(e){if(id===serial){phase=e.message==='cancelled'?'cancelled':'error';error=String(e.message||'load');if(restore&&e.message!=='cancelled')save('');}bytes=0;rate=0;}
   finally{busy=false;draw();if(!session)notify();}
  }
  open.addEventListener('click',()=>{panel.hidden?show():panel.hidden=true;});
  $('atlasSemanticClose').addEventListener('click',()=>{panel.hidden=true;});
  $('atlasSemanticLater').addEventListener('click',()=>{save('declined');offered=true;panel.hidden=true;});
  $('atlasSemanticDownload').addEventListener('click',()=>begin(false));
  $('atlasSemanticCancel').addEventListener('click',()=>loader.cancel());
  $('atlasSemanticRemove').addEventListener('click',async()=>{
   if(busy||!root.confirm(lang().confirm))return;serial++;session=null;resetRank();save('declined');busy=true;phase='idle';bytes=0;notify();draw();
   try{await loader.remove();persisted=false;}catch{phase='error';error='storage';persisted=true;}finally{busy=false;draw();}
  });
  root.addEventListener('aq:language-change',()=>{draw();drawSuggestions();});draw();
  // Defer restoration until the directory finishes initializing its own bindings.
  if(pref()==='enabled')Promise.resolve().then(()=>begin(true));
  return Object.freeze({show,offer,scores,pending(q,items){return !!q.trim()&&((busy&&phase==='checking')||!!session&&lastItems===items&&lastQuery===q&&result===null);},active:()=>!!session});
 }
 root.AVENQIR_SEMANTIC_DOWNLOAD=Object.freeze({mount});
})(window);
