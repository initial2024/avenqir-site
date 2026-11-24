from pathlib import Path
import subprocess,unittest
class FeedbackAbuseTests(unittest.TestCase):
    def test_runtime(self):
        subprocess.run(['php',str(Path(__file__).with_suffix('.php'))],check=True)
