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
import json
import os
from unittest import mock
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from check_semantic_host import pinned,probe
from verify_site import validate
from ftps_deploy import deploy_order,upload
from audit_semantic_candidate import audit
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
            critical=re.search(r'const critical=\[(.*?)\];',shell,re.S).group(1)
            runtime=list((target/'semantic-v2').glob('*.js'))
            self.assertEqual(len(runtime),12)
            for script in runtime:self.assertIn("'semantic-v2/"+script.name+"'",critical)
            self.assertIn("response.status!==200",shell)
            self.assertIn("response.headers.has('content-range')",shell)
            one,two=audit(target),audit(second)
            self.assertEqual(one,two)
            self.assertEqual(one['fileCount'],len(files))
            self.assertEqual(one['modelSHA256'],SPEC['sha256'])
            self.assertEqual(one['files'][-1]['path'],'sw.js')
            print('CANDIDATE_MANIFEST_REPORT',json.dumps({k:v for k,v in one.items() if k!='files'},sort_keys=True))
            # Real offline CLI must verify the reviewed commit and manifest,
            # without needing credentials or constructing an FTP client.
            commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
            args=[sys.executable,str(ROOT/'scripts'/'ftps_deploy.py'),'--semantic-stage',str(target),'--manifest-sha256',one['manifestSHA256'],'--candidate-commit',commit]
            env=dict(os.environ)
            for key in ('FTPS_USERNAME','FTPS_PASSWORD','AVENQIR_SEMANTIC_RELEASE_APPROVAL','GITHUB_SHA'):env.pop(key,None)
            plan=subprocess.run(args+['--plan-only'],env=env,capture_output=True,text=True,check=True)
            report=json.loads(plan.stdout.split('SEMANTIC_RELEASE_PLAN ',1)[1])
            self.assertEqual(report['manifestSHA256'],one['manifestSHA256'])
            self.assertEqual(report['commit'],commit)
            self.assertFalse(report['uploadAuthorized'])
            denied=subprocess.run(args,env=env,capture_output=True,text=True)
            self.assertNotEqual(denied.returncode,0)
            self.assertIn('Explicit candidate upload approval required',denied.stderr)
            for flag,bad,reason in [('--manifest-sha256','0'*64,'differs from approved manifest'),('--candidate-commit','0'*40,'Checkout differs')]:
                invalid=args.copy();invalid[invalid.index(flag)+1]=bad
                result=subprocess.run(invalid+['--plan-only'],env=env,capture_output=True,text=True)
                self.assertNotEqual(result.returncode,0)
                self.assertIn(reason,result.stderr)
            # A changed audited file must fail before the uploader touches FTP.
            with mock.patch('ftps_deploy.safe_mkdir') as mkdir:
                with self.assertRaisesRegex(RuntimeError,'Audited file changed'):
                    upload(None,target/'directory.html',commit,'/unused',root=target,expected_sha256='0'*64)
                mkdir.assert_not_called()
            print('SEMANTIC_PROMOTION_GATE_REPORT',json.dumps({'planOnly':True,'uploadWithoutApprovalRejected':True,'wrongManifestRejected':True,'wrongCommitRejected':True,'fileMutationBeforeFTPRejected':True}))
            # Verify content changes affect manifest, and a corrupted pinned weight fails.
            directory=second/'directory.html'
            directory.write_bytes(directory.read_bytes()+b'\\n')
            self.assertNotEqual(audit(second)['manifestSHA256'],one['manifestSHA256'])
            (second/PATH.lstrip('/')).write_bytes(b'X'+RAW[1:])
            with self.assertRaises((ValueError,AssertionError)):audit(second)
    def test_origin_restrictions(self):
        for origin in ['http://avenqir.bg5.net','https://example.com','https://avenqir.bg5.net/other','https://avenqir.bg5.net?token=x','https://avenqir.bg5.net.evil.example']:
            with self.subTest(origin=origin),self.assertRaises(ValueError):probe(origin)
if __name__=='__main__':unittest.main()
