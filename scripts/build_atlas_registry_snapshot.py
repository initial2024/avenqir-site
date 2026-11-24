#!/usr/bin/env python3
"""Government registration evidence for the entire public catalog.
Never auto-promote a registered domain or arbitrary subpath to exact reviewed URL.
No destination requests, no user URLs, no visitor data; omit registry contact data.
"""
import csv, datetime as dt, hashlib, io, json, re, urllib.request
from urllib.parse import urlsplit
from audit_directory_links import SITE,SOURCES,load_array
from build_atlas_threat_snapshot import NoRedirect
SOURCE='https://raw.githubusercontent.com/cisagov/dotgov-data/main/current-federal.csv'
MAX=4*1024*1024
def parse_registry(raw):
    if not raw or len(raw)>MAX:raise ValueError('registry size')
    reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig',errors='strict')))
    if not {'Domain name','Domain type','Organization name'}.issubset(reader.fieldnames or []):raise ValueError('registry columns')
    rows={}
    for row in reader:
        host=row['Domain name'].strip().lower()
        org=row['Organization name'].strip()
        if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.gov',host) or not org or not row['Domain type'].startswith('Federal'):raise ValueError('invalid federal record')
        if host in rows:raise ValueError('duplicate registration')
        rows[host]=org[:160]
    if len(rows)<500:raise ValueError('truncated federal registry')
    return rows
def build(raw,items,now):
    registered=parse_registry(raw)
    hits={}
    for item in items:
        u=urlsplit(item['url']);host=(u.hostname or '').lower()
        if u.scheme!='https' or u.username or u.password or u.port not in (None,443):continue
        key='.'.join(host.split('.')[-2:])
        if key in registered:
            hits[item['url']]={'registeredDomain':key,'organization':registered[key]}
    return {'schema':'aq-registry-us-v1','source':SOURCE,'checkedAt':now.isoformat().replace('+00:00','Z'),'sha256':hashlib.sha256(raw).hexdigest(),'catalogUrls':len(items),'records':hits}
def main():
    req=urllib.request.Request(SOURCE,headers={'Accept':'text/plain','User-Agent':'AVENQIR public registry evidence'})
    with urllib.request.build_opener(NoRedirect).open(req,timeout=25) as response:
        if response.status!=200 or response.headers.get_content_type() not in ('text/plain','text/csv','application/octet-stream'):raise ValueError('unexpected registry response')
        raw=response.read(MAX+1)
    items=load_array('atlas-catalog-core.js','base')+load_array('atlas-catalog-core.js','extras')
    for name in SOURCES:items+=load_array(name,'links')
    result=build(raw,items,dt.datetime.now(dt.timezone.utc))
    (SITE/'atlas-registry-snapshot.js').write_text('window.AVENQIR_REGISTRY_SNAPSHOT = '+json.dumps(result,ensure_ascii=True,separators=(',',':'))+';\n',encoding='utf-8')
    print('REGISTRY_CATALOG_COMPARED='+str(len(items)))
    print('REGISTRY_URL_MATCHES='+str(len(result['records'])))
    print('REGISTRY_CHECKED_AT='+result['checkedAt'])
if __name__=='__main__':main()
