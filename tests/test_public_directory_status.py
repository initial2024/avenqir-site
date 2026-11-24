import unittest
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parents[1]
class PublicStatusTest(unittest.TestCase):
    def test_public_read_only_status(self):
        script="$_SERVER['REQUEST_METHOD']='GET';require 'site/directory-status.php';"
        out=subprocess.check_output(['php','-r',script],cwd=ROOT,text=True)
        value=json.loads(out)
        self.assertEqual(set(value),{'ok','schema','count'})
        self.assertIs(value['ok'],True)
        self.assertEqual(value['schema'],'avenqir-directory-status-v1')
        self.assertTrue(0<=value['count']<=300)
    def test_post_denied(self):
        out=subprocess.check_output(['php','-r',"$_SERVER['REQUEST_METHOD']='POST';require 'site/directory-status.php';"],cwd=ROOT,text=True)
        self.assertEqual(json.loads(out),{'ok':False})
