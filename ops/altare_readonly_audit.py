#!/usr/bin/env python3
"""Read-only public AVENQIR audit for a small Altare sandbox.

No tokens, cookies, account endpoints, mutations, redirects, browser sessions,
automatic deletion, or public API writes. HTTP status alone is not a safety
certificate. Run on demand or once a week, not as an aggressive crawler.
"""
import argparse
import datetime as dt
import ipaddress
import json
import pathlib
import random
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = "https://avenqir.bg5.net"
CATALOG = "https://raw.githubusercontent.com/initial2024/avenqir-site/main/site/atlas-everyday.js"
FIXED = (
    ROOT + "/",
    ROOT + "/directory.html",
    ROOT + "/aq-i18n.js",
    ROOT + "/atlas-region-ui.js",
    "https://inbox.kango99w.de/",
)
USER_AGENT = "AVENQIR-public-readonly-audit/1.0 (non-invasive)"
LIMIT = 180_000
TIMEOUT = 8


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def safe_public_https(url):
    try:
        item = urllib.parse.urlsplit(url)
        if item.scheme != "https" or not item.hostname or item.username or item.password:
            return False
        if item.port not in (None, 443):
            return False
        host = item.hostname.lower().rstrip(".")
        if host in {"localhost", "metadata.google.internal"} or host.endswith((".local", ".internal", ".localhost")):
            return False
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        if not addresses:
            return False
        for entry in addresses:
            address = ipaddress.ip_address(entry[4][0])
            if not address.is_global:
                return False
        return True
    except (OSError, ValueError):
        return False


def request(url, method="HEAD"):
    if not safe_public_https(url):
        return {"status": "SKIP", "code": 0, "ms": 0, "note": "not a public HTTPS host"}
    start = time.monotonic()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method=method)
    try:
        with OPENER.open(req, timeout=TIMEOUT) as response:
            code = response.status
            data = response.read(LIMIT + 1) if method == "GET" else b""
            return {"status": "OK" if 200 <= code < 300 else "CHECK",
                    "code": code, "ms": round((time.monotonic()-start)*1000),
                    "bytes": len(data), "truncated": len(data) > LIMIT,
                    "body": data[:LIMIT] if method == "GET" else b""}
    except urllib.error.HTTPError as exc:
        code = exc.code
        # A 301/302, 401, 403 or 429 is not proof of a broken site.
        label = "CANDIDATE_BROKEN" if code in (404, 410) else "UNKNOWN"
        return {"status": label, "code": code, "ms": round((time.monotonic()-start)*1000)}
    except (OSError, TimeoutError, ValueError) as exc:
        return {"status": "UNKNOWN", "code": 0,
                "ms": round((time.monotonic()-start)*1000),
                "note": type(exc).__name__}


def js_json(body, prefix):
    source = body.decode("utf-8", errors="replace")
    at = source.find(prefix)
    if at < 0:
        raise ValueError("Missing JS source marker " + prefix)
    parsed, _ = json.JSONDecoder().raw_decode(source[at + len(prefix):].lstrip())
    return parsed


def link_sample(count, week):
    response = request(CATALOG, "GET")
    if response["status"] != "OK" or response.get("truncated"):
        return [], "catalog fetch failed"
    try:
        entries = js_json(response["body"], "const links=")
        urls = {entry.get("url", "") for entry in entries if isinstance(entry, dict)}
        urls = sorted(x for x in urls if x.startswith("https://"))
        random.Random(week).shuffle(urls)
        return urls[:count], ""
    except (ValueError, TypeError, json.JSONDecodeError):
        return [], "catalog parse failed"


def locale_audit():
    first = request(ROOT + "/aq-i18n.js", "GET")
    second = request(ROOT + "/atlas-region-ui.js", "GET")
    if any(x["status"] != "OK" or x.get("truncated") for x in (first, second)):
        return {"status": "UNKNOWN", "note": "locale assets unavailable"}
    try:
        locales = js_json(first["body"], "const LOCALES=")
        words = js_json(second["body"], "const WORDS=Object.freeze(")
        expected = {x["code"] for x in locales}
        available = set(words)
        missing = sorted(expected - available)
        undersized = sorted(k for k, v in words.items() if not isinstance(v, list) or len(v) != 8)
        return {"status": "PASS" if not missing and not undersized else "FAIL",
                "locales": len(expected), "packs": len(available),
                "missing": missing, "invalid_packs": undersized}
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        return {"status": "UNKNOWN", "note": type(exc).__name__}


def public_status_row(url):
    # GET responses can contain JS source bytes for in-memory parsing. Audit
    # evidence must contain metadata only, never raw page contents or bytes
    # (which are not JSON serializable).
    result = request(url, "HEAD").copy()
    result.pop("body", None)
    return {"url": url, **result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=int, default=20, help="0..40 third-party links per run")
    parser.add_argument("--report-dir", default="/opt/utility/reports")
    parser.add_argument("--vantage", choices=("altare", "github-actions"),
                        default="altare", help="Label the actual external measurement point")
    args = parser.parse_args()
    if not 0 <= args.sample <= 40:
        parser.error("--sample must be 0..40")
    today = dt.datetime.now(dt.timezone.utc)
    rows = []
    for url in FIXED:
        rows.append(public_status_row(url))
    week = int(today.strftime("%G%V"))
    urls, catalog_note = link_sample(args.sample, week) if args.sample else ([], "")
    for url in urls:
        rows.append(public_status_row(url))
        time.sleep(0.35)
    locales = locale_audit()
    report = {
        "created_utc": today.isoformat(timespec="seconds"),
        "region": ("Altare sandbox" if args.vantage == "altare" else "GitHub Actions runner") +
                  " external network only (not Android user speed)",
        "fixed_endpoints": len(FIXED),
        "sampled_links": len(urls),
        "catalog_note": catalog_note,
        "locale": locales,
        "results": rows,
    }
    folder = pathlib.Path(args.report_dir)
    folder.mkdir(parents=True, exist_ok=True)
    name = "public-audit-" + today.strftime("%Y%m%d-%H%M%S") + ".json"
    (folder / name).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    counts = {}
    for row in rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    print("=== AVENQIR READ-ONLY PUBLIC AUDIT ===")
    print("Vantage:", args.vantage)
    print("UTC:", report["created_utc"])
    print("Endpoints:", len(FIXED), "Catalog sample:", len(urls),
          "Locales:", locales.get("status"), locales.get("locales", "?"))
    print("Status totals:", json.dumps(counts, ensure_ascii=False))
    if catalog_note:
        print("Catalog:", catalog_note)
    for row in rows:
        print("{:17} HTTP={:<3} {:>6}ms {}".format(
            row["status"], row["code"], row["ms"], row["url"][:105]))
    print("CANDIDATE_BROKEN = needs manual review; never auto-remove.")
    print("UNKNOWN = timeout/redirect/403/rate limit; not proof of failure.")
    print("Full report:", folder / name)
    print("=== END PUBLIC AUDIT ===")
    if args.vantage == "github-actions":
        print("Auto-published to one GitHub Issue after artifact upload.")


if __name__ == "__main__":
    main()
