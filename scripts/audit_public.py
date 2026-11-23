#!/usr/bin/env python3
"""Public GitHub repository content guard (not a substitute for human review)."""
from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[1]
PROTECTED={'_private','_store','.env','.ssh','private-settings.php','feedback-config.php'}
DANGEROUS=(re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
           re.compile(rb'github_pat_[A-Za-z0-9_]{25,}'),
           re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}'),
           re.compile(rb'(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{30,}'))
errors=[]
for p in ROOT.rglob('*'):
    rel=p.relative_to(ROOT)
    if '.git' in rel.parts or '__pycache__' in rel.parts: continue
    if p.is_symlink():errors.append(f'Symlink {rel}');continue
    if not p.is_file():continue
    if any(n in PROTECTED for n in rel.parts):errors.append(f'Protected file {rel}')
    if p.suffix.lower() in {'.pem','.key','.p12','.pfx','.sqlite','.db','.zip'}:errors.append(f'Not public {rel}')
    if p.stat().st_size>4*1024*1024:errors.append(f'Large file {rel}')
    data=p.read_bytes()
    for pattern in DANGEROUS:
        if pattern.search(data):errors.append(f'Possible leaked credential {rel}')
if errors:sys.exit('PUBLIC_AUDIT_DENY: '+'; '.join(errors[:15]))
print('PUBLIC_AUDIT_PASS: obvious private paths and token patterns absent; manual review still required')
