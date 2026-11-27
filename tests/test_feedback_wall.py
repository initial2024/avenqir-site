from pathlib import Path
import subprocess
import unittest


class FeedbackWallTests(unittest.TestCase):
    def test_moderation_and_public_projection(self):
        subprocess.run(["php", str(Path(__file__).with_suffix(".php"))], check=True)
