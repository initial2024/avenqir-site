#!/usr/bin/env python3
"""Strictly-scoped SEUS FTPS upload; excludes runtime secrets and user data.

For an existing file, stage a complete copy first, keep the old file in runner
memory, replace it with STOR, download/check the new SHA-256, and attempt a
rollback on failure. Existing customized binary images are not overwritten by
unattended deployments. No FTP updater can provide whole-site atomicity.
"""
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path
import ssl
import sys
import time
from verify_site import validate, SITE

HOST='ftpupload.net'
REMOTE='avenqir.bg5.net/htdocs'
# Existing images may have been changed directly on the shared host; never
# overwrite a different remote asset in unattended deployments.
PRESERVE_EXISTING_MEDIA={'.webp','.png','.jpg','.jpeg','.ico','.gif'}

def credential(key):
    v=os.environ.get(key,'')
    if not v or '\x00' in v or '\n' in v or '\r' in v:
        raise RuntimeError(f'Missing/invalid GitHub Secret or environment variable: {key}')
    return v

def safe_mkdir(ftp, dirname, target_root):
    ftp.cwd(target_root)
    if not dirname: return
    for segment in dirname.split('/'):
        allowed_dot=(dirname=='.well-known' and segment=='.well-known')
        if segment in ('','.','..') or (not allowed_dot and not all(c.isalnum() or c in '-_' for c in segment)):
            raise RuntimeError('Invalid remote folder')
        try: ftp.cwd(segment)
        except ftplib.error_perm as e:
            if not str(e).startswith('550'): raise
            ftp.mkd(segment)
            ftp.cwd(segment)

def remote_names(ftp):
    # Fail closed if listing is blocked: cannot safely distinguish existing files.
    return {Path(n.rstrip('/')).name for n in ftp.nlst()}

def retrieve(ftp, name):
    output=io.BytesIO()
    ftp.retrbinary('RETR '+name,output.write,blocksize=65536)
    return output.getvalue()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def upload(ftp, file, commit, target_root, root=SITE, listing_cache=None, expected_sha256=None):
    rel=file.relative_to(root).as_posix()
    parent=rel.rsplit('/',1)[0] if '/' in rel else ''
    safe_mkdir(ftp,parent,target_root)
    name=file.name
    new=file.read_bytes()
    if expected_sha256 is not None and sha(new)!=expected_sha256:
        raise RuntimeError('Audited file changed before upload: '+rel)
    # Cached positive names are only a read-only hint, never authorization to write.
    # Every existing file is still retrieved and compared by SHA-256.
    current=listing_cache.get(parent) if listing_cache is not None else None
    if current is None or name not in current:
        current=remote_names(ftp)
        if listing_cache is not None: listing_cache[parent]=current
    old=retrieve(ftp,name) if name in current else None
    if old is not None and sha(old)==sha(new):
        print('UNCHANGED',rel)
        return
    if old is not None and file.suffix.lower() in PRESERVE_EXISTING_MEDIA:
        # The server copy wins for binaries unless an owner-approved asset
        # replacement procedure is used separately from routine code deploys.
        print('PRESERVED_REMOTE_MEDIA',rel,'remote_bytes='+str(len(old)))
        return
    if listing_cache is not None:
        # Fresh listing before any mutation; abort if presence changed during this pass.
        listing_cache.pop(parent,None)
        current=remote_names(ftp)
        if (name in current)!=(old is not None):
            raise RuntimeError('Remote file presence changed during deployment: '+rel)
    temp=name+'.avenqir-upload-'+commit[:12]+'.tmp'
    if temp in current: raise RuntimeError('Unexpected pre-existing temporary file: '+rel)
    try:
        ftp.storbinary('STOR '+temp,io.BytesIO(new),blocksize=65536)
        if sha(retrieve(ftp,temp))!=sha(new):
            raise RuntimeError('Temp integrity check failed: '+rel)
        if old is None:
            ftp.rename(temp,name)
        else:
            # Pure-FTPd may reject RNTO overwrites. Overwrite existing file only
            # after a full temporary transfer; transient partial responses remain
            # possible on shared FTP, so never describe this as atomic.
            try:
                ftp.storbinary('STOR '+name,io.BytesIO(new),blocksize=65536)
                if sha(retrieve(ftp,name))!=sha(new):
                    raise RuntimeError('Remote SHA mismatch')
            except Exception as e:
                try:
                    ftp.storbinary('STOR '+name,io.BytesIO(old),blocksize=65536)
                    if sha(retrieve(ftp,name))!=sha(old):
                        raise RuntimeError('Restored bytes mismatch')
                    print('RESTORED',rel,file=sys.stderr)
                except Exception:
                    raise RuntimeError('ROLLBACK_FAILED at '+rel+'; restore site backup immediately') from e
                raise RuntimeError('Overwrite rejected; old file restored: '+rel) from e
        # Existing-file final readback is already inside the rollback-protected block.
        # Renamed new files still require their own final readback.
        if old is None and sha(retrieve(ftp,name))!=sha(new):
            raise RuntimeError('Final remote file mismatch: '+rel)
        print('DEPLOYED',rel,len(new))
    finally:
        # Only delete the scratch file the deployment itself created.
        try:
            if temp in remote_names(ftp):ftp.delete(temp)
        except Exception:pass

