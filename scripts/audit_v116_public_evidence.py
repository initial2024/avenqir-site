#!/usr/bin/env python3
"""Read-only candidate audit: UK registry provenance and direct DAL delivery.
Does not change browser allowlists, deploy, or send user data. Standard library only.
Run --self-test offline; --uk and --dal independently for public network evidence.
"""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import unittest
import urllib.request
from urllib.parse import urlsplit
from audit_directory_links import SITE, SOURCES, load_array
from build_atlas_threat_snapshot import NoRedirect

UK_SOURCE = "https://assets.publishing.service.gov.uk/media/69cbd582024cdf09254f3f7d/List_of_.gov.uk_domain_names_as_of_31_March_2026_1.csv"
UK_AS_OF = "2026-03-31"
DAL_URL = "https://avenqir.bg5.net/.well-known/assetlinks.json"
LIMIT = 4 * 1024 * 1024
LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
UK_HOST = re.compile(rf"{LABEL}(?:\.{LABEL})*\.gov\.uk\Z")
RELATION = "delegate_permission/common.get_login_creds"

def download(url, accepted, limit=LIMIT):
    req = urllib.request.Request(url, headers={"User-Agent": "AVENQIR public provenance audit", "Accept": ", ".join(accepted)})
    with urllib.request.build_opener(NoRedirect).open(req, timeout=25) as response:
        if response.status != 200:
            raise ValueError("HTTP_STATUS_NOT_200")
        media = response.headers.get_content_type()
        if media not in accepted:
            raise ValueError("NON_JSON_HTML" if media == "text/html" else "UNEXPECTED_MEDIA_TYPE")
        data = response.read(limit + 1)
        if not data or len(data) > limit:
            raise ValueError("empty or oversized response")
        return data

def parse_uk(raw, minimum=1000):
    if not raw or len(raw) > LIMIT:
        raise ValueError("registry size")
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig", errors="strict")))
    fields = {h.strip().lower(): h for h in (reader.fieldnames or [])}
    column = fields.get("domain: domain name") or fields.get("domain name")
    if not column:
        raise ValueError("unrecognized UK domain column")
    domains = set()
    for row in reader:
        host = (row.get(column) or "").strip().lower()
        # Official DNS exports can contain service labels such as _dmarc.
        # Only ordinary HTTPS hostnames are eligible.
        if UK_HOST.fullmatch(host):
            domains.add(host)
    if len(domains) < minimum:
        raise ValueError("truncated or unrecognized UK registry")
    return domains

def uk_matches(items, domains):
    records = {}
    for item in items:
        url = item["url"]
        u = urlsplit(url)
        if u.scheme != "https" or u.username or u.password or u.port not in (None, 443):
            continue
        host = u.hostname or ""
        if not UK_HOST.fullmatch(host):
            continue
        labels = host.split(".")
        for i in range(len(labels)-2):
            registered = ".".join(labels[i:])
            if registered in domains:
                records[url] = {"registeredDomain": registered, "evidenceType": "registry-only"}
                break
    return records

def uk_report():
    raw = download(UK_SOURCE, ("text/csv", "text/plain", "application/octet-stream", "application/vnd.ms-excel"))
    domains = parse_uk(raw)
    items = load_array("atlas-catalog-core.js", "base") + load_array("atlas-catalog-core.js", "extras")
    for name in SOURCES:
        items += load_array(name, "links")
    records = uk_matches(items, domains)
    return {"source": UK_SOURCE, "sourceAsOf": UK_AS_OF,
            "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "sha256": hashlib.sha256(raw).hexdigest(), "registryDomains": len(domains),
            "catalogUrls": len(items), "matchedUrls": len(records), "records": records,
            "exactUrlApprovalAdded": 0}

def dal_targets(raw):
    rows = json.loads(raw)
    if not isinstance(rows, list):
        raise ValueError("DAL document must be an array")
    result = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("invalid DAL statement")
        if RELATION not in row.get("relation", []):
            continue
        target = row.get("target", {})
        if target.get("namespace") == "android_app":
            for pin in target.get("sha256_cert_fingerprints", []):
                if not re.fullmatch(r"(?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}", pin):
                    raise ValueError("invalid DAL signing fingerprint")
                result.add(("android_app", target["package_name"], pin.upper()))
        elif target.get("namespace") == "web":
            result.add(("web", target["site"]))
    return result

def dal_report():
    expected = dal_targets((SITE / ".well-known/assetlinks.json").read_bytes())
    if not any(x[0] == "android_app" for x in expected):
        raise ValueError("no expected Android credential association")
    actual = dal_targets(download(DAL_URL, ("application/json",), 65536))
    if actual != expected:
        raise ValueError("DAL_PINNED_TARGET_MISMATCH")
    return {"url": DAL_URL, "directHttpJsonAndPinnedTargets": "PASS",
            "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "devicePasskeyProven": False}

class Tests(unittest.TestCase):
    def test_uk(self):
        raw = b"Domain: Domain Name\nagency.gov.uk\nnested.agency.gov.uk\n_dmarc.gov.uk\n"
        domains = parse_uk(raw, 2)
        urls = ["https://www.agency.gov.uk/path", "https://nested.agency.gov.uk/",
                "https://agency.gov.uk.evil.org/", "https://unlisted.gov.uk/",
                "http://agency.gov.uk/", "https://agency.gov.uk:8443/",
                "https://agency.gov.uk@evil.org/", "https://_dmarc.gov.uk/"]
        hits = uk_matches([{"url": u} for u in urls], domains)
        self.assertEqual(set(hits), set(urls[:2]))
        self.assertEqual(hits[urls[1]]["registeredDomain"], "nested.agency.gov.uk")
        self.assertEqual(parse_uk(b"Domain name,Owner,Representing\nagency.gov.uk,A,B\n", 1), {"agency.gov.uk"})
        with self.assertRaises(ValueError):
            parse_uk(b"<html>challenge</html>", 1)
        with self.assertRaises(ValueError):
            parse_uk(raw, 3)

    def test_dal(self):
        pin = ":".join(["AA"]*32)
        raw = json.dumps([{"relation": [RELATION], "target": {"namespace": "android_app",
                          "package_name": "test.example", "sha256_cert_fingerprints": [pin]}}])
        self.assertEqual(dal_targets(raw), {("android_app", "test.example", pin)})
        with self.assertRaises(ValueError):
            dal_targets("<html>challenge</html>")
        with self.assertRaises(ValueError):
            dal_targets("{}")
        with self.assertRaises(ValueError):
            dal_targets(raw.replace(pin, "invalid"))

def main():
    p = argparse.ArgumentParser(description=__doc__)
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--uk", action="store_true")
    mode.add_argument("--dal", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(Tests)
        return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1
    try:
        print(json.dumps(uk_report() if args.uk else dal_report(), ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as exc:
        # Do not echo HTTP bodies or any local credential material.
        known = {"HTTP_STATUS_NOT_200", "NON_JSON_HTML", "UNEXPECTED_MEDIA_TYPE", "DAL_PINNED_TARGET_MISMATCH"}
        code = str(exc) if str(exc) in known else ("INVALID_JSON" if isinstance(exc, json.JSONDecodeError) else "UNCLASSIFIED")
        print(json.dumps({"status": "DENY", "reason": code, "errorType": type(exc).__name__, "httpStatus": getattr(exc, "code", None)}))
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
