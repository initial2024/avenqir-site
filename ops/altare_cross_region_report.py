#!/usr/bin/env python3
"""Altare read-only second-vantage AVENQIR monitor; optional GitHub Issue comment.

This script never changes AVENQIR's content, connects to admin endpoints,
handles email credentials, or opens an inbound port. Publishing requires an
explicit owner-provided GitHub fine-grained token scoped ONLY to Issues:write
on initial2024/avenqir-site. Without it, reports stay local.
"""
import argparse
import collections
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
ISSUE_COMMENTS = "https://api.github.com/repos/initial2024/avenqir-site/issues/21/comments"
TOKEN_FILE = Path("/root/.config/avenqir/github_issue_token")
STATE_FILE = Path("/opt/avenqir/state/last-published.json")
REPORTS = Path("/opt/avenqir/reports")
MAX_AGE_SECONDS = 7 * 86400


def summarize(report):
    counts = collections.Counter(x.get("status", "UNKNOWN") for x in report.get("results", []))
    locale = report.get("locale") or {}
    important = [x for x in report.get("results", [])
                 if x.get("status") in ("CANDIDATE_BROKEN", "UNKNOWN", "SKIP", "CHECK")]
    # "REVIEW" is not a claim that a third-party link is definitely broken.
    state = ("REVIEW" if counts["CANDIDATE_BROKEN"] or locale.get("status") == "FAIL"
             else "INCOMPLETE" if (important or locale.get("status") != "PASS"
                 or report.get("catalog_note")) else "NO_CANDIDATE")
    header = ("Altare second-vantage public audit | " + state + " | " +
              str(report.get("created_utc", "unknown UTC")))
    parts = [
        "<!-- altare-cross-region-public-audit-v1 -->",
        "### " + header,
        "",
        f"Fixed public endpoints: {report.get('fixed_endpoints', '?')}; "
        f"sampled third-party links: {report.get('sampled_links', '?')}; "
        f"locale packs: {locale.get('status', 'UNKNOWN')} "
        f"({locale.get('locales', '?')}/{locale.get('packs', '?')}).",
        f"HTTP status categories: {', '.join(k + '=' + str(v) for k, v in sorted(counts.items())) or 'none'}",
        "",
        "Items requiring separate investigation (maximum 15):",
    ]
    for entry in important[:15]:
        url = str(entry.get("url", ""))[:160].replace("\n", "").replace("\r", "")
        code = str(entry.get("code", "?"))
        parts.append("- " + str(entry.get("status", "UNKNOWN")) + " HTTP " + code +
                     " — `" + url.replace("`", "") + "`")
    if not important:
        parts.append("- No candidates detected in this sample.")
    parts += ["",
              "Read-only external vantage, not a device speed measurement. "
              "403/429/redirects/timeouts are not evidence that a link is broken. "
              "HTTP 200 is not a security certificate. No auto-delete or admin access."]
    return state, "\n".join(parts)


def publish(comment, token):
    if not token:
        return "LOCAL_ONLY"
    request = urllib.request.Request(
        ISSUE_COMMENTS, data=json.dumps({"body": comment}).encode("utf-8"),
        method="POST",
        headers={"Authorization": "Bearer " + token,
                 "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28",
                 "Content-Type": "application/json",
                 "User-Agent": "Altare-AVENQIR-public-monitor/1"},
    )
    with urllib.request.urlopen(request, timeout=15) as res:
        if res.status != 201:
            raise RuntimeError("GitHub did not confirm comment creation")
        obj = json.load(res)
        return str(obj.get("html_url", "PUBLISHED"))


def load_state():
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    os.chmod(STATE_FILE, 0o600)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--sample", type=int, default=20)
    p.add_argument("--local-only", action="store_true",
                   help="never read token or publish a GitHub Issue comment")
    args = p.parse_args()
    if not 0 <= args.sample <= 40:
        p.error("--sample must be 0..40")
    REPORTS.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, str(HERE / "altare_readonly_audit.py"),
           "--vantage", "altare", "--sample", str(args.sample),
           "--report-dir", str(REPORTS)]
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=480,
                         check=False)
    if run.returncode:
        print("COLLECTOR_FAILED", run.returncode)
        print(run.stdout[-5000:])
        print(run.stderr[-1500:])
        return 2
    reports = sorted(REPORTS.glob("public-audit-*.json"))
    if not reports:
        print("ERROR: No JSON evidence produced")
        return 2
    source = reports[-1]
    report = json.loads(source.read_text(encoding="utf-8"))
    state, comment = summarize(report)
    now = time.time()
    token = ""
    if not args.local_only and TOKEN_FILE.is_file():
        # Require owner-readable credentials; fail closed on broad permissions.
        if TOKEN_FILE.stat().st_mode & 0o077:
            print("TOKEN_PERMISSIONS_TOO_OPEN: chmod 600 " + str(TOKEN_FILE))
            return 3
        token = TOKEN_FILE.read_text(encoding="utf-8").strip()
    previous = load_state()
    # A normal report is posted once a week; publish earlier if category
    # or locale status changes. No repeated comments every few hours.
    signature = state + "|" + str(report.get("locale", {}).get("status", "?")) + "|" + str(
        collections.Counter(x.get("status") for x in report.get("results", [])))
    due = (previous.get("signature") != signature or
           now - float(previous.get("published_epoch", 0)) >= MAX_AGE_SECONDS)
    outcome = "LOCAL_ONLY"
    if token and due:
        try:
            outcome = publish(comment, token)
            save_state({"signature": signature, "published_epoch": now,
                        "last_url": outcome})
        except (urllib.error.URLError, ValueError, RuntimeError) as err:
            # No auth tokens or response bodies are printed.
            outcome = "GITHUB_PUBLISH_FAILED_" + type(err).__name__
    elif token:
        outcome = "UNCHANGED_NO_SPAM"
    # Keep at most 28 reports; never truncate before the newly completed test.
    for old in reports[:-28]:
        try:
            old.unlink()
        except OSError:
            pass
    print("=== ALTARE AVENQIR SECOND-VANTAGE RESULT ===")
    print("STATE:", state)
    print("SOURCE:", source)
    print("SAMPLED:", report.get("sampled_links", 0))
    print("PUBLISH:", outcome)
    print(comment[:4500])
    print("=== END ALTARE REPORT ===")
    return 0 if outcome != "GITHUB_PUBLISH_FAILED_URLError" else 4


if __name__ == "__main__":
    raise SystemExit(main())
