#!/usr/bin/env python3
"""Generate a complete local reviewer queue; never approve or contact destinations."""
import argparse
import json
import re
from collections import Counter
from urllib.parse import urlsplit
from audit_directory_links import SITE, SOURCES, load_array, audit

def queue():
    report = audit()
    gate = (SITE / "link-gate.js").read_text(encoding="utf-8")
    match = re.search(r"const OFFICIAL_URLS\s*=\s*\[([\s\S]*?)\];", gate)
    reviewed = set(re.findall(r"'(https://[^']+)'", match.group(1)))
    items = load_array("atlas-catalog-core.js", "base") + load_array("atlas-catalog-core.js", "extras")
    for name in SOURCES:
        items += load_array(name, "links")
    rows = [{"id": x["id"], "name": x["name"], "url": x["url"],
             "category": x["category"], "host": urlsplit(x["url"]).hostname,
             "region": x.get("region"), "status": "pending_official_identity"}
            for x in items if x["url"] not in reviewed]
    rows.sort(key=lambda x: (x["category"], x["host"], x["url"]))
    if len(rows) != report["provenance_unreviewed"]:
        raise ValueError("queue coverage mismatch")
    return {"total": len(items), "reviewed": len(reviewed), "pending": len(rows),
            "pendingByCategory": dict(sorted(Counter(x["category"] for x in rows).items())),
            "records": rows}

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--summary", action="store_true")
    args = p.parse_args()
    result = queue()
    if args.summary:
        del result["records"]
    print(json.dumps(result, ensure_ascii=False, indent=2))
