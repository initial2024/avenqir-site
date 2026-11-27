#!/usr/bin/env python3
"""Read-only independent FTPS receipt verification for an AVENQIR deployment.

This proves selected public remote file bytes and the remote deploy commit
against the pinned Git checkout. It does NOT claim that HTTPS/browser-side
JavaScript, PHP runtime, or anti-bot challenges were validated.
"""
from pathlib import Path
import hashlib
import json
import os
import sys
import ftplib
import ssl

from ftps_deploy import HOST, REMOTE, SITE, credential, retrieve

# Explicit, small, privacy-safe release gate; exclude runtime config,
# dynamically refreshed risk/registry snapshots and owner-customized media.
CORE=(
    'index.html',
    'start-page.js',
    'start-page.css',
    'local-organize.js',
    'bookmarks.html',
    'bookmarks.js',
    'transfer-schema.js',
    'transfer.html',
    'directory.html',
    'directory.js',
    'directory-search.css',
    'atlas-tags.js',
    'recommendations.html',
    'recommendations.js',
    'recommendations-model.js',
    'recommendations-api.php',
    'recommendations-core.php',
    'atlas-popular-ui.js',
    'leave.html',
    'leave.js',
    'atlas-source-ui.css',
    'atlas-source-ui.js',
    'admin.php',
    'owner-traffic.php',
    'traffic-api.php',
    'traffic-core.php',
    'privacy.html',
    'site.js',
    'sw.js',
)

def verify_receipt(ftp, expected, root=SITE):
    if len(expected)!=40 or any(c not in '0123456789abcdef' for c in expected):
        raise ValueError('Expected full commit SHA')
    ftp.cwd(REMOTE)
    state=json.loads(retrieve(ftp,'deploy-state.json'))
    if not isinstance(state,dict) or state.get('schema')!='avenqir-deploy-state-1' or state.get('commit')!=expected:
        raise RuntimeError('REMOTE_DEPLOY_MARKER_MISMATCH')
    checks=0
    for rel in CORE:
        file=(root/rel)
        expected_bytes=file.read_bytes()
        actual=retrieve(ftp,rel)
        if hashlib.sha256(actual).digest()!=hashlib.sha256(expected_bytes).digest():
            raise RuntimeError('REMOTE_SHA256_MISMATCH '+rel)
        print('FTPS_READBACK_PASS',rel,hashlib.sha256(actual).hexdigest()[:16],flush=True)
        checks+=1
    return checks

def summary(result, detail):
    output=os.environ.get('GITHUB_STEP_SUMMARY')
    if output:
        with open(output,'a',encoding='utf-8') as f:
            f.write('### Independent FTPS receipt: '+result+'\n')
            f.write(detail+'\n')
            f.write('This is a **file delivery check**, not a public browser or PHP runtime test.\n')

def main():
    sha=credential('GITHUB_SHA')
    context=ssl.create_default_context()
    ftp=ftplib.FTP_TLS(context=context, timeout=25)
    ftp.connect(HOST,21,timeout=25)
    try:
        ftp.login(credential('FTPS_USERNAME'),credential('FTPS_PASSWORD'))
        ftp.prot_p()
        ftp.set_pasv(True)
        count=verify_receipt(ftp,sha)
        print('FTPS_RECEIPT_PASS',count,'files, marker',sha,flush=True)
        summary('PASS',str(count)+' selected files and full deployment SHA verified over authenticated TLS.')
    finally:
        try:ftp.quit()
        except Exception:ftp.close()

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('FTPS_RECEIPT_DENY',type(e).__name__,str(e)[:160],file=sys.stderr)
        summary('DENY','Remote checksum/marker validation failed or was unavailable.')
        sys.exit(1)
