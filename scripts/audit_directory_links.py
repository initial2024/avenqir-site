#!/usr/bin/env python3
"""Fail-closed structural audit of publicly curated Atlas links.

Checks URL syntax, duplicate destinations/IDs, local/private/reserved endpoints, catalogue
coverage and exact provenance allowlist membership. Not a remote malware scan, Safe
Browsing verdict, transport certification or a guarantee of current availability.
No network calls, no location lookup, no user data.
"""
from __future__ import annotations

import ipaddress
import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SOURCES = (
    "atlas-paths.js", "atlas-expansion.js", "atlas-specialist.js",
    "atlas-depth-a.js", "atlas-depth-b.js", "atlas-depth-c.js", "atlas-depth-d.js",
    "atlas-ai.js", "atlas-regional.js", "atlas-everyday.js",
    "atlas-regional-ext.js", "atlas-everyday-ext.js",
)
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rb.gy", "shorturl.at"}
BAD_SUFFIX = (".localhost", ".local", ".internal", ".test", ".invalid", ".example")
BAD_HOST = {"localhost", "0.0.0.0", "localhost.localdomain"}
WARN_TLDS = (".zip", ".mov")


def load_array(file: str, name: str) -> list[dict]:
    content = (SITE / file).read_text(encoding="utf-8")
    match = re.search(r"\bconst\s+" + re.escape(name) + r"\s*=\s*(\[[^;]*\]);", content)
    if not match:
        raise ValueError(f"{file}: missing or unparsable {name} array")
    value = json.loads(match.group(1))
    if not isinstance(value, list):
        raise ValueError(f"{file}: {name} is not an array")
    return value


def audit_url(raw: str) -> tuple[str, list[str]]:
    if not isinstance(raw, str) or not raw.startswith("https://") or len(raw) > 1800:
        raise ValueError("not a valid HTTPS URL")
    if any(ord(c) < 33 or ord(c) == 127 for c in raw) or "\\" in raw:
        raise ValueError("whitespace, control char or backslash in URL")
    u = urlsplit(raw)
    if u.scheme != "https" or not u.hostname or u.username or u.password:
        raise ValueError("wrong scheme, missing host or embedded credentials")
    if u.port not in (None, 443):
        raise ValueError("unexpected port")
    host = u.hostname.lower().rstrip(".")
    if host in BAD_HOST or host.endswith(BAD_SUFFIX) or "." not in host:
        raise ValueError("local/private or unqualified host")
    if any(not part or len(part) > 63 for part in host.split(".")):
        raise ValueError("invalid host labels")
    warnings = []
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
        if not ip.is_global:
            raise ValueError("non-global IP endpoint")
        warnings.append("public IP literal; cannot infer identity")
    except ValueError as err:
        if str(err) == "non-global IP endpoint":
            raise
    if host in SHORTENERS:
        raise ValueError("opaque short URL redirector is not allowed in curated catalog")
    if "xn--" in host:
        warnings.append("punycode hostname needs human review")
    if host.endswith(WARN_TLDS):
        warnings.append("high-confusion file-extension TLD")
    if u.query or u.fragment:
        warnings.append("query/fragment: never auto-approve as source-verified")
    return raw, warnings


def catalog_entries() -> list[dict]:
    base = load_array("atlas-catalog-core.js", "base")
    extras = load_array("atlas-catalog-core.js", "extras")
    all_links = base + extras
    for file in SOURCES:
        all_links.extend(load_array(file, "links"))
    return all_links


def official_urls() -> list[str]:
    gate = (SITE / "link-gate.js").read_text(encoding="utf-8")
    match = re.search(r"const OFFICIAL_URLS\s*=\s*\[([\s\S]*?)\];", gate)
    if not match:
        raise ValueError("provenance allowlist missing")
    return re.findall(r"'(https://[^']+)'", match.group(1))


