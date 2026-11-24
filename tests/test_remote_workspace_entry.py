"""Regression: the AL browser launcher stays retired and cannot collect credentials."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
PAGE=ROOT/"site"/"remote-workspace.html"

class RemoteWorkspaceGuardTest(unittest.TestCase):
    def test_retired_page_has_no_remote_access_or_redirect(self):
        data=PAGE.read_text(encoding="utf8")
        self.assertIn("Feature retired",data)
        self.assertIn('meta name="robots" content="noindex,nofollow"',data)
        for token in ('console.altare.gg', 'developers.cloudflare.com/cloudflare-one/',
                      'AL_PRIVATE_BROWSER.md', 'rw-access-url', 'rw-connect', '<iframe',
                      'type="password"', 'window.fetch(', 'XMLHttpRequest(', '/api/proxy',
                      'window.location', 'location.href', 'document.cookie'):
            self.assertNotIn(token,data)
    def test_no_public_home_or_admin_entry(self):
        index=(ROOT/"site/index.html").read_text(encoding="utf8")
        admin=(ROOT/"site/admin.php").read_text(encoding="utf8")
        self.assertNotIn('href="remote-workspace.html"',index)
        self.assertNotIn('href="remote-workspace.html"',admin)
        self.assertIn('href="owner-sites.php"',admin)
    def test_legacy_local_url_is_only_deleted(self):
        js=(ROOT/"site/admin-al-link.js").read_text(encoding="utf8")
        self.assertIn('localStorage.removeItem("avenqir.remote-access-url.v1")',js)
        for token in ('localStorage.setItem','document.cookie','fetch(','XMLHttpRequest'):
            self.assertNotIn(token,js)
    def test_historical_url_not_in_precache(self):
        sw=(ROOT/"site/sw.js").read_text(encoding="utf8")
        self.assertNotIn("'./remote-workspace.html'",sw)
        self.assertIn("u.pathname.endsWith('/remote-workspace.html')",sw)
    def test_retired_page_syntax_and_deploy_validation(self):
        import sys
        sys.path.insert(0,str(ROOT/"scripts"))
        from verify_site import validate
        self.assertIn(PAGE,validate())

if __name__=="__main__":
    unittest.main()
