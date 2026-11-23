"""AVENQIR public-audit reporting tests (offline; no external network)."""
import copy
import pathlib
import unittest
from unittest.mock import patch

from ops import altare_readonly_audit as audit
from ops import publish_readonly_issue as issue

URL = "https://github.com/initial2024/avenqir-site/actions/runs/123"
REPORT = {
    "created_utc": "2026-11-23T11:00:00+00:00",
    "fixed_endpoints": 2,
    "sampled_links": 2,
    "catalog_note": "",
    "locale": {"status": "PASS", "locales": 40, "packs": 40,
               "missing": [], "invalid_packs": []},
    "results": [
        {"url": "https://avenqir.bg5.net/", "status": "OK", "code": 200, "ms": 90},
        {"url": "https://avenqir.bg5.net/directory.html", "status": "OK", "code": 200, "ms": 110},
        {"url": "https://example.org/ok", "status": "OK", "code": 200, "ms": 80},
        {"url": "https://example.org/missing", "status": "CANDIDATE_BROKEN", "code": 404, "ms": 70},
    ],
}


class ReportTests(unittest.TestCase):
    def test_404_is_only_review_candidate(self):
        status, counts = issue.result_summary(REPORT)
        self.assertEqual(status, "REVIEW")
        self.assertEqual(counts["CANDIDATE_BROKEN"], 1)
        body, _ = issue.make_markdown(REPORT, URL)
        self.assertIn("不能直接判定失效", body)
        self.assertIn("不会自动删除网址", body)
        self.assertIn("40", body)
        self.assertIn(URL, body)
        self.assertIn(issue.MARKER, body)

    def test_403_timeout_or_unknown_is_not_broken(self):
        report = copy.deepcopy(REPORT)
        report["results"] = [{"url": "https://example.org/no",
                              "status": "UNKNOWN", "code": 403, "ms": 50}]
        status, counts = issue.result_summary(report)
        self.assertEqual(status, "INCOMPLETE")
        self.assertEqual(counts["CANDIDATE_BROKEN"], 0)

    def test_external_text_is_escaped(self):
        self.assertNotIn("<script>", issue.safe_literal("<script>"))
        self.assertNotIn("|", issue.safe_literal("unsafe|label"))
        body, _ = issue.make_markdown(
            {**REPORT, "results": [{"url": "https://example.org/?q=<script>",
                                    "status": "UNKNOWN", "code": 403, "ms": 1}]},
            URL)
        self.assertNotIn("<script>", body)

    def test_single_issue_create_then_update(self):
        with patch.object(issue, "github_api") as api:
            api.side_effect = [[], {"number": 22,
                              "html_url": "https://github.com/example/repo/issues/22"}]
            result = issue.upsert_report(REPORT, URL, "example/repo", "test_token")
            self.assertEqual(result[1], "CREATED")
            self.assertEqual(api.call_args_list[-1].args[0], "POST")
        with patch.object(issue, "github_api") as api:
            api.side_effect = [[{"number": 22, "state": "open", "title": issue.TITLE,
                                "body": issue.MARKER}], {"number": 22,
                                "html_url": "https://github.com/example/repo/issues/22"}]
            result = issue.upsert_report(REPORT, URL, "example/repo", "test_token")
            self.assertEqual(result[1], "UPDATED")
            self.assertEqual(api.call_args_list[-1].args[0], "PATCH")

    def test_closed_issue_not_reopened(self):
        with patch.object(issue, "github_api") as api:
            api.return_value = [{"number": 22, "state": "closed", "title": issue.TITLE,
                                 "body": issue.MARKER}]
            result = issue.upsert_report(REPORT, URL, "example/repo", "test_token")
            self.assertEqual(result[1], "CLOSED_BY_OWNER")
            self.assertEqual(api.call_count, 1)

    def test_history_at_most_eight(self):
        old = [f"- 2026-11-{i:02d}｜PASS｜[本次工作流](https://github.com/x/y/actions/runs/{i})"
               for i in range(1, 15)]
        body, _ = issue.make_markdown(REPORT, URL, old)
        self.assertLessEqual(len(issue.previous_history(body)), 8)

    def test_weekly_collector_never_visits_private_network(self):
        for bad in ("http://example.org", "file:///etc/passwd",
                    "https://127.0.0.1/", "https://localhost/",
                    "https://example.org:8443/", "https://user@example.org"):
            self.assertFalse(audit.safe_public_https(bad), bad)

    def test_collector_never_follows_redirects(self):
        self.assertIsNone(audit.NoRedirect().redirect_request(
            None, None, 302, "redirect", {}, "https://other.example/"))


if __name__ == "__main__":
    unittest.main()
