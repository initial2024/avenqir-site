#!/usr/bin/env python3
"""Actual directory UI with full v2 candidate injected only into localhost QA."""
import http.server, pathlib, shutil, subprocess, tempfile, threading, time, sys, atexit, socket, hashlib, re
from urllib.parse import urlsplit
SITE=pathlib.Path(__file__).resolve().parents[1]/'site'
CHROME=shutil.which('google-chrome') or shutil.which('chromium')
FIREFOX='--firefox' in sys.argv
if not FIREFOX: assert CHROME
ROOT=SITE.parent
PACKAGED='--packaged' in sys.argv
if PACKAGED:
    staging=tempfile.TemporaryDirectory(prefix='avenqir-v154-site-')
    atexit.register(staging.cleanup)
    SITE=pathlib.Path(staging.name)/'site'
    subprocess.run(['node',str(ROOT/'scripts'/'build_semantic_candidate.cjs'),str(SITE)],check=True)
    MODEL=(ROOT/'research'/'atlas-semantic-bundle-v2.json').read_bytes()
    hosted_name='atlas-semantic-bundle-v2-'+hashlib.sha256(MODEL).hexdigest()[:24]+'.json'
    MODEL_PATH='/semantic-v2/'+hosted_name
    assert (SITE/MODEL_PATH.lstrip('/')).read_bytes()==MODEL
    assert not (SITE/'semantic-v2'/'atlas-semantic-bundle-v2.json').exists()
    DIRECTORY=(SITE/'directory.html').read_text(encoding='utf-8')
else:
    MODEL=(ROOT/'research'/'atlas-semantic-bundle-v2.json').read_bytes()
    MODEL_PATH='/research/atlas-semantic-bundle-v2.json'
    CANDIDATE_SCRIPTS=['atlas-semantic-manifest.js','atlas-semantic-locales.js','atlas-candidate-loader.js','atlas-worker-client.js','atlas-model-codec.js','atlas-unicode-runtime.js','atlas-multilingual-intents.js','atlas-multilingual-topics.js','atlas-retrieval-runtime.js','atlas-search-worker.js','atlas-worker-activation.js','atlas-semantic-directory-adapter.js']
    DIRECTORY=(SITE/'directory.html').read_text(encoding='utf-8').replace('<script src="atlas-semantic-download.js?v=150" defer></script>',''.join('<script src="/research/'+x+'" defer></script>' for x in CANDIDATE_SCRIPTS))
