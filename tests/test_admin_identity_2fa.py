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
                     "aq_auth_tag($auth)","mfa_begin","mfa_confirm","mfa_disable"):
            self.assertIn(text,ADMIN)
        self.assertIn("PASSWORD_DEFAULT", ADMIN)
        self.assertIn("session_regenerate_id(true)",ADMIN)
        self.assertIn("session.use_strict_mode",ADMIN)
        self.assertIn("frame-ancestors 'none'",ADMIN)
        self.assertIn("script-src 'self'",ADMIN)
    def test_initial_setup_is_not_public_registration(self):
        self.assertIn("$act==='setup' && $auth===null",ADMIN)
        self.assertIn("private-settings.php",ADMIN)
        self.assertIn("security_rev",ADMIN)
        self.assertIn("legacy",SECURITY)
    def test_totp_only_after_explicit_confirmation(self):
        for text in ("aq_secret_create","aq_totp_matching_step","$step===null",
                     "aq_recovery_create","mfa_recovery_once","aq_mfa_enabled",
                     "session_start","aq_mfa_consume_login"):
            if text=="session_start": self.assertIn(text+"()",ADMIN)
            else: self.assertIn(text,ADMIN+SECURITY)
        self.assertIn("aq_mfa_verify_and_consume",SECURITY)
        self.assertIn("flock($handle,LOCK_EX)",SECURITY)
        self.assertIn("return null",SECURITY)
        self.assertNotIn("eval(",ADMIN+SECURITY)
    def test_private_link_only_in_login_page_and_never_proxy(self):
        self.assertIn('<?php if($logged):?><script src="admin-al-link.js?v=1" defer></script>',ADMIN)
        self.assertIn('id="adminAlDirect"',ADMIN)
        self.assertIn('href="remote-workspace.html"',ADMIN)
        self.assertIn("avenqir.remote-access-url.v1",LINK)
        self.assertIn("direct.href=url.origin",LINK)
        for text in ("fetch(","XMLHttpRequest","document.cookie","innerHTML","localStorage.setItem","window.location.assign"):
            self.assertNotIn(text,LINK)

if __name__=="__main__":unittest.main()
