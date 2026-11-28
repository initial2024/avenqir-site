#!/usr/bin/env python3
"""Read-only manifest of an already built candidate. Never contacts the host."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from verify_site import validate
from ftps_deploy import deploy_order
from check_semantic_host import pinned

def sha(data):
    return hashlib.sha256(data).hexdigest()

def audit(root):
    root=Path(root)
    if root.is_symlink():raise ValueError('Staging root must not be a symlink')
    root=root.resolve(strict=True)
    files=validate(root)
    spec,hosted=pinned()
    model=root/hosted.lstrip('/')
    if model not in files or model.stat().st_size!=spec['bytes'] or sha(model.read_bytes())!=spec['sha256']:
        raise ValueError('Pinned model integrity mismatch')
    shell=(root/'sw.js').read_text(encoding='utf-8')
    revision=re.search(r"avenqir-v154-semantic-candidate-([0-9a-f]{16})",shell)
    if not revision:raise ValueError('Not a semantic candidate')
    if model.name in shell:raise ValueError('Model in shell precache')
    if (root/'atlas-semantic-model-v1.json').exists() or (root/'atlas-semantic-download.js').exists():raise ValueError('Legacy assets present')
    entries=[]
    ordered=sorted(files,key=lambda p:deploy_order(p,root))
    for p in ordered:
        data=p.read_bytes()
        entries.append({'path':p.relative_to(root).as_posix(),'bytes':len(data),'sha256':sha(data)})
    payload=json.dumps(entries,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode('utf-8')
    return {'schema':'aq-semantic-candidate-audit-1','revision':revision.group(1),'modelPath':hosted,'modelBytes':spec['bytes'],'modelSHA256':spec['sha256'],'fileCount':len(entries),'totalBytes':sum(e['bytes'] for e in entries),'manifestSHA256':sha(payload),'files':entries}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('staged_root',type=Path)
    args=parser.parse_args()
    print(json.dumps(audit(args.staged_root),ensure_ascii=False,indent=2,sort_keys=True))
