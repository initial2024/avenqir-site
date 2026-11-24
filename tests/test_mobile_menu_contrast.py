"""Regression contract for mobile menu contrast in light, eye and dark themes."""
from pathlib import Path
import re
import unittest

SITE = Path(__file__).resolve().parent.parent / "site"

class MobileMenuContrastTest(unittest.TestCase):
    def test_open_overlay_has_explicit_dark_and_light_text(self):
        css = (SITE / "theme.css").read_text(encoding="utf-8")
        start = css.index("/* Mobile navigation contrast: keep the text readable")
        patch = css[start:]
        self.assertIn(':root:not([data-aq-theme="light"]):not([data-aq-theme="eye"]) .main-nav.is-open a', patch)
        self.assertRegex(patch, r"color:\s*#eef7ff")
        self.assertIn(':root:is([data-aq-theme="light"],[data-aq-theme="eye"]) .main-nav.is-open a', patch)
        self.assertIn('color:var(--aq-text)', patch)
        self.assertIn('.main-nav.is-open a:focus-visible', patch)

    def test_pwa_cache_is_bumped_for_existing_installs(self):
        sw = (SITE / "sw.js").read_text(encoding="utf-8")
        version = re.search(r"const CACHE = 'avenqir-v([0-9]+)-static-([0-9]{8})[^']*';", sw)
        self.assertIsNotNone(version)
        self.assertGreaterEqual((int(version.group(1)), int(version.group(2))), (94, 20261123))
        self.assertIn("avenqir-v97-static-20261124-compact", sw)
        self.assertIn("'./theme.css'", sw)

if __name__ == "__main__":
    unittest.main()
