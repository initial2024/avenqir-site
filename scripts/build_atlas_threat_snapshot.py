#!/usr/bin/env python3
"""Compare only the fixed public catalog with CERT Polska's active warning list.
No destination requests, visitor data, credentials or automatic safe verdicts.
"""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from urllib.parse import urlsplit
from audit_directory_links import SITE, SOURCES, load_array

FEED='https://hole.cert.pl/domains/v2/domains.txt'
MAX_BYTES=24*1024*1024
HOST=re.compile(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
def parse_feed(raw):
    if not isinstance(raw,bytes) or not raw or len(raw)>MAX_BYTES: raise ValueError('invalid size')
    out=set()
    for line in raw.decode('utf-8-sig',errors='strict').splitlines():
        s=line.strip().lower().rstrip('.')
        if not s or s.startswith('#'): continue
        s=s.encode('idna').decode('ascii')
        if not HOST.fullmatch(s): raise ValueError('unexpected feed format')
        out.add(s)
    if len(out)<1000: raise ValueError('unexpectedly small live feed')
    return out
def matched(host,feed):
    labels=host.split('.')
    return any('.'.join(labels[i:]) in feed for i in range(len(labels)-1))
def snapshot(raw,now):
    feed=parse_feed(raw)
    items=load_array('atlas-catalog-core.js','base')+load_array('atlas-catalog-core.js','extras')
    for file in SOURCES: items+=load_array(file,'links')
    hosts=sorted({urlsplit(item['url']).hostname.lower().rstrip('.') for item in items})
    if any(not HOST.fullmatch(h) for h in hosts):raise ValueError('unexpected catalog hostname')
    hits=[h for h in hosts if matched(h,feed)]
    return {'schema':'aq-certpl-v1','source':FEED,'checkedAt':now.isoformat().replace('+00:00','Z'),
            'feedSha256':hashlib.sha256(raw).hexdigest(),'feedDomains':len(feed),
            'hosts':hosts,'listed':hits,'catalogUrls':len(items)}
def main():
    req=urllib.request.Request(FEED,headers={'Accept':'text/plain','User-Agent':'AVENQIR public catalog defensive screening'})
    with urllib.request.build_opener(NoRedirect).open(req,timeout=25) as r:
        if r.status!=200 or r.headers.get_content_type() not in ('text/plain','application/octet-stream'):raise ValueError('unexpected feed response')
        raw=r.read(MAX_BYTES+1)
    result=snapshot(raw,dt.datetime.now(dt.timezone.utc))
    path=SITE/'atlas-threat-snapshot.js'
    path.write_text('/* Deployment-time public threat-list snapshot; no safety guarantee. */\nwindow.AVENQIR_THREAT_SNAPSHOT = '+json.dumps(result,ensure_ascii=True,separators=(',',':'))+';\n',encoding='utf-8')
    print('CERTPL_SCREENED_URLS='+str(result['catalogUrls']))
    print('CERTPL_SCREENED_HOSTS='+str(len(result['hosts'])))
    print('CERTPL_LISTED_HOSTS='+str(len(result['listed'])))
    print('CERTPL_FEED_DOMAINS='+str(result['feedDomains']))
    print('CERTPL_CHECKED_AT='+result['checkedAt'])
if __name__=='__main__':
    try: main()
    except Exception as e:
        print('CERTPL_SCREENING_UNAVAILABLE='+type(e).__name__)
        # Retain explicit unknown placeholder, never fabricate a clear verdict.
        raise SystemExit(1)
