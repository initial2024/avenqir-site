#!/usr/bin/env python3
"""Exercise homepage and directory in 390×844 Chrome viewports."""
import http.server
import pathlib
import re
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import urlsplit

SITE = pathlib.Path(__file__).resolve().parents[1] / "site"
CHROME = shutil.which("google-chrome") or shutil.which("chromium")
assert CHROME, "Chrome/Chromium required"

FIXTURE = """<!doctype html><title>AVENQIR 390×844 checks</title>
<style>iframe{display:block;border:0;width:390px;height:844px}</style>
<iframe id="home" src="/index.html"></iframe><iframe id="directory" src="/directory.html"></iframe><iframe id="bookmarks" src="/bookmarks.html"></iframe>
<script>
const waitFor=(predicate)=>new Promise((resolve,reject)=>{
 const start=performance.now();
 function check(){
  if(predicate())resolve();
  else if(performance.now()-start>10000)reject(Error('Popular never initialized'));
  else setTimeout(check,40);
 }
 check();
});
const require=(condition,reason)=>{if(!condition)throw Error(reason);};
(async()=>{
 const home=document.getElementById('home').contentWindow;
 const directory=document.getElementById('directory').contentWindow;
 await waitFor(()=>home.document.querySelectorAll('#popularCards article').length===16&&
  directory.document.querySelectorAll('#popularCards article').length>=12&&directory.AVENQIR_I18N);
 const screen=(win)=>win.innerWidth===390&&win.innerHeight===844;
 require(screen(home)&&screen(directory),'viewport size differs from 390×844');
 const h=home.document;
 const d=directory.document;
 require(h.documentElement.scrollWidth<=390&&d.documentElement.scrollWidth<=390,'mobile overflow: home '+h.documentElement.scrollWidth+', directory '+d.documentElement.scrollWidth);
 require(d.body.dataset.atlasDensity==='compact','directory must start compact on mobile');
 require(!d.getElementById('atlasAdvancedFilters').open,'advanced filters default collapsed');
 require(directory.getComputedStyle(d.getElementById('atlasStickySearch')).position==='sticky','search must be sticky');
 require(d.querySelectorAll('#atlasQuickCategories button').length>1,'quick categories must render');
 d.getElementById('atlasDensity').click();
 require(d.body.dataset.atlasDensity==='comfortable','directory density override');
 d.getElementById('atlasDensity').click();
 require(directory.localStorage.getItem('avenqir.atlas.density.v1')==='compact','directory density persists');
 const homeCards=h.getElementById('popularCards');
 require(homeCards.scrollWidth>homeCards.clientWidth&&homeCards.getBoundingClientRect().width<=390,'homepage cards should scroll horizontally within the screen');
 require(h.getElementById('popularHeroAction').getAttribute('href')==='#popular','homepage must lead with an editor picks shortcut');
 const original=home.location.href;
 h.getElementById('popularRandom').click();
 const preview=h.querySelector('#popularPreview a');
 require(preview&&home.location.href===original,'random must preview before navigation');
 require(home.AVENQIR_LINK_GATE.officialSourceReviewed(preview.href)&&
  home.AVENQIR_ATLAS_SAFETY.inspect(preview.href).type==='reviewed','random URL must be verified and structurally allowed');
 const firstRandom=h.querySelector('#popularPreview article').dataset.pickId;
 h.getElementById('popularRandom').click();
 require(firstRandom!==h.querySelector('#popularPreview article').dataset.pickId,'should draw a different eligible pick');
 const startQuery=h.getElementById('startQuery');
 require(h.querySelectorAll('.start-card:not([hidden])').length===8,'home should cap the initial card grid');
 require(!h.getElementById('startSnapshot').open&&h.getElementById('startSnapshotLine').textContent.includes('390×844'),'collapsed snapshot should show current dimensions');
 require(!h.getElementById('community').open,'the public recommendations panel should be collapsed on mobile');
 h.dispatchEvent(new home.KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true}));
 require(h.activeElement===startQuery,'slash must focus the start page search');
 startQuery.value='JSON';
 startQuery.dispatchEvent(new home.Event('input',{bubbles:true}));
 require(h.querySelector('.start-card:not([hidden]) mark')?.textContent.includes('JSON'),'home search must highlight a real match');
 require(h.querySelectorAll('#startCategories a:not([hidden])').length===2,'search must hide categories without matches');
 startQuery.value='[.*';
 startQuery.dispatchEvent(new home.Event('input',{bubbles:true}));
 require(!h.getElementById('startEmpty').hidden,'literal search with no results must show the clear action');
 h.getElementById('startEmptyClear').click();
 require(startQuery.value===''&&h.getElementById('startEmpty').hidden,'clear must restore the home results');
 const tools=h.querySelector('#startCategories a[href="#tools"]');
 require(tools&&h.getElementById('tools'),'category should have a native URL fragment');
 tools.click();
 await waitFor(()=>tools.getAttribute('aria-current')==='location');
 require(home.location.hash==='#tools'&&h.querySelectorAll('.start-card:not([hidden]):not([data-start-category="tools"])').length===0,'category must filter and update the URL');
 const star=h.querySelector('.start-tile:not([hidden]) .start-star');
 star.click();
 require(star.getAttribute('aria-pressed')==='true'&&JSON.parse(home.localStorage.getItem('avenqir.start.favorites.v1')).length===1,'favorite should be saved locally');
 h.querySelector('#startCategories a[href="#favorites"]').click();
 await waitFor(()=>home.location.hash==='#favorites'&&h.querySelectorAll('.start-card:not([hidden])').length===1);
 star.click();
 require(!h.getElementById('startEmpty').hidden,'favorites must have a dedicated empty state');
 h.getElementById('startSettingsToggle').click();
 require(h.getElementById('startSettings').open,'home settings must open as a dialog');
 require(h.getElementById('startStorageUsage').textContent.includes('KiB'),'local storage estimate missing');
 await waitFor(()=>h.querySelector('#startSettings #aqLocaleSelect'));
 const compact=h.querySelector('[name="startDensity"][value="compact"]');
 require(compact.checked&&h.body.dataset.startDensity==='compact','fresh mobile default must be compact');
 h.querySelector('[name="startDensity"][value="comfortable"]').click();
 require(h.body.dataset.startDensity==='comfortable','comfortable override must work');
 compact.click();
 require(h.body.dataset.startDensity==='compact'&&home.localStorage.getItem('avenqir.start.density')==='compact','compact mode must be saved locally');
 h.querySelector('[name="startDensity"][value="comfortable"]').click();
 h.getElementById('startSettings').close();
 d.querySelector('[data-popular-intent="pdf"]').click();
 const intent=d.getElementById('popularIntentResults');
 require(!intent.hidden&&intent.children.length>=3&&intent.children.length<=8,'PDF intent must have 3–8 results');
 require(intent.textContent.includes('文件可能上传')||intent.textContent.includes('Files may be uploaded'),'PDF file privacy warning missing');
 d.querySelector('[data-popular-intent="slides"]').click();
 const canva=intent.querySelector('[data-pick-id="n078"] a');
 require(canva&&canva.href==='https://www.canva.com/','verified Canva should use its exact official URL');
 d.querySelector('[data-popular-intent="ai"]').click();
 const pending=intent.querySelector('[data-pick-id="dA055"] a');
 require(pending&&new URL(pending.href).pathname.endsWith('/leave.html'),'unconfirmed URL must use the existing consent page');
 const pendingCard=intent.querySelector('[data-pick-id="dA055"]');
 require(pendingCard.querySelector('.aq-source-pending')&&pendingCard.querySelector('.aq-source-prompt'),'source and confirmation must have different badges');
 await waitFor(()=>Boolean(pendingCard.querySelector('.aq-source-rate[href*="pick=dA055"]')));
 const rateButton=pendingCard.querySelector('.aq-source-rate');
 const beforeRatingURL=directory.location.href;
 const beforeRatingScroll=directory.scrollY;
 rateButton.click();
 const dialog=d.querySelector('.aq-quick-rating[open]');
 require(dialog&&directory.location.href===beforeRatingURL,'rating must open in place');
 require(dialog.getBoundingClientRect().width<=390,'rating dialog exceeds mobile width');
 const stars=dialog.querySelectorAll('.aq-quick-stars button');
 require(stars.length===5,'five rating controls required');
 stars[3].click();
 require(!dialog.querySelector('.aq-quick-share input').checked,'public sharing must default off');
 dialog.querySelector('.aq-quick-primary').click();
 require(JSON.parse(directory.localStorage.getItem('avenqir.recommendations.local.v1')).ratings.dA055.stars===4,'local rating not saved');
 require(dialog.querySelector('.aq-quick-feedback').textContent.includes('本机')||dialog.querySelector('.aq-quick-feedback').textContent.includes('locally'),'local-only result missing');
 require(rateButton.textContent.includes('4★'),'directory rating label not refreshed');
 dialog.close();
 require(directory.location.href===beforeRatingURL&&Math.abs(directory.scrollY-beforeRatingScroll)<=2,'rating must preserve URL and scrolling');
 require(d.querySelector('#atlasSort option[value="rating"]')&&d.querySelector('#atlasSort option[value="recommended"]'),'directory ranking choices missing');
 await waitFor(()=>directory.AVENQIR_ATLAS_SOURCE_UI.ratingsAvailable());
 require(directory.AVENQIR_ATLAS_SOURCE_UI.average('https://github.com/')===4.6,'public aggregate must join exact URL');
 require(directory.AVENQIR_ATLAS_SOURCE_UI.average('https://developer.mozilla.org/zh-CN/')===0,'small samples must not rank');
 d.getElementById('atlasSort').value='rating';
 d.getElementById('atlasSort').dispatchEvent(new directory.Event('change'));
 await waitFor(()=>d.querySelector('#atlasResults .atlas-result-title')?.textContent.includes('GitHub'));
 directory.sessionStorage.setItem('avenqir.rating.return.v1',JSON.stringify({id:'r1',at:Date.now()-9000,departed:true}));
 directory.dispatchEvent(new directory.Event('focus'));
 await waitFor(()=>d.querySelector('.aq-return-rating'));
 require(d.querySelector('.aq-return-rating').textContent.includes('GitHub'),'return reminder must target the exact public item');
 d.querySelector('.aq-return-rating button').click();
 require(d.querySelector('.aq-quick-rating[open]')&&directory.location.href===beforeRatingURL,'return reminder should open inline rating');
 d.querySelector('.aq-quick-rating').close();
 require(!directory.sessionStorage.getItem('avenqir.rating.return.v1'),'reminder must be consumed');
 d.getElementById('atlasSort').value='relevance';
 d.getElementById('atlasSort').dispatchEvent(new directory.Event('change'));

 d.querySelector('[data-popular-topic="network"]').click();
 require(!d.getElementById('popularNetworkNote').hidden,'network information notice missing');
 d.querySelector('[data-popular-topic="all"]').click();
 d.getElementById('popularExpand').click();
 const count=d.querySelectorAll('#popularCards article').length;
 require(count>=60&&count<=100,'full directory editor picks missing');
 const shortcut=d.querySelector('#atlasQuickCategories button[data-quick-category]:not([data-quick-category=""])');
 shortcut.click();
 require(new URL(directory.location.href).searchParams.get('category')===shortcut.dataset.quickCategory,'quick category must update URL');
 require(d.querySelector('.atlas-result-title'),'quick category must render results');
 d.querySelector('#atlasQuickCategories button[data-quick-category=""]').click();
 require(!new URL(directory.location.href).searchParams.has('category'),'all clears category');
 require(d.querySelector('.atlas-card-more:not([open])'),'card secondary actions must be collapsed');
 require([...d.querySelectorAll('.atlas-secondary-actions button')].some(b=>b.textContent.includes('复制')||b.textContent.includes('Copy')),'copy URL action missing');
 require(!d.getElementById('atlasHistoryEnabled').checked,'search history defaults off');
 d.getElementById('atlasHistoryEnabled').click();
 require(directory.localStorage.getItem('avenqir.atlas.search-history.enabled.v1')==='1','history opt-in missing');
 const search=d.getElementById('atlasQuery');search.value='GitHub';d.getElementById('atlasForm').dispatchEvent(new directory.Event('submit',{bubbles:true,cancelable:true}));
 require(JSON.parse(directory.localStorage.getItem('avenqir.atlas.search-history.v1'))[0]==='GitHub','committed search history missing');
 d.getElementById('atlasHistoryEnabled').click();
 require(!directory.localStorage.getItem('avenqir.atlas.search-history.enabled.v1')&&!directory.localStorage.getItem('avenqir.atlas.search-history.v1'),'history opt-out must erase records');
 const bookmarks=document.getElementById('bookmarks').contentWindow;
 const bk=bookmarks.document;
 await waitFor(()=>bk.querySelectorAll('#bookmarkGrid .link-card').length>=2);
 require(bk.documentElement.scrollWidth<=390,'bookmarks mobile overflow');
 const originalRows=JSON.parse(bookmarks.localStorage.getItem('avenqir_v6_bookmarks'));
 bk.getElementById('sortLinks').value='manual';bk.getElementById('sortLinks').dispatchEvent(new bookmarks.Event('change'));
 bk.querySelector('#bookmarkGrid .link-card [data-bookmark-move="down"]').click();
 const reordered=JSON.parse(bookmarks.localStorage.getItem('avenqir_v6_bookmarks'));
 require(reordered[0].id===originalRows[1].id&&reordered[1].id===originalRows[0].id,'manual order not persisted');
 const oldCategory=reordered[0].category;bookmarks.confirm=()=>true;
 bk.getElementById('bookmarkCategoryFrom').value=oldCategory;bk.getElementById('bookmarkCategoryTo').value='QA fixture';bk.getElementById('bookmarkCategoryMove').click();
 const moved=JSON.parse(bookmarks.localStorage.getItem('avenqir_v6_bookmarks'));
 require(moved.length===reordered.length&&moved[0].category==='QA fixture'&&!moved.some(x=>x.category===oldCategory),'category rename must preserve all bookmarks');
 require(bk.getElementById('exportMarkdown'),'Markdown export missing');
 bookmarks.localStorage.setItem('avenqir_v6_bookmarks','[]');bookmarks.location.reload();
 await waitFor(()=>bookmarks.document.querySelector('#bookmarkGrid .empty-state'));
 require(!bookmarks.document.querySelector('#bookmarkGrid .link-card'),'explicit empty bookmarks must not repopulate defaults');
 directory.AVENQIR_I18N.set('en');
 require(d.getElementById('popularTitle').textContent.includes('Editor picks'),'editor title was not retranslated');
 directory.AVENQIR_I18N.set('zh-Hans');
 require(d.getElementById('popularTitle').textContent.includes('编辑精选'),'Chinese title was not restored');
 document.documentElement.dataset.result='pass';
 document.documentElement.dataset.picks=String(count);
})().catch(error=>{document.documentElement.dataset.result='fail';document.documentElement.dataset.error=error.message;});
</script>
"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/mobile-test.html":
            payload = FIXTURE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
        elif path == "/public-api.php":
            payload = b'{"ok":true,"items":[]}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
        elif path == "/recommendations-api.php":
            if "catalog=added" in self.path:
                payload = b'{"ok":true,"items":[]}'
            else:
                payload = b'{"ok":true,"items":{"r1":{"count":6,"average":4.6,"score":86},"r2":{"count":1,"average":null,"score":null}}}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
        elif path.endswith(".php"):
            self.send_error(404)
            return
        else:
            super().do_GET()
            return
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


with http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with tempfile.TemporaryDirectory() as profile:
        result = subprocess.run(
            [CHROME, "--headless", "--no-sandbox", "--disable-dev-shm-usage",
             "--disable-background-networking", "--disable-gpu", "--no-first-run",
             "--user-data-dir=" + profile, "--virtual-time-budget=15000", "--dump-dom",
             f"http://127.0.0.1:{server.server_port}/mobile-test.html"],
            capture_output=True, text=True, timeout=55, check=True,
        )
    state = re.search(r'<html[^>]+>', result.stdout)
    assert 'data-result="pass"' in result.stdout, state[0] if state else 'No test page rendered'
    count = re.search(r'data-picks="(\d+)"', result.stdout)[1]
    print(f"PASS 390×844 homepage and directory, {count} editor picks, intents, random preview, privacy and locale switching")
    server.shutdown()
