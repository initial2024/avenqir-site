#!/usr/bin/env python3
"""Check the public deployment marker; FTPS byte verification remains authoritative.

Some iFastNet installations show a JavaScript anti-bot page to CI runners.
When this happens, report the HTTP probe as inconclusive rather than claim
the public page was verified or that the FTPS upload definitely failed.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

expected = os.environ["GITHUB_SHA"]
url = "https://avenqir.bg5.net/deploy-state.json"
reason = "not attempted"
for attempt in range(3):
    try:
        req = urllib.request.Request(
            url+"?check="+expected[:12]+"&try="+str(attempt),
            headers={"Cache-Control": "no-cache", "User-Agent": "AVENQIR-Release-Check/1"}
        )
        with urllib.request.urlopen(req, timeout=12) as r:
            body = r.read(64000)
        if b"slowAES.decrypt" in body or b"/aes.js" in body:
            reason = "SEUS returned an anti-bot challenge to the CI HTTP client"
            break
        if body.lstrip().startswith(b"<"):
            reason = "server returned HTML instead of the JSON deployment marker"
        else:
            data = json.loads(body)
            if isinstance(data,dict) and data.get("commit") == expected:
                print("PASS: public HTTPS deployment marker matches commit", expected[:12])
                sys.exit(0)
            reason = "deployment marker missing or reports another commit"
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as e:
        reason = type(e).__name__
    if attempt < 2:
        time.sleep(4)

print("HTTP_PROBE_INCONCLUSIVE:", reason)
print("Verify public browsing separately; the independent authenticated FTPS receipt is the file-delivery check.")
summary = os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary,"a",encoding="utf-8") as out:
        out.write("### HTTPS browser-level verification: INCONCLUSIVE\\n")
        out.write("Reason: "+reason+"\\n")
        out.write("Public browser execution is **not** certified by this probe. The independent FTPS checksum step separately verifies deployed bytes.\\n")
sys.exit(2)
