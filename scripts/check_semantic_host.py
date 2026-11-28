#!/usr/bin/env python3
"""Read-only model host readiness check. No credentials, redirects, uploads or challenge bypass."""
import argparse
import gzip
import hashlib
import io
import json
import re
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
MIME={'application/json','application/octet-stream','text/plain','text/json'}
MAX_WIRE=512*1024
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None

def pinned():
    text=(ROOT/'research'/'atlas-semantic-manifest.js').read_text(encoding='utf-8')
    match=re.search(r'Object\.freeze\((\{[^}]+\})\)',text)
    if not match:raise ValueError('manifest')
    spec=json.loads(match.group(1))
    raw=(ROOT/'research'/spec['file']).read_bytes()
    if len(raw)!=spec['bytes'] or hashlib.sha256(raw).hexdigest()!=spec['sha256']:raise ValueError('repository_integrity')
    name='atlas-semantic-bundle-v2-'+spec['sha256'][:24]+'.json'
    return spec,'/semantic-v2/'+name

def probe(origin,timeout=20):
    spec,path=pinned()
    url=urlsplit(origin)
    local=url.scheme=='http' and url.hostname=='127.0.0.1' and url.port is not None
    official=url.scheme=='https' and url.netloc=='avenqir.bg5.net'
    if not (local or official) or url.path not in ('','/') or url.query or url.fragment or url.username or url.password:
        raise ValueError('only official HTTPS origin or explicit localhost QA')
    dest=origin.rstrip('/')+path
    opener=urllib.request.build_opener(NoRedirect())
    req=urllib.request.Request(dest,headers={'Accept':'application/json, application/octet-stream','Accept-Encoding':'gzip, identity','User-Agent':'AVENQIR-Model-Readiness/1.0'})
    result={'url':dest,'expectedBytes':spec['bytes'],'expectedSHA256':spec['sha256'],'ready':False}
    try:
        with opener.open(req,timeout=timeout) as response:
            result.update(status=response.status,mime=response.headers.get_content_type(),encoding=response.headers.get('Content-Encoding','identity'),cacheControl=response.headers.get('Cache-Control',''))
            if response.status!=200:raise ValueError('http')
            if result['mime'] not in MIME:raise ValueError('mime')
            data=response.read(MAX_WIRE+1)
            if len(data)>MAX_WIRE:raise ValueError('wire_limit')
            result['wireBytes']=len(data)
            advertised=response.headers.get('Content-Length')
            if advertised is not None and (not advertised.isdecimal() or int(advertised)!=len(data)):raise ValueError('wire_length')
            encoding=result['encoding'].lower().strip()
            if encoding=='gzip':
                with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:data=stream.read(spec['bytes']+1)
            elif encoding!='identity':raise ValueError('encoding')
            result['decodedBytes']=len(data)
            result['sha256']=hashlib.sha256(data).hexdigest()
            if len(data)!=spec['bytes'] or result['sha256']!=spec['sha256']:raise ValueError('integrity')
            if json.loads(data).get('schema')!='aq-semantic-bundle-2':raise ValueError('schema')
            result['ready']=True
    except urllib.error.HTTPError as e:
        result.update(status=e.code,error='redirect' if 300<=e.code<400 else 'rate_limited' if e.code==429 else 'http')
    except (ValueError,OSError,EOFError) as e:
        result['error']=str(e) if isinstance(e,ValueError) else type(e).__name__
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',default='https://avenqir.bg5.net')
    args=parser.parse_args()
    result=probe(args.origin)
    print('SEMANTIC_HOST_READINESS',json.dumps(result,ensure_ascii=False,sort_keys=True))
    raise SystemExit(0 if result['ready'] else 1)
