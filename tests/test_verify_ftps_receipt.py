"""Tests for the read-only FTPS deployment receipt gate."""
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import verify_ftps_receipt as check
from test_deploy import FakeFTP

SHA='a'*40
ROOT='/avenqir.bg5.net/htdocs'

class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.site=Path(self.tmp.name)
        self.ftp=FakeFTP()
        for name in check.CORE:
            content=('fixture '+name).encode()
            (self.site/name).write_bytes(content)
            self.ftp.files[ROOT+'/'+name]=content
        self.ftp.files[ROOT+'/deploy-state.json']=json.dumps({
            'schema':'avenqir-deploy-state-1','commit':SHA,'deployed_at':'2026-11-27T12:57:00Z'
        }).encode()
    def tearDown(self):
        self.tmp.cleanup()
    def test_all_files_and_marker(self):
        self.assertEqual(check.verify_receipt(self.ftp,SHA,self.site),len(check.CORE))
        self.assertEqual(self.ftp.deleted,[])
    def test_modified_file_denied(self):
        self.ftp.files[ROOT+'/directory.js']=b'bad'
        with self.assertRaisesRegex(RuntimeError,'REMOTE_SHA256_MISMATCH directory.js'):
            check.verify_receipt(self.ftp,SHA,self.site)
    def test_marker_wrong_commit_denied(self):
        self.ftp.files[ROOT+'/deploy-state.json']=json.dumps({
            'schema':'avenqir-deploy-state-1','commit':'b'*40}).encode()
        with self.assertRaisesRegex(RuntimeError,'REMOTE_DEPLOY_MARKER_MISMATCH'):
            check.verify_receipt(self.ftp,SHA,self.site)
    def test_missing_file_denied(self):
        del self.ftp.files[ROOT+'/site.js']
        with self.assertRaises(Exception):
            check.verify_receipt(self.ftp,SHA,self.site)
    def test_bad_expected_sha_denied(self):
        with self.assertRaises(ValueError):
            check.verify_receipt(self.ftp,'bad',self.site)

if __name__=='__main__':unittest.main()
