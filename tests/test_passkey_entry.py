from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]/"site"
class PasskeyEntryTest(unittest.TestCase):
    def test_primary_login_and_native_channel(self):
        admin=(ROOT/"admin.php").read_text()
        js=(ROOT/"passkey.js").read_text()
        page=(ROOT/"passkey.php").read_text()
        self.assertIn('id="admPasskeyLogin"',admin)
        self.assertIn('id="pk-get"',page)
        self.assertIn('OrbitAvenqirPasskey',js)
        self.assertIn('navigator.credentials.create',js)
        self.assertIn('navigator.credentials.get',js)
        self.assertIn("await request('login_finish',c)",js)
        self.assertIn("await request('register_finish',c)",js)
        self.assertIn("credentials:'same-origin'",js)
        self.assertIn("aq_pk_assertion",page)
        self.assertIn("aq_pk_registration",page)
        self.assertNotIn("localStorage",js)
if __name__=='__main__':unittest.main()
