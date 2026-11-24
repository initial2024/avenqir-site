#!/usr/bin/env python3
"""Collect public observations for manual exact-URL attribution.

The collector never edits the catalog or promotes a URL to the allowlist.
Review the response and first-party corroboration before making a decision.
Use the same state directory to resume, including after interruption.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import gzip
import hashlib
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import re
import socket
import threading
import time
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import zlib

from audit_directory_links import SITE, audit_url, catalog_entries, official_urls

BATCH_SIZE = 150
MAX_HOPS = 8
MAX_BYTES = 524_288
REDIRECTS = {301, 302, 303, 307, 308}
RETRYABLE = {408, 425, 429, 500, 502, 503, 504}
CHALLENGE = re.compile(
    r"just a moment|attention required|access denied|request blocked|"
    r"checking your browser|verify you are human|client challenge|captcha", re.I
)
IDENTITY = re.compile(
    r"copyright|©|operated by|maintained by|provided by|published by|part of|"
    r"developed by|managed by|official website of|privacy policy|all rights reserved|"
    r"版权所有|版權所有|著作権|mentions légales|aviso legal", re.I
)


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean(text, limit=350):
    return " ".join(text.split())[:limit]


def public_url(url):
    parsed, warnings = audit_url(url)
    parts = urlsplit(parsed)
    if warnings or parts.query or parts.fragment or len(parsed) > 1024:
        raise ValueError("URL requires manual review")
    if not re.fullmatch(r"(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*", parts.hostname):
        raise ValueError("nonstandard public hostname")
    return parsed


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Page(HTMLParser):
    def __init__(self, url):
        super().__init__(convert_charrefs=True)
        self.url = url
        self.title = []
        self.heading = []
        self.text = []
        self.meta = {}
        self.links = {}
        self.context = []
        self.anchor = None
        self.head_title_ended = False
        self.refresh = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"h1", "script", "style", "noscript", "template", "svg"}:
            self.context.append(tag)
        if tag == "title" and not self.head_title_ended and "svg" not in self.context:
            self.context.append(tag)
        if tag == "meta":
            if (attrs.get("http-equiv") or "").lower() == "refresh":
                self.refresh = True
            key = (attrs.get("property") or attrs.get("name") or "").lower()
            if key in {"og:site_name", "og:title", "description", "og:description", "author", "publisher", "application-name"}:
                self.meta[key] = clean(attrs.get("content") or "")
        if tag == "a" and attrs.get("href"):
            self.anchor = (attrs["href"], [])

    def handle_endtag(self, tag):
        if tag in self.context:
            self.context.remove(tag)
            if tag == "title":
                self.head_title_ended = True
        if tag == "a" and self.anchor:
            href, label = self.anchor
            self.anchor = None
            name = clean(" ".join(label), 120)
            if name and len(self.links) < 350:
                try:
                    self.links[public_url(urljoin(self.url, href))] = name
                except ValueError:
                    pass

    def handle_data(self, raw):
        if any(x in self.context for x in ("script", "style", "noscript", "template", "svg")):
            return
        data = clean(raw)
        if not data:
            return
        if self.anchor:
            self.anchor[1].append(data)
        if "title" in self.context:
            self.title.append(data)
        elif "h1" in self.context:
            self.heading.append(data)
        self.text.append(data)

    def evidence(self):
        return {
            "title": clean(" ".join(self.title)),
            "heading": clean(" ".join(self.heading)),
            "metadata": self.meta,
            "identity_excerpts": list(dict.fromkeys(t for t in self.text if IDENTITY.search(t)))[:18],
            "opening_text": clean(" ".join(self.text), 950),
            "links": self.links,
        }


def retry_after(value):
    now = datetime.now(timezone.utc)
    try:
        if value and value.isdecimal():
            return now + timedelta(seconds=int(value))
        if value:
            return max(now, parsedate_to_datetime(value))
    except (TypeError, OverflowError, ValueError):
        pass
    return now + timedelta(seconds=60)


class Collector:
    def __init__(self, timeout, interval):
        self.timeout = timeout
        self.interval = interval
        self.lock = threading.Lock()
        self.last_request = {}
        self.cooldown = {}

    def pace(self, host):
        with self.lock:
            if self.cooldown.get(host, 0) > time.monotonic():
                raise ValueError("host paused following access restrictions")
            start = max(time.monotonic(), self.last_request.get(host, 0) + self.interval)
            self.last_request[host] = start
        time.sleep(max(0, start - time.monotonic()))
        with self.lock:
            if self.cooldown.get(host, 0) > time.monotonic():
                raise ValueError("host paused following access restrictions")

    def probe(self, original):
        out = {"checked_at": utc_now(), "final_url": None, "status": None, "chain": []}
        current = original
        # No cookie jar or authentication handlers. Each redirect gets a fresh request.
        opener = build_opener(NoRedirect())
        try:
            for _ in range(MAX_HOPS):
                public_url(current)
                host = urlsplit(current).hostname
                addresses = {info[4][0] for info in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
                if not addresses or not all(ipaddress.ip_address(ip).is_global for ip in addresses):
                    raise ValueError("destination DNS includes a non-public IP")
                self.pace(host)
                request = Request(current, headers={
                    "User-Agent": "AVENQIR-Source-Review/1.0",
                    "Accept-Encoding": "identity",
                    "Accept": "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.1",
                })
                try:
                    response = opener.open(request, timeout=self.timeout)
                except HTTPError as error:
                    response = error
                with response:
                    out.update(status=response.code, final_url=current)
                    step = {"url": current, "status": response.code}
                    out["chain"].append(step)
                    if response.code in REDIRECTS:
                        location = response.headers.get("Location")
                        if not location:
                            raise ValueError("redirect without a Location")
                        target = urljoin(current, location)
                        try:
                            public_url(target)
                        except ValueError as error:
                            step["location_redacted"] = True
                            raise ValueError("redirect target requires manual review") from error
                        step["location"] = target
                        if target == current or any(hop["url"] == target for hop in out["chain"]):
                            raise ValueError("redirect loop")
                        current = target
                        continue
                    if response.code in {403, 429}:
                        until = retry_after(response.headers.get("Retry-After"))
                        out["retry_after"] = until.isoformat()
                        with self.lock:
                            self.cooldown[host] = time.monotonic() + (until - datetime.now(timezone.utc)).total_seconds()
                    if response.code != 200:
                        out["issue"] = f"HTTP {response.code}"
                        return out
                    if response.headers.get_content_type() not in {"text/html", "application/xhtml+xml"}:
                        out["issue"] = "non-HTML response"
                        return out
                    encoding = response.headers.get("Content-Encoding", "identity").lower()
                    if encoding in {"gzip", "x-gzip"}:
                        with gzip.GzipFile(fileobj=response) as stream:
                            raw = stream.read(MAX_BYTES)
                    elif encoding == "deflate":
                        raw = zlib.decompressobj().decompress(response.read(MAX_BYTES), MAX_BYTES)
                    elif encoding == "identity":
                        raw = response.read(MAX_BYTES)
                    else:
                        out["issue"] = "unsupported content encoding"
                        return out
                    try:
                        html = raw.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
                    except LookupError:
                        html = raw.decode("utf-8", errors="replace")
                    page = Page(current)
                    page.feed(html)
                    out.update(page.evidence())
                    if CHALLENGE.search(out["title"]) or ("slowAES.decrypt" in html and "/aes.js" in html):
                        with self.lock:
                            self.cooldown[host] = time.monotonic() + 60
                        out["issue"] = "potential anti-bot challenge"
                    elif page.refresh or "this page will automatically redirect" in out["opening_text"].lower():
                        out["issue"] = "page indicates a client-side redirect"
                    elif not out["title"]:
                        out["issue"] = "no HTML title"
                    return out
            out["issue"] = "redirect limit reached"
        except (OSError, ValueError, EOFError, zlib.error) as error:
            out["issue"] = str(error) if isinstance(error, ValueError) else type(error).__name__
        return out

    def evidence(self, item, previous=None):
        observation = self.probe(item["url"])
        result = {
            "id": item["id"], "name": item["name"], "category": item["category"],
            "url": item["url"], "status": "pending",
            "reason": observation.get("issue", "requires first-party attribution review"),
            "attempts": (previous or {}).get("attempts", []) + [observation],
        }
        if (
            observation["status"] == 200 and observation["final_url"] != item["url"]
            and not observation.get("issue")
        ):
            result["independent_destination"] = self.probe(observation["final_url"])
        return result


def state_path(directory, url):
    return directory / (hashlib.sha256(url.encode()).hexdigest() + ".json")


def read_state(directory, url):
    p = state_path(directory, url)
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else None


def write_json(path, data):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def retryable(record, attempt_limit):
    if not record or len(record["attempts"]) >= attempt_limit:
        return False
    last = record["attempts"][-1]
    # Leave 403 and explicit challenges to alternate sources.
    if last["status"] == 403 or last.get("issue") == "potential anti-bot challenge":
        return False
    if last.get("retry_after") and datetime.fromisoformat(last["retry_after"]) > datetime.now(timezone.utc):
        return False
    return last["status"] is None or last["status"] in RETRYABLE or last.get("issue") in {
        "no HTML title", "unsupported content encoding", "BadGzipFile",
    }


def batches(entries):
    # Stable grouping across repeated runs and URL migrations.
    ordered = sorted(entries, key=lambda x: x["id"])
    return [ordered[i:i+BATCH_SIZE] for i in range(0, len(ordered), BATCH_SIZE)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--export", type=Path, help="write observations and pending lists")
    parser.add_argument("--scope", choices=("all", "pending", "registered"), default="all")
    parser.add_argument("--batch", type=int, action="append", help="select stable 1-based batch number")
    parser.add_argument("--workers", type=int, choices=range(1, 25), default=10)
    parser.add_argument("--timeout", type=float, default=12)
    parser.add_argument("--host-interval", type=float, default=1.5)
    parser.add_argument("--retry", action="store_true")
    parser.add_argument("--attempt-limit", type=int, choices=range(1, 6), default=3)
    parser.add_argument("--export-only", action="store_true")
    args = parser.parse_args()
    if args.timeout <= 0 or args.host_interval < 1:
        parser.error("positive timeout and host interval of at least one second required")
    if args.export_only and not args.export:
        parser.error("--export-only requires --export")
    entries = catalog_entries()
    registered = set(official_urls())
    grouped = batches(entries)
    if args.batch and any(batch not in range(1, len(grouped) + 1) for batch in args.batch):
        parser.error("unknown batch number")
    args.state.mkdir(parents=True, exist_ok=True)
    collector = Collector(args.timeout, args.host_interval)
    if not args.export_only:
        queue = []
        for i, batch in enumerate(grouped, 1):
            if args.batch and i not in args.batch:
                continue
            for item in batch:
                approved = item["url"] in registered
                if (args.scope == "pending" and approved) or (args.scope == "registered" and not approved):
                    continue
                previous = read_state(args.state, item["url"])
                if not previous or (args.retry and retryable(previous, args.attempt_limit)):
                    queue.append((item, previous))

        def collect(candidate):
            item, previous = candidate
            value = collector.evidence(item, previous)
            write_json(state_path(args.state, item["url"]), value)
            return value["reason"]

        with ThreadPoolExecutor(args.workers) as pool:
            results = list(pool.map(collect, queue))
        print(f"Observations saved: {len(results)}")

    if args.export:
        args.export.mkdir(parents=True, exist_ok=True)
        pending = []
        for i, batch in enumerate(grouped, 1):
            records = []
            for item in batch:
                record = read_state(args.state, item["url"])
                if record:
                    records.append(record)
                if item["url"] not in registered:
                    pending.append({
                        **{key: item[key] for key in ("id", "name", "category", "url")},
                        "reason": record["reason"] if record else "not yet collected",
                    })
            if records:
                write_json(args.export / f"batch-{i:02}.json", {"batch": i, "records": records})
        write_json(args.export / "pending.json", pending)
        print(f"Pending exact URLs: {len(pending)}")


if __name__ == "__main__":
    main()
