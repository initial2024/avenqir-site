import json
from pathlib import Path
import sys,unittest
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
sys.path.insert(0,str(ROOT/'scripts'))
from verify_site import validate

class DigitalAssetLinks(unittest.TestCase):
  def test_fixed_signed_cert_only(self):
    path=SITE/'.well-known/assetlinks.json'
    items=json.loads(path.read_text('utf8'))
    self.assertEqual(len(items),1)
    stmt=items[0]
    self.assertEqual(stmt['relation'],['delegate_permission/common.get_login_creds'])
    self.assertEqual(stmt['target']['namespace'],'android_app')
    self.assertEqual(stmt['target']['package_name'],'de.kango99w.orbitadmin')
    self.assertEqual(stmt['target']['sha256_cert_fingerprints'],[
      '6E:3E:5B:08:37:BE:97:08:23:8F:EC:5B:20:BD:80:CF:51:A2:AA:63:B2:44:F1:94:62:57:40:1F:3A:EE:04:91'])
  def test_protected_source_still_filtered(self):
    files=validate()
    self.assertIn(SITE/'.well-known/assetlinks.json',files)
    self.assertFalse(any('_private' in p.parts or '_store' in p.parts for p in files))
    ftp=(ROOT/'scripts/ftps_deploy.py').read_text('utf8')
    self.assertIn("dirname=='.well-known' and segment=='.well-known'",ftp)
    self.assertIn("segment in ('','.','..')",ftp)
  def test_no_dummy_passkey_claims(self):
    admin=(SITE/'admin.php').read_text('utf8')
    self.assertNotIn("navigator.credentials.get",admin)
    self.assertNotIn("fakePasskeyLogin",admin)

if __name__=='__main__':unittest.main()