def audit_review_evidence(catalog: dict, reviewed: set) -> dict:
    evidence_urls = set()
    superseded = set()
    structured = set()
    for path in sorted(SITE.glob("atlas-review-*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        strict = document.get("schema") == "avenqir-exact-source-review-v1"
        for row in document["records"]:
            url = row["url"]
            audit_url(url)
            if not strict:
                evidence_urls.add(url)
                continue
            status = row["status"]
            if status not in {"confirmed", "revoked", "pending"}:
                raise ValueError(f"{path.name}: unrecognized review status for {url}")
            if not row.get("reason") or not row.get("checkedAt"):
                raise ValueError(f"{path.name}: missing date or decision reason for {url}")
            if status == "revoked":
                superseded.add(url)
            if status != "confirmed":
                continue
            evidence = row.get("evidence")
            reference = row.get("retrieval") == "publisher-reference"
            if url in structured or not evidence or (not reference and not row.get("title")):
                raise ValueError(f"{path.name}: duplicate or unsupported confirmation for {url}")
            original = row["originalUrl"]
            chain = row["redirectChain"]
            observed = row["finalUrl"]
            if reference:
                audit_url(row["source"])
                if (
                    original != url or observed not in {url, None} or row["source"] == url
                    or evidence.get("exactDestination") != url or not evidence.get("publisherPageTitle")
                ):
                    raise ValueError(f"{path.name}: reference must identify the exact destination: {url}")
            elif observed != url:
                raise ValueError(f"{path.name}: confirmation does not match final URL: {url}")
            if chain:
                if (
                    chain[0]["url"] != original or chain[-1]["url"] != observed
                    or chain[-1]["status"] != row["httpStatus"]
                    or any(hop.get("location") != successor["url"] for hop, successor in zip(chain, chain[1:]))
                ):
                    raise ValueError(f"{path.name}: invalid response chain for {url}")
            elif not reference or observed is not None or row["httpStatus"] is not None:
                raise ValueError(f"{path.name}: missing HTTP observations for {url}")
            if original != url:
                destination = row.get("independentDestination", {})
                if row.get("previousUrl") != original or destination.get("chain") != [{"url": url, "status": 200}]:
                    raise ValueError(f"{path.name}: migration lacks independent exact retrieval for {url}")
                superseded.add(original)
            if url in catalog and (row["id"], row["category"]) != (catalog[url]["id"], catalog[url]["category"]):
                raise ValueError(f"{path.name}: catalog identifier or category changed for {url}")
            structured.add(url)
            evidence_urls.add(url)
    if superseded & reviewed:
        raise ValueError("superseded provenance still allowlisted: " + ", ".join(sorted(superseded & reviewed)))
    stale = evidence_urls - reviewed - superseded
    if stale:
        raise ValueError("unsuperseded evidence absent from allowlist: " + ", ".join(sorted(stale)))
    return {
        "allowlist_with_evidence": len(evidence_urls & reviewed),
        "allowlist_without_evidence": len(reviewed - evidence_urls),
        "structured_confirmations": len(structured & reviewed),
    }


def audit() -> dict:
    core = (SITE / "atlas-catalog-core.js").read_text(encoding="utf-8")
    all_links = catalog_entries()
    if len(all_links) < 1000:
        raise ValueError("catalog unexpectedly shrank below 1000 entries")
    urls, identifiers, cats = set(), set(), Counter()
    regions, everyday = Counter(), Counter()
    warnings = {}
    for idx, entry in enumerate(all_links):
        if not isinstance(entry, dict):
            raise ValueError(f"entry {idx}: not an object")
        name, cat, ident = entry.get("name"), entry.get("category"), entry.get("id")
        if not all(isinstance(x, str) and x.strip() for x in (name, cat, ident, entry.get("description"))):
            raise ValueError(f"entry {idx}: required fields missing")
        if ident in identifiers:
            raise ValueError(f"duplicate record id: {ident}")
        identifiers.add(ident)
        try:
            url, issues = audit_url(entry.get("url"))
        except (ValueError, TypeError) as exc:
            raise ValueError(f"{name}: {exc}") from exc
        if url in urls:
            raise ValueError(f"duplicate URL: {url}")
        urls.add(url)
        cats[cat] += 1
        if issues:
            warnings[url] = issues
        region = entry.get("region")
        if region:
            regions[region] += 1
            if entry.get("localUse") == "everyday":
                everyday[region] += 1
    if len(cats) < 50 or min(cats.values()) < 8:
        raise ValueError("category coverage regressed")
    if len(regions) != 40 or any(n < 9 or everyday[k] < 4 for k, n in regions.items()):
        raise ValueError("country/region coverage regressed")
    if "AVENQIR_ATLAS_REGIONAL_EXT" not in core or "AVENQIR_ATLAS_EVERYDAY_EXT" not in core:
        raise ValueError("canonical browser catalog excludes extended resources")
    reviewed = official_urls()
    if len(reviewed) != len(set(reviewed)):
        raise ValueError("duplicate provenance records")
    for url in reviewed:
        audit_url(url)
        if url not in urls:
            raise ValueError("provenance URL no longer in catalog: " + url)
    evidence = audit_review_evidence({row["url"]: row for row in all_links}, set(reviewed))
    return {
        **evidence,
        "checked": len(all_links), "unique_urls": len(urls),
        "categories": len(cats), "regions": len(regions),
        "official_exact_url_provenance": len(reviewed),
        "provenance_unreviewed": len(urls) - len(reviewed),
        "structural_attention": len(warnings),
        "structural_warnings": warnings,
        "network_scanning_performed": False,
        "external_malware_verdicts": None,
    }


if __name__ == "__main__":
    try:
        result = audit()
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"ATLAS_SECURITY_AUDIT_DENY: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print("ATLAS_SECURITY_AUDIT_PASS: " + json.dumps({
        k: v for k, v in result.items() if k != "structural_warnings"
    }, ensure_ascii=False, sort_keys=True))
    if result["structural_warnings"]:
        print("ATLAS_SECURITY_ATTENTION: " + json.dumps(
            result["structural_warnings"], ensure_ascii=False, sort_keys=True))
