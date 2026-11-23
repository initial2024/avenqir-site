"""Offline Altare second-vantage checks: no network calls or real credentials."""
import json
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch
from ops import altare_cross_region_report as monitor


class AltareSecondVantageTests(TestCase):
    def sample(self, state="OK"):
        return {
            "created_utc": "2026-11-23T14:00:00+00:00",
            "fixed_endpoints": 5,
            "sampled_links": 1,
            "locale": {"status": "PASS", "locales": 40, "packs": 40},
            "results": [
                {"url": "https://avenqir.bg5.net/", "status": "OK", "code": 200, "ms": 40},
                {"url": "https://www.example.org/", "status": state,
                 "code": 404 if state == "CANDIDATE_BROKEN" else 302, "ms": 80},
            ],
        }

    def test_unknown_is_not_considered_broken(self):
        status, comment = monitor.summarize(self.sample("UNKNOWN"))
        self.assertEqual(status, "INCOMPLETE")
        self.assertIn("not evidence that a link is broken", comment)
        self.assertIn("40/40", comment)
        self.assertNotIn("Bearer ", comment)

    def test_missing_is_review_candidate_not_auto_delete(self):
        status, comment = monitor.summarize(self.sample("CANDIDATE_BROKEN"))
        self.assertEqual(status, "REVIEW")
        self.assertIn("No auto-delete", comment)
        self.assertIn("HTTP 404", comment)

    def test_publish_does_nothing_when_no_token(self):
        with patch.object(monitor.urllib.request, "urlopen") as network:
            result = monitor.publish("test", "")
        self.assertEqual(result, "LOCAL_ONLY")
        network.assert_not_called()

    def test_local_state_is_private(self):
        with tempfile.TemporaryDirectory() as folder:
            state = Path(folder) / "last-published.json"
            with patch.object(monitor, "STATE_FILE", state):
                monitor.save_state({"signature": "INCOMPLETE|UNKNOWN", "published_epoch": 1.0})
                self.assertEqual(monitor.load_state()["published_epoch"], 1.0)
            self.assertEqual(state.stat().st_mode & 0o077, 0)

    def test_explicit_local_only_will_not_read_token_or_make_network_calls(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            reports = root / "reports"
            reports.mkdir()
            (reports / "public-audit-20261123-123456.json").write_text(
                json.dumps(self.sample("UNKNOWN")), encoding="utf-8"
            )
            collector = type("Result", (), {"returncode": 0, "stdout": "", "stderr": ""})()
            with (patch.object(monitor, "REPORTS", reports),
                  patch.object(monitor, "TOKEN_FILE", root / "must-not-read"),
                  patch.object(monitor, "STATE_FILE", root / "state.json"),
                  patch.object(monitor.subprocess, "run", return_value=collector) as run,
                  patch.object(monitor, "publish") as publish,
                  patch("sys.argv", ["audit", "--local-only", "--sample", "0"])):
                self.assertEqual(monitor.main(), 0)
                self.assertIn("--sample", run.call_args.args[0])
                publish.assert_not_called()
