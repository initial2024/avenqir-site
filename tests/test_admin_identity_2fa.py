"""Admin: single account adm, secure opt-in 2FA, safe AL shortcut.
Does not execute PHP requests, touch production credentials or read auth files.
"""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
ADMIN=(ROOT/"site/admin.php").read_text(encoding="utf8")
SECURITY=(ROOT/"site/admin-security.php").read_text(encoding="utf8")
LINK=(ROOT/"site/admin-al-link.js").read_text(encoding="utf8")

class AdminIdentityAndALShortcut(unittest.TestCase):
    def test_login_username_and_mfa_form(self):
        for text in ('name="username"','value="adm"','name="mfa_code"',
                     "aq_mfa_consume_login($pwd,$factor)",'AQ_ADMIN_NAME',
                     "aq_shared_adm_logged($auth,$_SESSION)","mfa_begin","mfa_confirm","mfa_disable"):
            self.assertIn(text,ADMIN)
        self.assertIn("PASSWORD_DEFAULT", ADMIN)
        self.assertIn("aq_auth_tag($auth)",SECURITY)
        self.assertIn("aq_post_login_destination()",ADMIN)
        self.assertIn('href="feedback-admin.php"',ADMIN)
        self.assertIn("session_regenerate_id(true)",ADMIN)
        self.assertIn("session.use_strict_mode",ADMIN)
        self.assertIn("frame-ancestors 'none'",ADMIN)
        self.assertIn("script-src 'self'",ADMIN)
    def test_initial_setup_is_not_public_registration(self):
        self.assertIn("$act==='setup' && $auth===null",ADMIN)
        self.assertIn("private-settings.php",ADMIN)
        self.assertIn("security_rev",ADMIN)
        self.assertIn("rev===''?$base",SECURITY)
    def test_totp_only_after_explicit_confirmation(self):
        for text in ("aq_secret_create","aq_totp_matching_step","$step===null",
                     "aq_recovery_create","mfa_recovery_once","aq_mfa_enabled",
                     "session_start","aq_mfa_consume_login"):
            if text=="session_start": self.assertIn(text+"()",ADMIN)
            else: self.assertIn(text,ADMIN+SECURITY)
        self.assertIn("aq_mfa_verify_and_consume",SECURITY)
        self.assertIn("flock($handle,LOCK_EX)",SECURITY)
        self.assertIn("function aq_mfa_lock_ready()",SECURITY)
        self.assertIn("elseif(!aq_mfa_lock_ready())",ADMIN)
        self.assertIn("LOCK_EX|LOCK_NB",SECURITY)
        self.assertIn("return null",SECURITY)
        self.assertNotIn("eval(",ADMIN+SECURITY)
    def test_retired_remote_shortcut_and_owner_access(self):
        # The old AL shortcut has been retired; a public launcher or proxy is a regression.
        self.assertNotIn('href="remote-workspace.html"',ADMIN)
        self.assertNotIn('id="adminAlDirect"',ADMIN)
        self.assertNotIn('admin-al-link.js',ADMIN)
        self.assertIn('href="owner-sites.php"',ADMIN)
        owner=(ROOT/"site/owner-sites.php").read_text(encoding="utf8")
        for token in ('aq_shared_adm_logged', 'hash_equals', 'Cache-Control',
                      'owner_sites', 'LOCK_EX', 'no-referrer'):
            self.assertIn(token,owner)
        self.assertIn("localStorage.removeItem",LINK)
        self.assertNotIn("localStorage.setItem",LINK)
        for token in ("fetch(","XMLHttpRequest","document.cookie","innerHTML","window.location.assign"):
            self.assertNotIn(token,LINK)

if __name__=="__main__":unittest.main()
