"""Guard the phone-friendly Altare bootstrap against accidental private writes."""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class AltareMobileBootstrapTest(unittest.TestCase):
    def test_shortcut_is_public_text_and_invokes_only_readonly_setup(self):
        shortcut=(ROOT/"site/al.txt").read_text()
        self.assertTrue(shortcut.startswith("#!/usr/bin/env bash\n"))
        self.assertIn("set -euo pipefail",shortcut)
        self.assertIn("altare_bootstrap.sh",shortcut)
        self.assertIn("--proto '=https'",shortcut)
        self.assertIn("AL_BOOTSTRAP_INVALID_SOURCE",shortcut)
        self.assertNotIn("GITHUB_TOKEN",shortcut)
        self.assertNotIn("ORBIT_RELEASE_",shortcut)
        self.assertNotIn("chmod 777",shortcut)
        self.assertIn("bash \"$temp\"",shortcut)
        from sys import path as py_path
        py_path.insert(0,str(ROOT/"scripts"))
        from verify_site import validate
        self.assertIn(ROOT/"site/al.txt",validate())

if __name__=="__main__":
    unittest.main()
