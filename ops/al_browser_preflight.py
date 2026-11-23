#!/usr/bin/env python3
"""Read-only checks for AVENQIR public audit + private AL browser feasibility.
No secrets, authentication, process starts, changes, or Internet requests.
"""
import json
import os
from pathlib import Path
import platform
import shutil
import socket
import sys

BASE=Path("/opt/avenqir")
BROWSER=Path("/opt/avenqir/private-browser")
MIN_RAM_BYTES=2*1024**3
MIN_FREE_DISK_BYTES=3*1024**3

def read_text(path):
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except (OSError, UnicodeError):
        return ""

def memory_limit():
    for candidate in ("/sys/fs/cgroup/memory.max",
                      "/sys/fs/cgroup/memory/memory.limit_in_bytes"):
        text=read_text(candidate)
        if text and text!="max":
            try:
                size=int(text)
                if 0<size<2**60:
                    return size
            except ValueError:
                pass
    return None

def localhost_vnc():
    try:
        with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sk:
            sk.settimeout(.4)
            return sk.connect_ex(("127.0.0.1",5901))==0
    except OSError:
        return False

def main():
    scripts=(BASE/"altare_cross_region_report.py",
             BASE/"altare_readonly_audit.py")
    installed=all(x.is_file() for x in scripts)
    reports=sorted((BASE/"reports").glob("public-audit-*.json")) if (BASE/"reports").is_dir() else []
    last=reports[-1] if reports else None
    latest=None
    if last:
        try:
            obj=json.loads(last.read_text(encoding="utf-8"))
            latest={"created_utc":obj.get("created_utc"),
                    "sampled_links":obj.get("sampled_links"),
                    "locale_status":(obj.get("locale") or {}).get("status")}
        except (OSError, ValueError, TypeError):
            latest={"error":"malformed report"}
    mem=memory_limit()
    try:
        free=shutil.disk_usage("/").free
    except OSError:
        free=None
    progs={name:bool(shutil.which(name)) for name in
           ("python3","curl","apt-get","Xvfb","x11vnc","openbox","google-chrome-stable","cloudflared")}
    ready=platform.machine() in ("x86_64","amd64") and mem is not None and mem>=MIN_RAM_BYTES
    result={
        "audit_installed":installed,
        "audit_last_result":latest,
        "arch":platform.machine(),
        "os":read_text("/etc/os-release").splitlines()[0:2],
        "cgroup_memory_limit_mib":round(mem/1024**2) if mem else None,
        "memory_sufficient_for_trial":bool(ready),
        "filesystem_free_mib_unverified_quota":round(free/1024**2) if free else None,
        "disk_may_not_equal_app_quota":True,
        "installed_commands":progs,
        "vnc_localhost_5901_reachable":localhost_vnc(),
        "private_browser_files_installed":BROWSER.is_dir(),
        "private_browser_operational_proof":False,
        "reason":"Install is NOT verified by this read-only check; memory, Chrome sandbox, VNC & Access require live acceptance."
    }
    print("=== AL SANDBOX READ-ONLY PREFLIGHT ===")
    print(json.dumps(result,indent=2,ensure_ascii=False))
    print("=== END AL PREFLIGHT ===")
    # A missing audit is a diagnostic finding, not a Python command error.
    return 0

if __name__=="__main__":
    sys.exit(main())
