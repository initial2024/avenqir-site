"use strict";
(function(root){
 const engine=root.AVENQIR_DOMAIN_EMBEDDING,spec=engine?.SPEC,CACHE='avenqir-semantic-model-v1',PREF='avenqir.semantic.preference.v1';
 function mount(onChange,t){
  if(!engine)return null;
  const $=id=>document.getElementById(id),panel=$('atlasSemanticPanel'),open=$('atlasSemanticOpen');
  if(!panel||!open)return null;
  const size=$('atlasSemanticSize'),status=$('atlasSemanticStatus'),progress=$('atlasSemanticProgress'),detail=$('atlasSemanticDetail'),start=$('atlasSemanticDownload'),later=$('atlasSemanticLater'),cancel=$('atlasSemanticCancel'),remove=$('atlasSemanticRemove'),dismiss=$('atlasSemanticClose');
  const url=new URL(spec.file,location.href).href;
  let model=null,controller=null,phase='idle',busy=false,attempt=0,readBytes=0,rate=0,persisted=false,offered=false,errorKind='',memo=null;
  const getPref=()=>{try{return localStorage.getItem(PREF)||'';}catch{return '';}};
  const setPref=value=>{try{localStorage.setItem(PREF,value);}catch{}};
  const format=n=>n>=1048576?(n/1048576).toFixed(2)+' MiB':(n/1024).toFixed(1)+' KiB';
  const notify=()=>{memo=null;onChange?.();};
  async function verified(bytes){
   if(bytes.byteLength!==spec.bytes||!root.crypto?.subtle)throw Error('integrity');
   const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(hex!==spec.sha256)throw Error('integrity');
   return engine.create(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  }
  function draw(){
   panel.dataset.state=phase;
   open.textContent=model?t('语义搜索已开启','Semantic on'):t('语义搜索','Semantic search');
   $('atlasSemanticTitle').textContent=t('可选：本地语义搜索','Optional: local semantic search');
   size.textContent=t('模型文件：','Model file: ')+format(spec.bytes)+' ('+spec.bytes.toLocaleString()+' B)';
   $('atlasSemanticNote').textContent=t('仅在本机运行的领域向量模型，支持有限的中英文及日文工具意图，不是通用聊天 AI；不保证满足价格、免登录、否定条件等限制。模型不会上传搜索词；不开启也能正常搜索。','A domain-specific embedding runs on device. Limited Chinese, English and Japanese tool intents, not general chat AI; price, login and negative constraints cannot be guaranteed. No queries are sent to a model service. Normal search still works.');
   start.textContent=phase==='error'?t('重试下载','Retry download'):t('下载并启用','Download & enable');
   later.textContent=t('暂不下载','Not now');dismiss.textContent=t('收起','Close');cancel.textContent=t('取消下载','Cancel download');remove.textContent=t('关闭并删除模型','Disable & delete model');
   start.hidden=!!model||busy;later.hidden=!!model||busy;cancel.hidden=!busy||!controller;remove.hidden=!model||busy;
   progress.hidden=!busy&&phase!=='ready';progress.max=spec.bytes;progress.value=readBytes;
   detail.textContent=(busy||phase==='ready')?format(readBytes)+' / '+format(spec.bytes)+' · '+Math.min(100,Math.floor(readBytes/spec.bytes*100))+'% · '+(busy&&rate>0?format(rate)+'/s':phase==='ready'?t('下载完成','Complete'):t('计算速度中','Measuring speed')):'';
   const messages={idle:t('下载需你确认，不会自动开始。','Download requires approval.'),checking:t('正在校验本地模型…','Checking local model…'),downloading:t('正在下载模型…','Downloading model…'),verifying:t('正在校验 SHA-256…','Verifying SHA-256…'),ready:persisted?t('已启用 · 本机缓存可离线复用','Enabled · cached for offline reuse'):t('已启用 · 本次会话可用，未保存到浏览器缓存','Enabled for this session; cache unavailable'),error:errorKind==='integrity'?t('模型校验失败；普通搜索仍可用。','Integrity check failed; normal search still works.'):t('下载、加载或存储操作失败；普通搜索仍可用。','Download, load or storage operation failed; normal search still works.'),cancelled:t('已取消，未保存不完整模型。','Cancelled; no partial model stored.')};
   status.textContent=messages[phase]||messages.idle;
  }
  function show(){panel.hidden=false;draw();}
  function offer(){if(!offered&&!model&&!busy&&getPref()!=='declined'){offered=true;show();}}
  function close(){panel.hidden=true;}
  open.addEventListener('click',()=>{if(panel.hidden)show();else close();});
  later.addEventListener('click',()=>{setPref('declined');offered=true;close();});dismiss.addEventListener('click',close);
  function stop(){attempt++;controller?.abort();controller=null;busy=false;phase='cancelled';readBytes=0;rate=0;draw();}
  cancel.addEventListener('click',stop);
  async function restore(){
   if(getPref()!=='enabled'||!root.caches)return;
   const id=++attempt;busy=true;phase='checking';draw();
   try{const cache=await caches.open(CACHE),response=await cache.match(url);
    if(!response){if(id===attempt)phase='idle';return;}
    const loaded=await verified(await response.arrayBuffer());if(id!==attempt)return;
    model=loaded;persisted=true;readBytes=spec.bytes;phase='ready';notify();
   }catch{if(id===attempt){phase='idle';try{await caches.delete(CACHE);}catch{}}}
   finally{if(id===attempt){busy=false;draw();}}
  }
  async function download(){
   if(busy||model)return;
   const id=++attempt,ctl=new AbortController(),signal=ctl.signal;controller=ctl;busy=true;phase='downloading';readBytes=0;rate=0;errorKind='';show();
   const started=performance.now(),deadline=setTimeout(()=>ctl.abort(),45000);
   let reader;
   try{
    const res=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal,referrerPolicy:'no-referrer'});
    if(!res.ok||!res.body?.getReader||!String(res.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw Error('download');
    reader=res.body.getReader();const bytes=new Uint8Array(spec.bytes);
    while(true){const {done,value}=await reader.read();if(id!==attempt||signal.aborted)throw Error('cancelled');if(done)break;
     if(readBytes+value.byteLength>spec.bytes)throw Error('integrity');
     bytes.set(value,readBytes);readBytes+=value.byteLength;rate=readBytes/Math.max(.05,(performance.now()-started)/1000);draw();}
    if(readBytes!==spec.bytes)throw Error('integrity');
    phase='verifying';draw();const loaded=await verified(bytes.buffer);
    if(id!==attempt||signal.aborted)throw Error('cancelled');
    // Publish only a fully verified model. Cache writes cannot be cancelled, so
    // disable the cancel button during this short, atomic finalization.
    controller=null;draw();let saved=false;
    try{if(root.caches){const c=await caches.open(CACHE);await c.put(url,new Response(bytes,{headers:{'Content-Type':'application/json'}}));saved=true;}}catch{}
    model=loaded;persisted=saved;phase='ready';setPref('enabled');notify();
   }catch(e){if(id===attempt){phase=signal.aborted?'cancelled':'error';errorKind=e.message;readBytes=0;rate=0;}}
   finally{clearTimeout(deadline);try{await reader?.cancel();}catch{}if(id===attempt){busy=false;controller=null;draw();}}
  }
  start.addEventListener('click',download);
  remove.addEventListener('click',async()=>{
   if(busy||!confirm(t('关闭本地语义搜索并删除已下载模型？','Disable semantic search and delete the downloaded model?')))return;
   model=null;persisted=false;setPref('declined');phase='idle';readBytes=0;rate=0;busy=true;notify();draw();
   try{if(root.caches)await caches.delete(CACHE);}catch{phase='error';errorKind='storage';}
   finally{busy=false;draw();}
  });
  root.addEventListener('aq:language-change',draw);
  draw();restore();
  return Object.freeze({offer,show,active:()=>!!model,scores(query,items){
    if(!model||!query.trim())return null;
    if(memo?.query===query&&memo.items===items)return memo.value;
    const value=model.rank(query,items);memo={query,items,value};return value;
  }});
 }
 root.AVENQIR_SEMANTIC_DOWNLOAD=Object.freeze({mount});
})(window);
