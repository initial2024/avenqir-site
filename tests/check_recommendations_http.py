#!/usr/bin/env python3
"""Full HTTP -> PHP -> isolated MySQL -> JSON checks. Never targets production."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

assert os.environ.get('AQ_TEST_DSN') == 'mysql:host=127.0.0.1;port=3306;dbname=avenqir_test;charset=utf8mb4'
assert os.environ.get('AQ_TEST_USER') == 'root'
assert os.environ.get('AQ_TEST_PASSWORD') == 'fixture-only-db'
site = Path(__file__).resolve().parents[1] / 'site'
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp) / 'site'
    shutil.copytree(site,root)
    (root/'_private').mkdir()
    (root/'_private'/'feedback-config.php').write_text("""<?php return ['db_host'=>'127.0.0.1','db_name'=>'avenqir_test','db_user'=>'root','db_password'=>'fixture-only-db','ip_hmac_secret'=>'ci-only-not-a-real-deployment-key-12345'];""")
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    origin=f'http://127.0.0.1:{port}'
    server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    def request(data=None,source=origin,query='?days=7'):
        headers={'Origin':source}
        if data is not None:headers['Content-Type']='application/json'
        req=Request(origin+'/recommendations-api.php'+query,data=json.dumps(data).encode() if data is not None else None,headers=headers)
        try:
            with urlopen(req,timeout=5) as res:return res.status,json.load(res)
        except HTTPError as err:return err.code,json.load(err)
    def vote(action,i=0,tool='toolbox',stars=4,source=origin):
        payload={'action':action,'tool_id':tool,'voter_token':hashlib.sha256(f'http-fixture-{i}'.encode()).hexdigest()}
        if action=='rate':payload['stars']=stars
        return request(payload,source)
    try:
        for _ in range(40):
            try: status,body=request();break
            except OSError:time.sleep(.1)
        assert status==200 and body['ok'] is True
        assert vote('rate',source='https://unrelated.invalid')[0]==403
        assert vote('rate',tool='not-a-real-id')[0]==400
        assert vote('rate',stars=6)[0]==400
        assert vote('click')[0]==200 and vote('click')[0]==200
        status,body=request()
        assert body['items']['toolbox']['clicks']==1
        for i in range(5):
            assert vote('rate',i)[0]==200
        status,body=request()
        row=body['items']['toolbox']
        assert row['count']==5 and row['average']==4 and isinstance(row['score'],int)
        assert vote('rate',6)[0]==429
        assert vote('remove',0)[0]==200
        row=request()[1]['items']['toolbox']
        assert row['count']==4 and row['average'] is None and row['score'] is None
        assert vote('clear',1)[0]==200
        assert request()[1]['items']['toolbox']['count']==3
        assert request(query='?days=90')[0]==200 and request(query='?days=999')[0]==400
        print('PASS actual HTTP PHP/MySQL: origin, validation, click dedup, aggregate, quota and withdrawal')
    finally:
        server.terminate()
        server.wait(timeout=5)
