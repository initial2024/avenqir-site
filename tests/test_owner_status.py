import unittest, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class OwnerStatusTests(unittest.TestCase):
    def test_quota_limits_and_reset(self):
        php = """require 'site/status-quota.php'; $s=[]; for($i=0;$i<12;$i++){[$c,$s]=aq_status_quota_step($s,1,'192.0.2.1');if($c!==200)exit(1);} [$c,$s]=aq_status_quota_step($s,1,'192.0.2.1');if($c!==429)exit(2); for($i=2;$i<=169;$i++){[$c,$s]=aq_status_quota_step($s,1,'198.51.100.'.$i);if($c!==200)exit(3);} [$c,$s]=aq_status_quota_step($s,1,'203.0.113.1');if($c!==429||count($s['peers'])!==169)exit(4); [$c,$s]=aq_status_quota_step($s,2,'192.0.2.1');if($c!==200||$s['total']!==1||count($s['peers'])!==1)exit(5);"""
        subprocess.run(['php','-r',php],cwd=ROOT,check=True)
    def test_owner_boundary(self):
        page=(ROOT/'site/owner-sites.php').read_text()
        for token in ['aq_shared_adm_logged','hash_equals','no-store','owner_sites','LOCK_EX','noopener noreferrer']:
            self.assertIn(token,page)
        self.assertNotIn('curl_exec',page)
        self.assertNotIn('file_get_contents($url',page)
    def test_retired_launcher(self):
        self.assertNotIn('remote-workspace.html',(ROOT/'site/index.html').read_text())
        self.assertNotIn('remote-workspace.html',(ROOT/'site/admin.php').read_text())
        self.assertNotIn('console.altare.gg',(ROOT/'site/remote-workspace.html').read_text())
