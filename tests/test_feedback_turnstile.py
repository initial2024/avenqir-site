from pathlib import Path
import subprocess,unittest
class FeedbackTurnstileTests(unittest.TestCase):
    def test_policy(self):
        subprocess.run(['php',str(Path(__file__).with_suffix('.php'))],check=True)
    def test_scope(self):
        site=Path(__file__).resolve().parents[1]/'site'
        admin=(site/'owner-feedback-security.php').read_text()
        self.assertLess(admin.index('aq_shared_adm_logged'),admin.index('fb_ts_pending'))
        self.assertNotIn('fb_messages',admin)
        self.assertIn('fb_ts_verify($pending',admin)
        self.assertIn('if($showTurnstile)fb_ts_headers()', (site/'feedback.php').read_text())