def deploy_order(file, root=SITE):
    # Publish shared PHP dependencies before dependent pages, pages before
    # navigation entrypoints, and cache version last. This reduces transient
    # missing-target errors during shared-host deployment, not atomic rollout.
    rel=file.relative_to(root).as_posix()
    if rel == 'sw.js': priority=4
    elif rel in ('admin.php','index.html','directory.html'): priority=3
    elif rel in ('feedback.php','owner-feedback-security.php'): priority=2
    elif rel.endswith(('.js','.css','.json')) or rel.startswith('webauthn/') or rel in ('server-core.php','feedback-core.php','feedback-abuse.php','feedback-turnstile.php','admin-security.php','traffic-core.php','recommendations-core.php'): priority=0
    else: priority=1
    return priority,rel

def main():
    # The normal workflow remains unchanged. Candidate mode is an explicit
    # operator-only entry point and is disabled without a matching approval.
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--semantic-stage')
    parser.add_argument('--manifest-sha256')
    parser.add_argument('--candidate-commit')
    parser.add_argument('--plan-only',action='store_true')
    args=parser.parse_args()
    root=SITE
    expected={}
    candidate=None
    if any((args.semantic_stage,args.manifest_sha256,args.candidate_commit,args.plan_only)):
        if not all((args.semantic_stage,args.manifest_sha256,args.candidate_commit)):
            raise RuntimeError('Candidate mode requires stage, reviewed manifest SHA-256 and reviewed commit')
        from prepare_semantic_release import prepare
        candidate=prepare(args.semantic_stage,args.manifest_sha256,args.candidate_commit)
        root=Path(args.semantic_stage).resolve(strict=True)
        expected={entry['path']:entry['sha256'] for entry in candidate['files']}
        if args.plan_only:
            print('SEMANTIC_RELEASE_PLAN',json.dumps({k:v for k,v in candidate.items() if k!='files'},sort_keys=True))
            return
        if os.environ.get('AVENQIR_SEMANTIC_RELEASE_APPROVAL')!=args.candidate_commit+':'+args.manifest_sha256:
            raise RuntimeError('Explicit candidate upload approval required')
    commit=credential('GITHUB_SHA')
    if len(commit)!=40 or any(x not in '0123456789abcdef' for x in commit):
        raise RuntimeError('Invalid GitHub commit SHA')
    if candidate is not None and commit!=args.candidate_commit:
        raise RuntimeError('Reviewed candidate commit does not match GITHUB_SHA')
    files=validate(root)
    if candidate is not None and {p.relative_to(root).as_posix() for p in files}!=set(expected):
        raise RuntimeError('Candidate file set changed after audit')
    username=credential('FTPS_USERNAME')
    passwd=credential('FTPS_PASSWORD')
    if (root/'deploy-state.json').exists():
        raise RuntimeError('deploy-state.json is generated only by CI')
    context=ssl.create_default_context()
    ftp=ftplib.FTP_TLS(context=context,timeout=25)
    ftp.connect(HOST,21,timeout=25)
    try:
        ftp.login(username,passwd)
        ftp.prot_p()
        ftp.set_pasv(True)
        ftp.cwd(REMOTE)
        target_root=ftp.pwd()
        print('FTPS connected with certificate verification; target:',REMOTE)
        started=time.monotonic()
        listing_cache={}
        for file in sorted(files,key=lambda p:deploy_order(p,root)):
            if (file.name=='atlas-threat-snapshot.js' and b'window.AVENQIR_THREAT_SNAPSHOT = null;' in file.read_bytes()) or (file.name=='atlas-registry-snapshot.js' and b'window.AVENQIR_REGISTRY_SNAPSHOT = null;' in file.read_bytes()):
                ftp.cwd(target_root)
                if file.name in remote_names(ftp):
                    print('PRESERVED_LAST_THREAT_SNAPSHOT',file.name)
                    continue
            upload(ftp,file,commit,target_root,root=root,listing_cache=listing_cache,expected_sha256=expected.get(file.relative_to(root).as_posix()))
        metadata={'schema':'avenqir-deploy-state-1','commit':commit,'deployed_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        if candidate is not None:
            metadata['candidate_revision']=candidate['revision']
            metadata['candidate_manifest_sha256']=candidate['manifestSHA256']
        state=root/'deploy-state.json'
        try:
            state.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            upload(ftp,state,commit,target_root,root=root,listing_cache=listing_cache)
            print('FTPS_UPLOAD_COMPLETE',len(files),'validated payload files; elapsed_seconds='+str(round(time.monotonic()-started,1)),flush=True)
        finally:
            state.unlink(missing_ok=True)
    finally:
        try:ftp.quit()
        except Exception:ftp.close()

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('DEPLOY_FAILED:',type(e).__name__,str(e)[:240],file=sys.stderr)
        sys.exit(1)
