#!/usr/bin/env python3
"""Local-only real Firefox fixture runner using W3C WebDriver, no Python dependencies."""
import json
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from urllib.parse import urlsplit

def main(url):
    target=urlsplit(url)
    assert target.scheme=='http' and target.hostname=='127.0.0.1' and target.port and not target.username and not target.password
    driver=shutil.which('geckodriver')
    binary=shutil.which('firefox') or shutil.which('firefox-esr')
    if not driver or not binary:
        raise RuntimeError('real Firefox and geckodriver are required; no silent skip')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}'
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def call(method,path,data=None):
        req=urllib.request.Request(endpoint+path,method=method,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
        with opener.open(req,timeout=10) as res:
            return json.load(res)['value']
    with tempfile.TemporaryFile() as logs:
        process=subprocess.Popen([driver,'--host','127.0.0.1','--port',str(port)],stdout=logs,stderr=subprocess.STDOUT)
        session=None
        try:
            for _ in range(100):
                if process.poll() is not None: raise RuntimeError('geckodriver exited')
                try:
                    if call('GET','/status').get('ready'): break
                except OSError: pass
                time.sleep(.1)
            else: raise RuntimeError('geckodriver not ready')
            caps=call('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'firefox','moz:firefoxOptions':{'binary':binary,'args':['-headless'],'prefs':{'network.proxy.type':0,'network.trr.mode':5,'browser.shell.checkDefaultBrowser':False,'browser.safebrowsing.downloads.remote.enabled':False}}}}})
            session='/session/'+caps['sessionId']
            print('FIREFOX_ACTUAL_VERSION',caps['capabilities'].get('browserVersion'),flush=True)
            call('POST',session+'/timeouts',{'pageLoad':20000,'script':10000,'implicit':0})
            call('POST',session+'/window/rect',{'width':430,'height':920})
            call('POST',session+'/url',{'url':url})
            deadline=time.monotonic()+65
            while time.monotonic()<deadline:
                state=call('POST',session+'/execute/sync',{'script':"return {result:document.documentElement?.dataset.result||'',error:document.documentElement?.dataset.error||'',metrics:document.documentElement?.dataset.metrics||''}",'args':[]})
                if state['result']=='fail': raise RuntimeError(state['error'] or 'Firefox fixture failed')
                if state['result']=='pass':
                    if state['metrics']:print('FIREFOX_FIXTURE_METRICS',state['metrics'])
                    print('FIREFOX_REAL_TIME_PASS',flush=True)
                    return
                time.sleep(.1)
            raise RuntimeError('Firefox fixture timed out')
        except BaseException:
            logs.seek(0,2); logs.seek(max(0,logs.tell()-6000))
            print(logs.read().decode(errors='replace'),file=sys.stderr)
            raise
        finally:
            if session:
                try:call('DELETE',session)
                except Exception:pass
            process.terminate()
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.kill();process.wait()

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: firefox_real_time.py localhost-fixture-url')
    main(sys.argv[1])
