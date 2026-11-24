#!/usr/bin/env python3
"""Fail-closed deploy input validation for the published AVENQIR web root."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
FORBIDDEN={'.env','.htaccess','private-settings.php','feedback-config.php','_private','_store','backups','backup','.git','node_modules'}
ALLOWED={'.html','.css','.js','.php','.json','.webmanifest','.webp','.svg','.png','.jpg','.jpeg','.ico','.txt'}
MAX_FILE=3*1024*1024
MAX_TOTAL=12*1024*1024

def validate():
    if not SITE.is_dir():raise ValueError('Missing site directory')
    if not (SITE/'index.html').is_file() or not (SITE/'feedback-admin.php').is_file():raise ValueError('Site root missing key files')
    total=0
    files=[]
    for p in SITE.rglob('*'):
        rel=p.relative_to(SITE)
        if p.is_symlink():raise ValueError(f'Symlink not allowed: {rel}')
        if p.is_dir():continue
        if not p.is_file():raise ValueError(f'Unknown file type: {rel}')
        # Only .well-known/assetlinks.json is allowed as a dot-prefixed public path.
        # All other hidden folders/files (.git, .env, _private, _store) remain denied.
        is_assetlinks=(len(rel.parts)==2 and rel.parts[0]=='.well-known' and rel.parts[1]=='assetlinks.json')
        if not is_assetlinks and any(x.lower() in FORBIDDEN or x.startswith('.') for x in rel.parts):
            raise ValueError(f'Protected path: {rel}')
        if p.suffix.lower() not in ALLOWED:raise ValueError(f'Unapproved type: {rel}')
        if any(x in p.name.lower() for x in ('secret','private','password','credential','backup','setup-code','key.pem')):raise ValueError(f'Sensitive-looking filename: {rel}')
        if p.stat().st_size>MAX_FILE:raise ValueError(f'Oversized file: {rel}')
        if p.suffix.lower()=='.html':
            sample=p.read_bytes()
            if b'slowAES.decrypt' in sample or b'/aes.js' in sample:
                raise ValueError(f'Anti-bot challenge HTML is not original website source: {rel}')
        total+=p.stat().st_size
        files.append(p)
    if not files or total>MAX_TOTAL:raise ValueError('Empty or oversized deploy')
    return files

if __name__=='__main__':
    try:
        files=validate();print(f'PASS: {len(files)} files; {sum(p.stat().st_size for p in files)} bytes; protected folders absent')
    except Exception as e:
        sys.exit('BLOCKED: '+str(e))
