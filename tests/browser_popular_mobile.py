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
<iframe id="home" src="/index.html"></iframe><iframe id="directory" src="/directory.html"></iframe>
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
 d.querySelector('[data-popular-topic="network"]').click();
 require(!d.getElementById('popularNetworkNote').hidden,'network information notice missing');
 d.querySelector('[data-popular-topic="all"]').click();
 d.getElementById('popularExpand').click();
 const count=d.querySelectorAll('#popularCards article').length;
 require(count>=60&&count<=100,'full directory editor picks missing');
 directory.AVENQIR_I18N.set('en');
 require(d.getElementById('popularTitle').textContent.includes('Popular'),'popular title was not retranslated');
 directory.AVENQIR_I18N.set('zh-Hans');
 require(d.getElementById('popularTitle').textContent.includes('大众热门'),'Chinese title was not restored');
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