assert 'atlas-semantic-directory-adapter.js' in DIRECTORY
DIRECTORY_JS=(SITE/'directory.js').read_text(encoding='utf-8')
assert 'T,()=>records);' in DIRECTORY_JS
requests=[]
runtime_requests=[]
mode='bad'
FIXTURE="""<!doctype html><title>Model QA</title><iframe id="frame" style="width:390px;height:844px;border:0" src="/directory.html"></iframe><script>
const wait=async f=>{for(let i=0;i<400;i++){if(f())return;await new Promise(r=>setTimeout(r,30));}throw Error('timed out');};
const yes=(v,m)=>{if(!v)throw Error(m)};
(async()=>{
 const w=document.getElementById('frame').contentWindow;
 await wait(()=>w.document.getElementById('atlasSemanticPanel')?.dataset.state==='idle'&&w.document.querySelector('#atlasResults article'));
 const $=id=>w.document.getElementById(id),panel=()=> $('atlasSemanticPanel');
 const query=q=>{$('atlasQuery').value=q;$('atlasForm').requestSubmit();};
 const modelURL=()=>new URL('MODEL_PATH_PLACEHOLDER',w.location.href).href;
 yes(panel().hidden,'fresh page should not interrupt');
 if('serviceWorker' in w.navigator){
  await wait(()=>!!w.navigator.serviceWorker.controller);
  yes(w.navigator.serviceWorker.controller.scriptURL.includes('/sw.js'),'unexpected worker controller');
  const caches=await w.caches.keys();
  for(const key of caches){const c=await w.caches.open(key);yes(!await c.match(modelURL()),'model in cache before consent');}
  yes(w.performance.getEntriesByName(modelURL()).length===0,'worker preloaded optional weights');
  if(modelURL().includes('/semantic-v2/')){
   let rejected=false;try{await w.fetch('/semantic-v2/atlas-search-worker.js?v=154-0000000000000000');}catch{rejected=true;}
   yes(rejected,'cross-revision runtime request not rejected');
  }
 }
 query('githbu');
 yes(panel().hidden,'first ordinary search opened model panel');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'typo result must work without model');
 query('GitHub');yes(panel().hidden&&w.getComputedStyle(panel()).display==='none','repeated ordinary search opened model panel');
 $('atlasSemanticOpen').click();yes(!panel().hidden&&w.getComputedStyle(panel()).display!=='none'&&$('atlasSemanticOpen').getAttribute('aria-expanded')==='true','explicit management entry did not open');
 yes($('atlasSemanticSize').textContent.includes('90.1 KiB'),'actual pinned size not shown');
 yes(w.performance.getEntriesByName(modelURL()).length===0,'download before consent');
 $('atlasSemanticLater').click();
 query('GitHub');yes(panel().hidden,'decline must suppress repeated offer');
 $('atlasSemanticOpen').click();
 $('atlasSemanticDownload').click();
 yes(panel().dataset.state==='downloading'&&!$('atlasSemanticCancel').hidden,'download and cancel controls missing');
 $('atlasSemanticCancel').click();
 await wait(()=>panel().dataset.state==='cancelled');
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='error');
 yes($('atlasSemanticStatus').textContent.includes('[integrity]'),'integrity diagnostics missing');
 yes(!w.localStorage.getItem('avenqir.semantic.preference.v2')||w.localStorage.getItem('avenqir.semantic.preference.v2')==='declined','corrupt model enabled');
 const failedCache=await w.caches.open('avenqir-semantic-model-v2-candidate');
 yes(!await failedCache.match(modelURL()),'corrupt model saved');

 // Real HTTP responses, not synthetic fetch replacement: hosting challenge and temporary outage.
 for(const [endpoint,code] of [['/fixture-html','mime'],['/fixture-unavailable','http'],['/fixture-rate-limit','rate_limited'],['/fixture-truncated','network'],['/fixture-partial','http'],['/fixture-redirect','network']]){
  await fetch(endpoint);
  $('atlasSemanticDownload').click();
  await wait(()=>panel().dataset.state==='error');
  yes($('atlasSemanticStatus').textContent.includes('['+code+']'),'missing real HTTP failure diagnostic '+code+' actual='+$('atlasSemanticStatus').textContent);
  yes(!await failedCache.match(modelURL()),'unverified host response cached');
  query('GitHub');
  yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'ordinary search failed during outage');
 }
 await fetch('/fixture-valid');
 // Fault injection at the real Cache API commit boundary, after real Worker ready.
 const NativeWorker=w.Worker, originalPut=w.Cache.prototype.put;
 let activatedWorker=null, injected=false;
 w.Worker=class extends NativeWorker{constructor(...args){super(...args);activatedWorker=this;}};
 w.Cache.prototype.put=async function(key,response){
  const result=await originalPut.call(this,key,response);
  if(!injected&&String(key)===modelURL()&&activatedWorker){
   injected=true;activatedWorker.dispatchEvent(new w.Event('error'));
  }
  return result;
 };
 $('atlasSemanticDownload').click();
 await wait(()=>injected&&panel().dataset.state==='error'&&!$('atlasSemanticDownload').hidden);
 yes($('atlasSemanticStatus').textContent.includes('[worker]'),'worker commit-race diagnostic lost');
 yes(!await w.caches.has('avenqir-semantic-model-v2-candidate'),'failed activation cache retained');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')!=='enabled','failed activation enabled');
 w.Worker=NativeWorker;w.Cache.prototype.put=originalPut;
 query('GitHub');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'ordinary search failed after worker error');
 // The actual browser can deny persistent writes (quota/private mode).
 // Verified bytes and a live worker should still work for this page session.
 w.Cache.prototype.put=async function(key,response){
  if(String(key)===modelURL())throw new w.DOMException('fixture quota exceeded','QuotaExceededError');
  return originalPut.call(this,key,response);
 };
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='ready');
 yes(!await w.caches.has('avenqir-semantic-model-v2-candidate'),'quota failure left partial cache');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')!=='enabled','session-only model persisted enabled preference');
 query('QR 코드 생성');
 await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent)));
 yes(w.document.querySelector('#atlasResults .atlas-semantic-match'),'session fallback did not rank');
 w.Cache.prototype.put=originalPut;
 // A session-only install must never imply persistent enablement or fetch on reload.
 await fetch('/fixture-block');
 const sessionDoc=w.document;w.location.reload();
 await wait(()=>w.document!==sessionDoc&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='idle');
 yes(!w.localStorage.getItem('avenqir.semantic.preference.v2'),'missing cache preference not reset');
 await fetch('/fixture-valid');
 $('atlasSemanticOpen').click();
 if(panel().hidden)$('atlasSemanticOpen').click();
 let intermediate=false;
 const obs=new w.MutationObserver(()=>{const v=$('atlasSemanticProgress').value;const txt=$('atlasSemanticDetail').textContent;if(v>0&&v<w.AVENQIR_RESEARCH_MANIFEST.bytes&&txt.includes('/s'))intermediate=true;});
 obs.observe($('atlasSemanticDetail'),{childList:true,subtree:true,characterData:true});
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='ready');obs.disconnect();
 yes(intermediate,'actual partial-byte progress and speed were not observed');
 yes($('atlasSemanticProgress').value===w.AVENQIR_RESEARCH_MANIFEST.bytes,'complete byte progress missing');
 yes($('atlasSemanticDetail').textContent.includes('100%'),'100% not shown');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')==='enabled','consent not saved');
 yes(!panel().hidden,'explicit download progress panel unexpectedly closed');
 query('QR 코드 생성');
 yes(panel().hidden&&$('atlasSemanticOpen').getAttribute('aria-expanded')==='false','active search did not collapse management panel');
 yes(!$('atlasNoMatchDialog').open,'premature no-match dialog while worker is pending');
 await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent)));
 yes(w.document.querySelector('#atlasResults .atlas-semantic-match'),'semantic result not labelled');
 yes(panel().hidden,'semantic result reopened management panel');
 $('atlasSemanticOpen').click();yes(!panel().hidden,'enabled model management cannot be opened manually');
 $('atlasSemanticClose').click();yes(panel().hidden,'manual close failed');
 query('QR 코드 생성');yes(panel().hidden,'repeated active search reopened management panel');
 // Mixed language and reviewed typing variants must reach real worker retrieval.
 for(const q of ['生成 QR code','genrate a qr code','QR code 만들기','genertae a qr code']){
  query(q);
  await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent))&&w.document.querySelector('#atlasResults .atlas-semantic-match'));
 }

 // User-reported duration request and related video operations.
 for(const q of ['把长视频剪短','我想把这段长视频剪短一点','把视频分成几段','把几个视频拼在一起','긴 동영상 자르기','長い動画を短くする','trim a video']){
  query(q);
  await wait(()=>$('atlasSemanticQueryState').dataset.state==='hit'&&[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/VEED|Kapwing/i.test(a.textContent))&&w.document.querySelector('#atlasResults .atlas-semantic-match'));
  yes(panel().hidden,'video search opened model management panel');
 }
 // Practical photo and learning requests with the existing model weights.
 for(const [q,expected] of [['我想把这张照片裁小一点',/Photopea/i],['把照片转正',/Photopea/i],['把png转成jpg',/Squoosh/i],['想自学新知识',/Khan Academy|OpenCourseWare|OpenLearn|edX|Coursera/i],['去哪里找论文',/Google Scholar|Semantic Scholar|BASE/i],['找大学自学教材',/OpenStax|LibreTexts|Open Textbook Library/i],['帮我画一下函数曲线',/Desmos|GeoGebra/i],['提高英语阅读能力',/British Council|BBC Learning English/i]]){
  query(q);await wait(()=>$('atlasSemanticQueryState').dataset.state==='hit'&&[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>expected.test(a.textContent)));
  yes(panel().hidden,'practical search opened model panel');
  yes(!/Worker|Compatibility/.test($('atlasSemanticQueryState').textContent),'internal mode shown in query status');
 }
 // Wider capability coverage, independent of locale and current model panel.
 for(const [q,expected] of [['把PDF转成Word',/iLovePDF|Smallpdf|PDF24/i],['把视频文件变小',/HandBrake/i],['截取音频片段',/AudioMass|Audacity|Ocenaudio/i],['比较两段文字',/Diffchecker/i],['番茄钟学习',/Pomofocus/i],['听英语单词发音',/Forvo|Cambridge/i],['查DNS泄漏',/DNS Leak Test/i],['测试IPv6连通性',/Test IPv6/i],['查看飞机实时位置',/Flightradar24/i],['看卫星地图',/Google Earth|NASA Worldview/i]]){
  query(q);await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>expected.test(a.textContent)));
  yes(panel().hidden,'expanded task reopened panel');
 }
 // Short colloquial Korean expressions and ambiguous user-reported query.
 for(const q of ['큐알코드 만들기','qr코드 생성','qr코드를 만들고 싶어요']){
  query(q);await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent)));
 }
 query('코드 생성');
 await wait(()=>$('atlasNoMatchDialog').open&&!$('atlasSemanticDialogClarification').hidden);
 yes($('atlasQuery').value==='코드 생성','ambiguous query rewritten automatically');
 yes($('atlasSemanticQueryState').dataset.state==='miss','no-match model state missing');
 yes($('atlasSemanticDialogQueryState').dataset.state==='miss','modal no-match state missing');
 yes($('atlasSemanticDialogQueryState').textContent===$('atlasSemanticQueryState').textContent,'modal status disagrees');
 w.AVENQIR_I18N.set('ar');yes($('atlasSemanticDialogClarificationLabel').textContent==='اختر اتجاه البحث:','Arabic clarification label');
 yes($('atlasSemanticDialogQueryState').textContent.includes('لا توجد نتائج محلية مرشحة'),'Arabic diagnostic missing');
 w.AVENQIR_I18N.set('en');
 const choice=$('atlasSemanticDialogClarification').querySelector('button');
 yes(choice.textContent==='QR 코드 생성','missing Korean clarification choice');
 choice.click();
 await wait(()=>$('atlasQuery').value==='QR 코드 생성'&&$('atlasSemanticQueryState').dataset.state==='hit');
 yes($('atlasSemanticQueryState').textContent.includes('ms'),'elapsed runtime missing');
 query('코드 생성');
 await wait(()=>$('atlasNoMatchDialog').open&&!$('atlasSemanticDialogClarification').hidden);
 $('atlasNoMatchClose').click();
 $('atlasQuery').value='코드 생성 무료';$('atlasQuery').dispatchEvent(new w.Event('input',{bubbles:true}));
 yes($('atlasSemanticClarification').hidden,'stale ambiguous choice visible');
 query('코드 생성 무료');
 await wait(()=>$('atlasNoMatchDialog').open||w.document.querySelector('#atlasResults article'));
 yes($('atlasSemanticDialogClarification').hidden,'constraint stripped');
 if($('atlasNoMatchDialog').open)$('atlasNoMatchClose').click();
 // Find a genuine no-result typo with a reviewed operation repair. A normal
 // lexical hit is intentionally allowed to suppress the optional suggestion.
 const suggestionQueries=['generat a qr code','geneate a qr code','genezate a qr code','valdate html','valizate html','valiidate html','practce touch typing','praczice touch typing','prevew a pdf','prevzew a pdf','measre page loading performance','meaz ure page loading performance','transate a paragraph','transzate a paragraph','inspec a tls certificate','inszect a tls certificate','remve image background','remzve image background','resze an image','rezize an image','compresz a pdf','compess a pdf'];
 let chosen=null;
 const closeNoMatch=()=>{if($('atlasNoMatchDialog').open)$('atlasNoMatchClose').click();};
 const suggestionBox=()=>$('atlasSemanticDialogSuggestion');
 for(const typo of suggestionQueries){
  closeNoMatch();query(typo);
  await wait(()=>$('atlasNoMatchDialog').open||[...w.document.querySelectorAll('#atlasResults article')].length>0);
  if($('atlasNoMatchDialog').open&&!suggestionBox().hidden){chosen=typo;break;}
 }
 yes(chosen,'no actual directory spelling suggestion exercised');
 const replacement=suggestionBox().querySelector('button').textContent;
 yes(replacement&&replacement!==chosen&&$('atlasQuery').value===chosen,'automatic query substitution');
 // Check reversible editing before the directory debounce runs, and IME
 // composition with the same query. No stale or prematurely exposed chip.
 closeNoMatch();
 const originalInput=$('atlasQuery'),inline=$('atlasSemanticSuggestion');
 originalInput.value=chosen+'x';originalInput.dispatchEvent(new w.Event('input',{bubbles:true}));
 yes(inline.hidden&&suggestionBox().hidden,'suggestion visible for modified input');
 originalInput.value=chosen;originalInput.dispatchEvent(new w.Event('input',{bubbles:true}));
 yes(!inline.hidden,'same-query suggestion lost after reversible edit');
 originalInput.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));
 yes(inline.hidden&&suggestionBox().hidden,'suggestion visible during IME');
 originalInput.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));
 query(chosen);
 await wait(()=>$('atlasNoMatchDialog').open&&!suggestionBox().hidden);
 yes(suggestionBox().querySelector('button').getBoundingClientRect().width<=390,'mobile suggestion overflow');
 w.AVENQIR_I18N.set('zh-Hans');
 yes($('atlasSemanticDialogSuggestionLabel').textContent==='是否改为搜索：','Chinese suggestion prompt');
 w.AVENQIR_I18N.set('ar');
 yes($('atlasSemanticDialogSuggestionLabel').textContent==='البحث بدلاً من ذلك عن:','Arabic suggestion prompt');
 w.AVENQIR_I18N.set('en');
 yes($('atlasSemanticDialogSuggestionLabel').textContent==='Search instead for:','English suggestion prompt');
 suggestionBox().querySelector('button').click();
 await wait(()=>$('atlasQuery').value===replacement&&[...w.document.querySelectorAll('#atlasResults article')].length>0);
 yes(!$('atlasNoMatchDialog').open&&suggestionBox().hidden,'selected correction retained stale dialog or suggestion');
 closeNoMatch();query(chosen+' without upload');
 await wait(()=>$('atlasNoMatchDialog').open||[...w.document.querySelectorAll('#atlasResults article')].length>0);
 yes(suggestionBox().hidden&&$('atlasSemanticSuggestion').hidden,'constraint stripped by suggestion');
 closeNoMatch();query(chosen);
 await wait(()=>$('atlasNoMatchDialog').open&&!suggestionBox().hidden);
 closeNoMatch();
 $('atlasQuery').value='GitHub';$('atlasQuery').dispatchEvent(new w.Event('input',{bubbles:true}));
 yes(suggestionBox().hidden&&$('atlasSemanticSuggestion').hidden,'old suggestion remained on input change');
 query('GitHub');await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/GitHub/i.test(a.textContent)));
 yes(suggestionBox().hidden,'suggestion shown alongside ordinary search results');
 document.documentElement.dataset.metrics=JSON.stringify({suggestionSelection:true,reversibleEdit:true,imeSuppressed:true,localizedPrompts:3,staleHidden:true,ordinaryResultsTakePriority:true,explicitConstraintsPreserved:true,shortKorean:true,ambiguousChoice:true,queryState:true,modalStatus:true,queryLocaleSwitch:true});
 query('genertae a qr code without upload');
 await wait(()=>!w.document.querySelector('#atlasResults .atlas-semantic-match'));
 query('QR 코드 생성');
 await wait(()=>w.document.querySelector('#atlasResults .atlas-semantic-match'));
 w.AVENQIR_I18N.set('ar');yes($('atlasSemanticTitle').textContent==='البحث الدلالي المحلي','Arabic localization');
 w.AVENQIR_I18N.set('ja');yes($('atlasSemanticDownload').textContent==='ダウンロードして有効化','Japanese localization');
 w.AVENQIR_I18N.set('en');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].every(a=>w.AVENQIR_ATLAS_CATALOG.catalog().some(x=>a.textContent.includes(x.name))),'invented catalog entry');
 const cache=await w.caches.open('avenqir-semantic-model-v2-candidate');
 yes((await cache.match(modelURL()))?.ok,'verified model cache missing');
 // Use verified cached bytes, exercise the identical local ranking runtime
 // with Worker constructor rejection and asynchronous startup failure.
 const verifiedText=await (await cache.match(modelURL())).text();
 const workerScript=[...w.document.scripts].find(s=>s.src.includes('/atlas-search-worker.js')).src;
 const realWorker=w.Worker;
 for(const failure of ['constructor','startup','timeout']){
  const hits=[],errors=[],ctrl=new w.AbortController();
  w.Worker=failure==='constructor'?class{constructor(){throw new w.DOMException('fixture','SecurityError');}}:class{postMessage(){if(failure==='startup')w.setTimeout(()=>this.onerror?.(new w.Event('error')),0);}terminate(){this.closed=true;}};
  const local=await w.AVENQIR_RESEARCH_ACTIVATION.activate({values:[verifiedText],items:w.AVENQIR_ATLAS_CATALOG.catalog(),signal:ctrl.signal,workerURL:workerScript,onResult:(urls,q,ms,suggestions)=>hits.push({urls,q,suggestions}),onError:e=>errors.push(e)});
  yes(local.mode==='local','local engine not activated '+failure);
  local.query('generate a qr code');local.query('QR 코드 생성');
  await wait(()=>hits.length||errors.length);
  yes(!errors.length&&hits.length===1&&hits[0].q==='QR 코드 생성'&&hits[0].urls.some(u=>/qrcode-monkey|qrcode-monkey.com/i.test(u)),'compatible local retrieval failed '+failure);
  local.close();local.query('GitHub');
  await new Promise(r=>setTimeout(r,30));yes(hits.length===1,'closed local engine returned a result');
 }
 w.Worker=realWorker;
 document.documentElement.dataset.metrics=JSON.stringify({...JSON.parse(document.documentElement.dataset.metrics),workerConstructorFallback:true,workerStartupFallback:true,workerTimeoutFallback:true,localLatestWins:true,localClose:true});
 for(const key of await w.caches.keys())if(key!=='avenqir-semantic-model-v2-candidate'){
  yes(!await (await w.caches.open(key)).match(modelURL()),'weight duplicated in shell cache');
 }
 // Reload without network model access: cached bytes must be sufficient.
 await fetch('/fixture-block');
 const prior=w.document;w.location.reload();
 await wait(()=>w.document!==prior&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='ready');
 await wait(()=>w.document.querySelector('#atlasResults .atlas-semantic-match'));
 yes(panel().hidden&&w.getComputedStyle(panel()).display==='none'&&$('atlasSemanticOpen').getAttribute('aria-expanded')==='false','cached query reload unexpectedly opened model panel');
 // Damage the persisted model while offline, then verify fail-closed restore.
 const damaged=await w.caches.open('avenqir-semantic-model-v2-candidate');
 await damaged.put(modelURL(),new w.Response('corrupted cache',{headers:{'Content-Type':'application/json'}}));
 const damagedDoc=w.document;w.location.reload();
 await wait(()=>w.document!==damagedDoc&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='error');
 yes($('atlasSemanticStatus').textContent.includes('[integrity]'),'corrupt cache not diagnosed');
 yes(panel().hidden,'failed cache restoration opened model panel');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')!=='enabled','failed restore left enabled preference');
 query('GitHub');yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'ordinary search failed after cache corruption');
 // Manually re-enable with the real directory UI and a denied Worker.
 // The same verified model must activate in local compatibility mode and
 // save only after successful initialization, then removal still works.
 await fetch('/fixture-valid');
 const beforeCompat=w.Worker;
 w.Worker=class{constructor(){throw new w.DOMException('fixture','SecurityError');}};
 if(panel().hidden)$('atlasSemanticOpen').click();
 $('atlasSemanticDownload').click();await wait(()=>panel().dataset.state==='ready');
 yes(panel().dataset.execution==='local'&&$('atlasSemanticStatus').textContent.includes('[compat]'),'directory compatibility state missing');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')==='enabled','compatible activation not persisted');
 query('QR 코드 생성');
 await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent))&&w.document.querySelector('#atlasResults .atlas-semantic-match'));
 w.Worker=beforeCompat;
 document.documentElement.dataset.metrics=JSON.stringify({...JSON.parse(document.documentElement.dataset.metrics),compatibleDirectoryActivation:true,manualPanelOnly:true,activeSearchCollapsesPanel:true,cachedQueryReloadClosed:true,videoOperationSearch:true,practicalPhotoStudySearch:true,internalModeHidden:true,extendedTaskSearch:true});
 await fetch('/fixture-block');
 w.confirm=()=>true;
 if(panel().hidden)$('atlasSemanticOpen').click();$('atlasSemanticRemove').click();
 await wait(()=>panel().dataset.state==='idle'&&!$('atlasSemanticDownload').hidden);
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')==='declined','disable preference not saved');
 yes(!await w.caches.has('avenqir-semantic-model-v2-candidate'),'model not deleted');
 document.documentElement.dataset.result='pass';
})().catch(e=>{document.documentElement.dataset.result='fail';document.documentElement.dataset.error=e.message});
</script>""".replace("MODEL_PATH_PLACEHOLDER",MODEL_PATH)
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(SITE),**kw)
    def log_message(self,*args):pass
    def do_GET(self):
        global mode
        parsed=urlsplit(self.path);p=parsed.path
        if (p.startswith('/semantic-v2/') and p.endswith('.js')) or p=='/atlas-domain-embedding.js':runtime_requests.append((p,parsed.query))
        if p=='/qa.html':data=FIXTURE.encode();kind='text/html; charset=utf-8'
        elif p=='/fixture-valid':mode='valid';data=b'ok';kind='text/plain'
        elif p=='/fixture-html':mode='html';data=b'ok';kind='text/plain'
        elif p=='/fixture-unavailable':mode='unavailable';data=b'ok';kind='text/plain'
        elif p=='/fixture-rate-limit':mode='rate-limit';data=b'ok';kind='text/plain'
        elif p=='/fixture-truncated':mode='truncated';data=b'ok';kind='text/plain'
        elif p=='/fixture-partial':mode='partial';data=b'ok';kind='text/plain'
        elif p=='/fixture-redirect':mode='redirect';data=b'ok';kind='text/plain'
        elif p=='/redirect-forbidden-target':
            requests.append(('redirect-followed',self.path));self.send_error(404);return
        elif p=='/fixture-block':mode='block';data=b'ok';kind='text/plain'
        elif p==MODEL_PATH:
            requests.append((mode,self.path))
            if mode=='redirect':
                self.send_response(302);self.send_header('Location','/redirect-forbidden-target');self.end_headers();return
            if mode=='partial':
                self.send_response(206);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(MODEL)));self.send_header('Content-Range',f'bytes 0-{len(MODEL)-1}/{len(MODEL)}');self.end_headers()
                try:self.wfile.write(MODEL)
                except (BrokenPipeError,ConnectionResetError):pass
                return
            if mode=='rate-limit':self.send_error(429);return
            if mode=='truncated':
                self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(len(MODEL)));self.end_headers()
                self.wfile.write(MODEL[:4096]);self.wfile.flush();self.close_connection=True
                try:self.connection.shutdown(socket.SHUT_WR)
                except OSError:pass
                return
            if mode in ('block','unavailable'):self.send_error(503);return
            if mode=='html':data=b'<!doctype html><html><body>Host verification required</body></html>';kind='text/html'
            else:data=MODEL if mode=='valid' else b'X'+MODEL[1:];kind='application/octet-stream' if mode=='valid' else 'application/json'
        elif p=='/directory.html':data=DIRECTORY.encode();kind='text/html; charset=utf-8'
        elif p=='/directory.js':data=DIRECTORY_JS.encode();kind='application/javascript; charset=utf-8'
        elif not PACKAGED and (p.startswith('/research/') or p.startswith('/site/')):
            target=(ROOT/p.lstrip('/')).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():self.send_error(404);return
            data=target.read_bytes();kind='application/javascript; charset=utf-8' if target.suffix=='.js' else 'application/json'
        elif p=='/public-api.php':data=b'{"ok":true,"items":[]}';kind='application/json'
        elif p=='/recommendations-api.php':data=b'{"ok":true,"items":[]}';kind='application/json'
        elif p.endswith('.php'):self.send_error(404);return
        else:super().do_GET();return
        try:
            self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.end_headers()
            if p==MODEL_PATH and mode=='valid':
                self.wfile.write(data[:1024]);self.wfile.flush();time.sleep(.25);self.wfile.write(data[1024:])
            else:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/qa.html'
    if FIREFOX:
        subprocess.run([sys.executable,str(ROOT/'tests'/'firefox_real_time.py'),url],timeout=175,check=True)
    else:
        with tempfile.TemporaryDirectory() as profile:
            subprocess.run(['node',str(ROOT/'tests'/'chrome_real_time.cjs'),CHROME,profile,url],timeout=75,check=True)
    assert len([x for x in requests if x[0]=='valid'])==4,requests
    assert not any(x[0]=='block' or '?' in x[1] for x in requests),requests
    assert sum(x[0]=='html' for x in requests)==1 and sum(x[0]=='unavailable' for x in requests)==1,requests
    assert sum(x[0]=='rate-limit' for x in requests)==1 and sum(x[0]=='truncated' for x in requests)==1,requests
    assert sum(x[0]=='partial' for x in requests)==1 and sum(x[0]=='redirect' for x in requests)==1,requests
    assert not any(x[0]=='redirect-followed' for x in requests),requests
    if PACKAGED:
        revision=re.search(r'avenqir-v154-semantic-candidate-([0-9a-f]{16})',(SITE/'sw.js').read_text()).group(1)
        expected_query='v=154-'+revision
        for name in ['atlas-search-worker.js','atlas-model-codec.js','atlas-unicode-runtime.js','atlas-multilingual-intents.js','atlas-multilingual-topics.js','atlas-retrieval-runtime.js']:
            assert ('/semantic-v2/'+name,expected_query) in runtime_requests,(name,runtime_requests)
        assert ('/atlas-domain-embedding.js',expected_query) in runtime_requests,runtime_requests
        assert not any(q=='v=154-0000000000000000' for _,q in runtime_requests),runtime_requests
        print('RUNTIME_REVISION_PASS',revision,'worker and six imports')
    print('PACKAGED' if PACKAGED else 'RESEARCH', 'FIREFOX' if FIREFOX else 'CHROMIUM', 'PASS real 390x844 candidate directory, full bundle consent, cancel/retry, integrity, progress, Korean result, locale switch, real HTTP HTML/503/429/206/redirect/truncated-body failure and retry, worker activation/cache race, quota session fallback, corrupted cache restore, mixed language and typo retrieval, reload and deletion')
    server.shutdown()
