#!/usr/bin/env python3
"""Exercise actual directory in headless Chrome, with a slow public API fixture.
No production requests, credentials or user files. This is a desktop smoke
test, not an estimate of the speed of a specific phone."""
import functools, http.server, json, pathlib, shutil, subprocess, tempfile, threading, time, urllib.parse
SITE=pathlib.Path(__file__).resolve().parents[1]/'site'
CHROME=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
assert CHROME, 'Chrome/Chromium required'
probe="""<script>
window.addEventListener('error',e=>{document.documentElement.dataset.aqRuntimeError=(e.message||'resource error')+' '+(e.filename||'').split('/').pop()+':'+e.lineno;});
window.addEventListener('unhandledrejection',e=>{document.documentElement.dataset.aqRejection=String(e.reason).slice(0,200);});
document.addEventListener('DOMContentLoaded',()=>{
 const r=document.getElementById('atlasResults');
 const n=document.getElementById('atlasLiveCount');
 const s=document.getElementById('atlasSource');
 document.documentElement.dataset.aqLocalReady=String(!!r&&r.children.length>0&&!!n&&!!s&&/1107|1,107/.test(n.textContent));
 document.documentElement.dataset.aqInitialCount=String(r?.children.length||0);
});
</script>"""
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):
        super().__init__(*a,directory=str(SITE),**kw)
    def log_message(self,*args): pass
    def do_GET(self):
        path=urllib.parse.urlsplit(self.path).path
        if path=='/public-api.php':
            time.sleep(4)
            data=b'{"ok":true,"items":[]}'
            try:
                self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
            except (BrokenPipeError,ConnectionResetError):pass
            return
        if path=='/directory.html':
            data=(SITE/'directory.html').read_text().replace('</body>',probe+'</body>').encode()
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(data);return
        if path.endswith('.php'):
            self.send_error(404);return
        super().do_GET()
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:%d/directory.html?q=Python'%server.server_port
    with tempfile.TemporaryDirectory() as tmp:
        start=time.monotonic()
        result=subprocess.run([CHROME,'--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-gpu','--no-first-run','--user-data-dir='+tmp,'--virtual-time-budget=6000','--dump-dom',url],capture_output=True,text=True,timeout=45,check=True)
        dom=result.stdout
        print('CHROME_SMOKE_ELAPSED_SECONDS=%.2f'%(time.monotonic()-start))
        import re
        for m in re.finditer(r'data-aq-(?:local-ready|initial-count|runtime-error|rejection)="[^"]*"',dom): print(m.group())
        for id in ['atlasLiveCount','atlasSource','atlasSummary','atlasStartupNotice']:
            m=re.search(r'<[^>]+id="'+id+r'"[^>]*>[^<]{0,350}',dom)
            print(id,m.group(0) if m else 'missing')
        assert 'data-aq-runtime-error=' not in dom, 'unexpected script runtime error'
        assert 'data-aq-local-ready="true"' in dom, 'directory did not render local results before delayed remote API'
        assert 'id="atlasResults"' in dom and 'Python' in dom, 'search results absent'
        assert 'https://www.google.com/search?q=Python' in dom, 'search continuation URL missing'
        print('PASS browser local-first catalog, initial Python search and continuation URL with slow API fixture')
    server.shutdown()
