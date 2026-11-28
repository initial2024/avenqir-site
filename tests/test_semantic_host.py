#!/usr/bin/env python3
import gzip
import http.server
import pathlib
import sys
import threading
import unittest
import tempfile
import subprocess
import shutil
import hashlib
import re
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from check_semantic_host import pinned,probe
from verify_site import validate
from ftps_deploy import deploy_order
SPEC,PATH=pinned()
RAW=(ROOT/'research'/SPEC['file']).read_bytes()
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        self.server.requests.append(self.path)
        mode=self.server.mode
        if mode=='redirect':
            self.send_response(302);self.send_header('Location','/other');self.end_headers();return
        if mode in ('rate','missing'):
            self.send_error(429 if mode=='rate' else 404);return
        data=RAW;mime='application/json';encoding=None
        if mode=='gzip':data=gzip.compress(RAW,mtime=0);encoding='gzip'
        if mode=='broken-gzip':data=b'not a gzip stream';encoding='gzip'
        if mode=='gzip-bomb':data=gzip.compress(b'x'*(SPEC['bytes']+10000),mtime=0);encoding='gzip'
        if mode=='truncated-wire':data=RAW[:1024]
        if mode=='html':data=b'<html>verification required</html>';mime='text/html'
        if mode=='bad':data=b'X'+RAW[1:]
        if mode=='oversize':data=b'x'*(512*1024+1)
        if mode=='short':data=RAW[:1024]
        self.send_response(200);self.send_header('Content-Type',mime)
        if encoding:self.send_header('Content-Encoding',encoding)
        self.send_header('Content-Length',str(len(RAW) if mode=='truncated-wire' else len(data)));self.end_headers()
        try:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
class SemanticHost(unittest.TestCase):
    def test_read_only_transport(self):
        with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
            server.requests=[]
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                origin=f'http://127.0.0.1:{server.server_port}'
                for mode,expected in [('valid',None),('gzip',None),('broken-gzip','encoding'),('gzip-bomb','integrity'),('truncated-wire','wire_length'),('html','mime'),('bad','integrity'),('short','integrity'),('oversize','wire_limit'),('redirect','redirect'),('rate','rate_limited'),('missing','http')]:
                    with self.subTest(mode=mode):
                        server.mode=mode
                        result=probe(origin)
                        self.assertEqual(result['ready'],expected is None,result)
                        self.assertEqual(result.get('error'),expected,result)
                self.assertEqual(server.requests,[PATH]*12)
            finally:server.shutdown();thread.join()
    def test_staged_host_payload(self):
        self.assertIsNotNone(shutil.which('node'),'Node required for candidate build')
        with tempfile.TemporaryDirectory(prefix='aq-host-') as temp:
            target=pathlib.Path(temp)/'site'
            subprocess.run(['node',str(ROOT/'scripts'/'build_semantic_candidate.cjs'),str(target)],check=True,capture_output=True)
            files=validate(target)
            model=target/PATH.lstrip('/')
            self.assertIn(model,files)
            self.assertEqual(model.read_bytes(),RAW)
            self.assertFalse((target/'atlas-semantic-model-v1.json').exists())
            manifest=(target/'semantic-v2'/'atlas-semantic-manifest.js').read_text()
            self.assertIn(model.name,manifest)
            self.assertNotIn(model.name,(target/'sw.js').read_text())
            self.assertNotIn(SPEC['file'],(target/'sw.js').read_text())
            self.assertEqual(list((target/'semantic-v2').glob('*.json')),[model])
            self.assertLessEqual(sum(p.stat().st_size for p in files),12*1024*1024)
            shell=(target/'sw.js').read_text()
            revision=re.search(r'avenqir-v154-semantic-candidate-([0-9a-f]{16})',shell).group(1)
            self.assertIn('?v=154-'+revision,(target/'directory.html').read_text())
            # Two independent builds must publish byte-identical runtime assets.
            second=pathlib.Path(temp)/'second'
            subprocess.run(['node',str(ROOT/'scripts'/'build_semantic_candidate.cjs'),str(second)],check=True,capture_output=True)
            first_hashes={p.relative_to(target).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
            second_hashes={p.relative_to(second).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in validate(second)}
            self.assertEqual(first_hashes,second_hashes)
            # Existing FTPS order stages dependencies before directory and SW.
            ordered=sorted(files,key=lambda p:deploy_order(p,target))
            self.assertLess(ordered.index(model),ordered.index(target/'directory.html'))
            self.assertEqual(ordered[-1],target/'sw.js')
    def test_origin_restrictions(self):
        for origin in ['http://avenqir.bg5.net','https://example.com','https://avenqir.bg5.net/other','https://avenqir.bg5.net?token=x','https://avenqir.bg5.net.evil.example']:
            with self.subTest(origin=origin),self.assertRaises(ValueError):probe(origin)
if __name__=='__main__':unittest.main()
