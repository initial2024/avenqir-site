import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from collect_atlas_source_evidence import Page, batches, public_url, retryable


class SourceEvidenceTest(unittest.TestCase):
    def test_public_reference_urls_exclude_private_and_session_fields(self):
        self.assertEqual(public_url("https://www.example.org/docs/"), "https://www.example.org/docs/")
        for url in (
            "http://www.example.org/",
            "https://u:p@www.example.org/",
            "https://127.0.0.1/",
            "https://www.example.org/?session=x",
            "https://www.example.org/;jsessionid=x",
            "https://www.example.org/%3Bjsessionid=x",
            "https://www.example.org/access_token/x",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                public_url(url)

    def test_page_collects_title_and_public_links(self):
        page = Page("https://www.example.org/")
        page.feed("""
            <title>Catalog</title><meta name="author" content="Publishing Organization">
            <h1>Catalog</h1><svg><title>Icon</title></svg>
            <a href="/about">Publisher</a><a href="/account?code=x">Account</a>
            <a href="/profile;session=x">Profile</a><script>var x = 'secret';</script>
        """)
        data = page.evidence()
        self.assertEqual(data["title"], "Catalog")
        self.assertEqual(data["metadata"]["author"], "Publishing Organization")
        self.assertEqual(data["links"], {"https://www.example.org/about": "Publisher"})
        self.assertNotIn("secret", data["opening_text"])

    def test_cooldown_and_access_challenges_require_different_handling(self):
        def record(status, **extra):
            return {"attempts": [{"status": status, **extra}]}

        self.assertFalse(retryable(record(403), 3))
        self.assertFalse(retryable(record(200, issue="potential anti-bot challenge"), 3))
        self.assertFalse(retryable(record(429, retry_after="2099-01-01T00:00:00+00:00"), 3))
        self.assertFalse(retryable(record(503), 1))
        self.assertTrue(retryable(record(503), 3))
        self.assertTrue(retryable(record(200, issue="no HTML title"), 3))

    def test_batches_remain_stable_when_a_url_migrates(self):
        original = [{"id": str(i).zfill(3), "url": str(i)} for i in range(320)]
        moved = [dict(x, url="https://www.example.org/") if x["id"] == "010" else x for x in original]
        self.assertEqual([len(b) for b in batches(original)], [150, 150, 20])
        self.assertEqual(
            [[x["id"] for x in b] for b in batches(original)],
            [[x["id"] for x in b] for b in batches(reversed(moved))],
        )


if __name__ == "__main__":
    unittest.main()
