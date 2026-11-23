"""Local, no-network behavioral regression tests for AVENQIR FTPS deployer."""
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import ftps_deploy as d
from verify_site import validate

class FakeFTP:
    def __init__(self):
        self.files={};self.dirs={'/','/avenqir.bg5.net','/avenqir.bg5.net/htdocs'};self.here='/';self.fail_one_overwrite=False
        self.deleted=[]
    def _path(self,name):return (Path(self.here)/name).as_posix()
    def cwd(self,path):
        dest=Path(path) if path.startswith('/') else Path(self.here)/path
        dest=dest.as_posix()
        if dest not in self.dirs:raise d.ftplib.error_perm('550 no such directory')
        self.here=dest
    def pwd(self):return self.here
    def nlst(self):
        return [Path(p).name for p in self.files if str(Path(p).parent)==self.here]
    def mkd(self,name):self.dirs.add(self._path(name))
    def retrbinary(self,cmd,callback,blocksize=65536):
        _,name=cmd.split(' ',1)
        path=self._path(name)
        if path not in self.files:raise d.ftplib.error_perm('550 not found')
        callback(self.files[path])
    def storbinary(self,cmd,stream,blocksize=65536):
        _,name=cmd.split(' ',1);path=self._path(name)
        if self.fail_one_overwrite and path in self.files and '.avenqir-upload-' not in name:
            self.fail_one_overwrite=False
            raise d.ftplib.error_perm('553 overwrite rejected')
        self.files[path]=stream.read()
    def rename(self,old,new):
        old=self._path(old);new=self._path(new)
        if old not in self.files:raise d.ftplib.error_perm('550 not found')
        if new in self.files:raise d.ftplib.error_perm('553 RENAME destination exists')
        self.files[new]=self.files.pop(old)
    def delete(self,name):
        path=self._path(name)
        self.deleted.append(path)
        del self.files[path]

class DeployTests(unittest.TestCase):
    def setUp(self):
        self.ftp=FakeFTP();self.target='/avenqir.bg5.net/htdocs';self.commit='f'*40
        self.tmp=tempfile.TemporaryDirectory();self.base=Path(self.tmp.name)
        (self.base/'index.html').write_text('NEW',encoding='utf-8')
    def tearDown(self):self.tmp.cleanup()
    def test_new_file_staged_then_renamed(self):
        d.upload(self.ftp,self.base/'index.html',self.commit,self.target,self.base)
        self.assertEqual(self.ftp.files[self.target+'/index.html'],b'NEW')
    def test_existing_file_overwrite_verified(self):
        self.ftp.files[self.target+'/index.html']=b'OLD'
        d.upload(self.ftp,self.base/'index.html',self.commit,self.target,self.base)
        self.assertEqual(self.ftp.files[self.target+'/index.html'],b'NEW')
        self.assertEqual(self.ftp.deleted,[self.target+'/index.html.avenqir-upload-'+self.commit[:12]+'.tmp'])
    def test_overwrite_failure_restores_old_file(self):
        self.ftp.files[self.target+'/index.html']=b'OLD'
        self.ftp.fail_one_overwrite=True
        with self.assertRaisesRegex(RuntimeError,'old file restored'):
            d.upload(self.ftp,self.base/'index.html',self.commit,self.target,self.base)
        self.assertEqual(self.ftp.files[self.target+'/index.html'],b'OLD')
    def test_existing_custom_image_is_preserved(self):
        asset=self.base/'hero-lake.webp'
        asset.write_bytes(b'GITHUB_IMAGE')
        self.ftp.files[self.target+'/hero-lake.webp']=b'OWNER_CUSTOM_IMAGE'
        d.upload(self.ftp,asset,self.commit,self.target,self.base)
        self.assertEqual(self.ftp.files[self.target+'/hero-lake.webp'],b'OWNER_CUSTOM_IMAGE')
        self.assertEqual(self.ftp.deleted,[])
        self.assertEqual(len(self.ftp.files),1)

    def test_new_image_can_be_added_without_existing_overwrite(self):
        asset=self.base/'new-image.webp'
        asset.write_bytes(b'NEW_IMAGE')
        d.upload(self.ftp,asset,self.commit,self.target,self.base)
        self.assertEqual(self.ftp.files[self.target+'/new-image.webp'],b'NEW_IMAGE')

    def test_no_private_data_in_release(self):
        self.assertTrue(len(validate())>35)
        self.assertFalse(any('_private' in str(x) or '_store' in str(x) for x in validate()))
if __name__=='__main__':unittest.main()
