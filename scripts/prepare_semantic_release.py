#!/usr/bin/env python3
"""Offline verification of a previously reviewed semantic candidate.
Never connects to the production host and never grants upload approval.
"""
import hmac
import re
import subprocess
from pathlib import Path
from audit_semantic_candidate import audit

ROOT=Path(__file__).resolve().parents[1]

def prepare(stage, expected_manifest, expected_commit):
    if not isinstance(expected_manifest,str) or not re.fullmatch(r'[0-9a-f]{64}',expected_manifest):
        raise ValueError('Invalid reviewed manifest SHA-256')
    if not isinstance(expected_commit,str) or not re.fullmatch(r'[0-9a-f]{40}',expected_commit):
        raise ValueError('Invalid reviewed commit SHA')
    checkout=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,check=True,capture_output=True,text=True).stdout.strip()
    if checkout!=expected_commit:
        raise ValueError('Checkout differs from reviewed commit')
    dirty=subprocess.run(['git','status','--porcelain','--untracked-files=no'],cwd=ROOT,check=True,capture_output=True,text=True).stdout
    if dirty.strip():
        raise ValueError('Tracked checkout has uncommitted changes')
    source=Path(stage)
    if source.is_symlink():
        raise ValueError('Staging root must not be a symlink')
    root=source.resolve(strict=True)
    if root==ROOT or ROOT in root.parents or root in ROOT.parents:
        raise ValueError('Use a separate external staging root')
    if (root/'deploy-state.json').exists():
        raise ValueError('Staged deployment metadata must not be supplied')
    report=audit(root)
    if not hmac.compare_digest(report['manifestSHA256'],expected_manifest):
        raise ValueError('Staged tree differs from approved manifest')
    return {**report,'commit':checkout,'uploadAuthorized':False,'mode':'offline-plan'}

