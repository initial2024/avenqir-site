#!/usr/bin/env python3
"""Refresh only the public threat snapshot on the matching deployed revision."""
import ftplib,json,ssl
from ftps_deploy import HOST,REMOTE,credential,retrieve,upload,sha
from build_atlas_threat_snapshot import SITE,main as generate
def refresh():
    commit=credential('GITHUB_SHA')
    if len(commit)!=40 or any(c not in '0123456789abcdef' for c in commit):raise ValueError('invalid commit')
    generate()
    file=SITE/'atlas-threat-snapshot.js'
    if file.stat().st_size>1024*1024 or b'window.AVENQIR_THREAT_SNAPSHOT = null;' in file.read_bytes():raise ValueError('invalid generated snapshot')
    ftp=ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=25)
    ftp.connect(HOST,21,timeout=25)
    try:
        ftp.login(credential('FTPS_USERNAME'),credential('FTPS_PASSWORD'));ftp.prot_p();ftp.set_pasv(True)
        ftp.cwd(REMOTE);root=ftp.pwd()
        marker=json.loads(retrieve(ftp,'deploy-state.json'))
        if marker.get('schema')!='avenqir-deploy-state-1' or marker.get('commit')!=commit:
            raise RuntimeError('Production revision differs; full deployment required before snapshot refresh')
        upload(ftp,file,commit,root)
        ftp.cwd(root)
        if sha(retrieve(ftp,file.name))!=sha(file.read_bytes()):raise RuntimeError('snapshot readback mismatch')
        print('DYNAMIC_THREAT_SNAPSHOT_PUBLISHED=PASS')
    finally:
        try:ftp.quit()
        except Exception:ftp.close()
if __name__=='__main__':refresh()
