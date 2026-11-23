"""Remote browser access is an authenticated third-party desktop, not an HTTP proxy."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/"site"/"remote-workspace.html"

class RemoteWorkspaceGuardTest(unittest.TestCase):
    def test_no_credential_or_proxy_capture(self):
        data=HTML.read_text(encoding="utf8")
        self.assertIn('href="https://console.altare.gg/"',data)
        self.assertIn("AL_PRIVATE_BROWSER.md",data)
        self.assertIn("https://developers.cloudflare.com/cloudflare-one/",data)
        self.assertNotIn("https://docs.altare.gg/workstations/beta",data)
        self.assertIn('rel="noopener noreferrer"',data)
        self.assertIn('meta name="referrer" content="no-referrer"',data)
        for token in ('<iframe', 'type="password"', 'contenteditable', 'window.fetch(', 'XMLHttpRequest(', 'Proxy-Authorization',
                      '/api/proxy', 'location.href =', 'document.cookie'):
            self.assertNotIn(token,data)
        self.assertIn('without Workstations beta',data)
        self.assertIn('NOT LIVE YET:',data)
    def test_home_entry_and_deploy_whitelist(self):
        index=(ROOT/"site/index.html").read_text(encoding="utf8")
        self.assertIn('href="remote-workspace.html"',index)
        import sys
        sys.path.insert(0,str(ROOT/"scripts"))
        from verify_site import validate
        self.assertIn(HTML,validate())
    def test_localization_and_neutral_fallback(self):
        data=HTML.read_text(encoding="utf8")
        for locale in ('zh-Hans','zh-Hant','ja','en'):
            self.assertIn(locale,data)
        self.assertIn('var v=map[k]||{}',data)
        self.assertIn('avenqir.locale.v1',data)

if __name__=="__main__":
    unittest.main()
