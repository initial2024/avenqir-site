"""Admin site navigation and phone AL missing-file recovery."""
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]
PAGE=(ROOT/"site/feedback-admin.php").read_text(encoding="utf-8")
SCRIPT=(ROOT/"site/al-setup.txt").read_text(encoding="utf-8")

class FeedbackAdminBridgeAndAlRecoveryTest(unittest.TestCase):
    def test_logged_in_admin_hub_keeps_sessions_isolated(self):
        self.assertIn("目录管理 adm · 设置 2FA",PAGE)
        self.assertIn('href="admin.php"',PAGE)
        self.assertIn('href="remote-workspace.html"',PAGE)
        self.assertIn('href="https://console.altare.gg/"',PAGE)
        self.assertIn("<?php if($logged):?><section",PAGE)
        self.assertIn("<?php endif;?>",PAGE)
        self.assertIn("独立于 adm 目录后台",PAGE)
        self.assertIn("AVENQIR_FEEDBACK_ADMIN",PAGE)
        self.assertNotIn("document.cookie",PAGE)
        self.assertNotIn('type="password" name="new_password"',PAGE)
    def test_bootstrap_is_explicit_and_checks_integrity(self):
        self.assertEqual(subprocess.run(["bash","-n",str(ROOT/"site/al-setup.txt")],capture_output=True).returncode,0)
        self.assertIn("al_private_browser.sh",SCRIPT)
        self.assertIn("al_browser_preflight.py",SCRIPT)
        self.assertIn("bash -n",SCRIPT)
        self.assertIn("AL_SCRIPTS_INSTALLED=YES",SCRIPT)
        self.assertIn("AL_NEXT_COMMAND=bash",SCRIPT)
        self.assertNotIn("eval(",SCRIPT)
        self.assertNotIn("curl -k",SCRIPT)
        self.assertNotIn("AL_BROWSER_PACKAGES_INSTALLED=YES",SCRIPT)
        self.assertNotIn("cloudflared tunnel create",SCRIPT)
        self.assertNotIn("ORBIT_RELEASE_",SCRIPT)
    def test_deployment_allowlist_includes_setup_txt(self):
        import sys
        sys.path.insert(0,str(ROOT/"scripts"))
        from verify_site import validate
        self.assertIn(ROOT/"site/al-setup.txt", validate())

if __name__=="__main__": unittest.main()
