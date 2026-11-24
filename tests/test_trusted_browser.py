from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
ADMIN=(ROOT/'site/admin.php').read_text('utf8')
SEC=(ROOT/'site/admin-security.php').read_text('utf8')

class TrustedDevice(unittest.TestCase):
    def test_trust_is_opt_in_after_fresh_2fa(self):
        self.assertIn("if($freshMfa && (string)($_POST['trust_device']??'')==='yes')",ADMIN)
        self.assertIn("aq_mfa_consume_login($pwd,$factor)",ADMIN)
        self.assertIn("aq_trust_allowed($auth,$_COOKIE)",ADMIN)
        self.assertIn('name="trust_device"',ADMIN)
        self.assertIn("password_verify($pwd",ADMIN)
        self.assertNotIn("navigator.userAgent",ADMIN+SEC)
    def test_cookie_and_secret_stays_server_side(self):
        for x in ("__Host-AVENQIR_TRUST","'secure'=>true","'httponly'=>true",
                  "'samesite'=>'Strict'","hash('sha256',$token)",
                  "AQ_TRUST_TTL=1209600","array_slice($items,-5)"):
            self.assertIn(x,SEC)
        self.assertNotIn("localStorage",SEC)
    def test_all_revoke_requires_password_and_totp(self):
        self.assertIn("$act==='revoke_trusted'",ADMIN)
        self.assertIn("aq_mfa_consume_login($pwd,$factor)===null",ADMIN)
        self.assertIn("aq_trust_clear_all()",ADMIN)
        self.assertIn("session_regenerate_id(true)",ADMIN)
        self.assertIn("security_rev",SEC)

if __name__=='__main__':unittest.main()
