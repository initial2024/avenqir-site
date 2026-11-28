#!/usr/bin/env python3
import gzip
import http.server
import pathlib
import sys
import threading
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from check_semantic_host import pinned,probe
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
        if mode=='html':data=b'<html>verification required</html>';mime='text/html'
        if mode=='bad':data=b'X'+RAW[1:]
        if mode=='oversize':data=b'x'*(512*1024+1)
        if mode=='short':data=RAW[:1024]
        self.send_response(200);self.send_header('Content-Type',mime)
        if encoding:self.send_header('Content-Encoding',encoding)
        self.send_header('Content-Length',str(len(data)));self.end_headers()
        try:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
class SemanticHost(unittest.TestCase):
    def test_read_only_transport(self):
        with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
            server.requests=[]
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                origin=f'http://127.0.0.1:{server.server_port}'
                for mode,expected in [('valid',None),('gzip',None),('html','mime'),('bad','integrity'),('short','integrity'),('oversize','wire_limit'),('redirect','redirect'),('rate','rate_limited'),('missing','http')]:
                    with self.subTest(mode=mode):
                        server.mode=mode
                        result=probe(origin)
                        self.assertEqual(result['ready'],expected is None,result)
                        self.assertEqual(result.get('error'),expected,result)
                self.assertEqual(server.requests,[PATH]*9)
            finally:server.shutdown();thread.join()
    def test_origin_restrictions(self):
        for origin in ['http://avenqir.bg5.net','https://example.com','https://avenqir.bg5.net/other','https://avenqir.bg5.net?token=x','https://avenqir.bg5.net.evil.example']:
            with self.subTest(origin=origin),self.assertRaises(ValueError):probe(origin)
if __name__=='__main__':unittest.main()
