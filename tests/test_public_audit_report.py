"""Offline tests: no web traffic, no credentials and no GitHub mutations."""
import json
import pathlib
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "ops"))
import publish_readonly_issue as publish


class PublicAuditReportTests(unittest.TestCase):
    def make_report(self, statuses=("OK", "OK")):
        return {
            "created_utc": "2026-11-23T12:00:00+00:00",
            "fixed_endpoints": 1,
            "sampled_links": 1,
            "locale": {"status": "PASS", "locales": 40, "packs": 40,
                       "missing": [], "invalid_packs": []},
            "catalog_note": "",
            "results": [
                {"url": "https://avenqir.bg5.net/", "status": statuses[0],
                 "code": 200, "ms": 120},
                {"url": "https://example.org/", "status": statuses[1],
                 "code": 200, "ms": 190},
            ],
        }

    def test_normal_report_is_not_fake_100percent_guarantee(self):
        body, state = publish.make_markdown(
            self.make_report(),
            "https://github.com/initial2024/avenqir-site/actions/runs/123"
        )
        self.assertEqual(state, "NO_CANDIDATE")
        self.assertIn("40", body)
        self.assertIn("不代表全部网址有效", body)
        self.assertIn(publish.MARKER, body)
        self.assertIn("https://avenqir.bg5.net/", body)\n        self.assertNotIn("| https://example.org/ |", body) # healthy sample is not a warning
        self.assertNotIn("管理员密码", body)  # no credentials included

    def test_404_candidate_only_not_automatically_deleted(self):
        report = self.make_report(("OK", "CANDIDATE_BROKEN"))
        report["results"][1]["code"] = 404
        body, state = publish.make_markdown(
            report, "https://github.com/initial2024/avenqir-site/actions/runs/123"
        )
        self.assertEqual(state, "REVIEW")
        self.assertIn("候选", body)
        self.assertIn("不会自动删除网址", body)

    def test_unknown_and_missing_locale_report_is_incomplete(self):
        report = self.make_report(("OK", "UNKNOWN"))
        report["locale"]["status"] = "UNKNOWN"
        self.assertEqual(publish.result_summary(report)[0], "INCOMPLETE")

    def test_bad_status_and_untrusted_url_are_text_only(self):
        report = self.make_report(("OK", "CANDIDATE_BROKEN"))
        report["results"][1]["url"] = "https://example.com/<script>alert(1)</script>|x"
        body, state = publish.make_markdown(
            report, "https://github.com/initial2024/avenqir-site/actions/runs/123"
        )
        self.assertEqual(state, "REVIEW")
        self.assertNotIn("<script>", body)
        self.assertNotIn("|x", body)

    def test_issue_upsert_and_closed_issue_respects_owner(self):
        report = self.make_report()
        store = []
        def fake_api(method, repo, token, route, payload=None):
            self.assertEqual(repo, "initial2024/avenqir-site")
            self.assertEqual(token, "TEST_ONLY")
            if method == "GET":
                return store
            if method == "POST":
                issue = {"number": 22, "title": publish.TITLE,
                         "body": payload["body"], "state": "open",
                         "html_url": "https://github.com/initial2024/avenqir-site/issues/22"}
                store.append(issue)
                return issue
            if method == "PATCH":
                store[0]["body"] = payload["body"]
                return store[0]
            raise AssertionError(method)

        with patch.object(publish, "github_api", fake_api):
            url, op, state = publish.upsert_report(
                report, "https://github.com/initial2024/avenqir-site/actions/runs/123",
                "initial2024/avenqir-site", "TEST_ONLY"
            )
            self.assertEqual((op, state), ("CREATED", "NO_CANDIDATE"))
            self.assertEqual(url, store[0]["html_url"])
            self.assertEqual(len(store), 1)
            url, op, state = publish.upsert_report(
                report, "https://github.com/initial2024/avenqir-site/actions/runs/124",
                "initial2024/avenqir-site", "TEST_ONLY"
            )
            self.assertEqual(op, "UPDATED")
            self.assertEqual(len(store), 1)
            self.assertIn("runs/124", store[0]["body"])
            store[0]["state"] = "closed"
            url, op, state = publish.upsert_report(
                report, "https://github.com/initial2024/avenqir-site/actions/runs/125",
                "initial2024/avenqir-site", "TEST_ONLY"
            )
            self.assertEqual(op, "CLOSED_BY_OWNER")
            self.assertEqual(len(store), 1)
            self.assertNotIn("runs/125", store[0]["body"])


if __name__ == "__main__":
    unittest.main()
