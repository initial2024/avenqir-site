#!/usr/bin/env python3
"""Read-only receipt for the audited semantic candidate; no legacy-file assertions."""
import json,sys,ssl,ftplib
from pathlib import Path
from ftps_deploy import HOST,REMOTE,credential,retrieve,sha
from prepare_semantic_release import prepare
from verify_ftps_receipt import CORE

def main():
    root=Path(sys.argv[1]);commit=credential('GITHUB_SHA')
    report=prepare(root,sys.argv[2],commit)
    entries={e['path']:e for e in report['files']}
    paths=(set(CORE)-{'atlas-semantic-download.js','atlas-semantic-model-v1.json'})|{'atlas-expansion.js','atlas-personalize.js','atlas-personalize-ui.js'}
    paths|={p for p in entries if p.startswith('semantic-v2/')}
    if not paths<=entries.keys():raise RuntimeError('Missing expected receipt paths')
    ftp=ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=25)
    try:
        ftp.connect(HOST,21,timeout=25);ftp.login(credential('FTPS_USERNAME'),credential('FTPS_PASSWORD'))
        ftp.prot_p();ftp.set_pasv(True);ftp.cwd(REMOTE)
        state=json.loads(retrieve(ftp,'deploy-state.json'))
        if state.get('commit')!=commit or state.get('candidate_revision')!=report['revision'] or state.get('candidate_manifest_sha256')!=report['manifestSHA256']:
            raise RuntimeError('Candidate deployment marker mismatch')
        for p in sorted(paths):
            b=retrieve(ftp,p)
            if len(b)!=entries[p]['bytes'] or sha(b)!=entries[p]['sha256']:raise RuntimeError('Candidate remote mismatch: '+p)
            print('CANDIDATE_FTPS_READBACK_PASS',p,flush=True)
        print('CANDIDATE_FTPS_RECEIPT_PASS',len(paths),commit,report['revision'],flush=True)
    finally:
        try:ftp.quit()
        except Exception:ftp.close()
if __name__=='__main__':main()
