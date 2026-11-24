"""Regression: one authenticated server-side adm identity for both backends."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
ADMIN=(ROOT/'site/admin.php').read_text('utf8')
FEEDBACK=(ROOT/'site/feedback-admin.php').read_text('utf8')
CORE=(ROOT/'site/feedback-core.php').read_text('utf8')
SEC=(ROOT/'site/admin-security.php').read_text('utf8')
PUBLIC=(ROOT/'site/feedback.php').read_text('utf8')

class UnifiedAdM(unittest.TestCase):
    def test_single_session_password_2fa(self):
        self.assertIn("session_name('AVENQIR_ADMIN')",ADMIN)
        self.assertIn("fb_start_session('AVENQIR_ADMIN')",FEEDBACK)
        self.assertIn("aq_shared_adm_logged($auth,$_SESSION)",ADMIN)
        self.assertIn("aq_shared_adm_logged($auth,$_SESSION)",FEEDBACK)
        self.assertIn("aq_mfa_consume_login($pwd,$factor)",ADMIN)
        for unsafe in ("fb_logged","AVENQIR_FEEDBACK_ADMIN","password_verify("):
            self.assertNotIn(unsafe,FEEDBACK)
    def test_one_login_one_logout(self):
        self.assertIn("admin.php?next=feedback",FEEDBACK)
        self.assertIn("admin_after_login",ADMIN)
        self.assertIn("feedback-admin.php",ADMIN)
        self.assertIn("session_destroy()",FEEDBACK)
        self.assertIn("session_destroy()",ADMIN)
        self.assertIn("CSRF validation failed",FEEDBACK)
        self.assertIn("go_admin('登录成功 · adm。',aq_post_login_destination())",ADMIN)
        self.assertIn("!=='GET'",FEEDBACK)
    def test_legacy_data_migrates_without_password_or_delete(self):
        self.assertIn("INSERT INTO fb_settings",FEEDBACK)
        self.assertIn("feedback_enabled",FEEDBACK)
        self.assertIn("admin_password",CORE) # legacy activation flag, never login verifier
        self.assertIn("fb_submission_enabled($db)",PUBLIC)
        self.assertNotIn("change_password",FEEDBACK)
        self.assertNotIn("setup_code",FEEDBACK)
        self.assertNotIn("DROP TABLE",FEEDBACK+CORE)
        self.assertNotIn("DELETE FROM fb_settings",FEEDBACK+CORE)
        self.assertNotIn("setup_sha256'] as $k",CORE)
    def test_privacy_controls(self):
        self.assertIn("http_response_code(403)",FEEDBACK)
        self.assertIn("if(!$logged)",FEEDBACK)
        self.assertIn("hash_equals",SEC)
        self.assertIn("WHERE id=?",FEEDBACK)
        self.assertNotIn("document.cookie",FEEDBACK)

if __name__=='__main__':unittest.main()
