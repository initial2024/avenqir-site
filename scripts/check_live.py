#!/usr/bin/env python3
"""Verify the public deployment marker matches the current GitHub commit."""
import json,os,sys,time,urllib.request
expected=os.environ['GITHUB_SHA']
url='https://avenqir.bg5.net/deploy-state.json'
for attempt in range(5):
    try:
        req=urllib.request.Request(url+'?check='+expected[:12]+'&try='+str(attempt),headers={'Cache-Control':'no-cache','User-Agent':'AVENQIR-Release-Check/1'})
        with urllib.request.urlopen(req,timeout=20) as r: data=json.load(r)
        if data.get('commit')==expected:
            print('PASS: production version matches',expected[:12]);sys.exit(0)
        print('Awaiting published commit, attempt',attempt+1)
    except Exception as e:
        print('Awaiting public deployment marker:',type(e).__name__)
    time.sleep(6)
sys.exit('VERIFY_FAILED: FTPS upload may have succeeded but HTTPS site is not serving this commit. Do not call it released.')
