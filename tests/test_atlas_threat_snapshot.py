from pathlib import Path
import sys,unittest,datetime
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_atlas_threat_snapshot import parse_feed, matched, snapshot
from audit_directory_links import catalog_entries

class ThreatSnapshotTests(unittest.TestCase):
    def test_strict_feed_and_domain_boundaries(self):
        raw=('\n'.join('host%d.example.com'%i for i in range(1000))+'\nexample.org\n').encode()
        feed=parse_feed(raw)
        self.assertTrue(matched('a.example.org',feed))
        self.assertTrue(matched('example.org',feed))
        self.assertFalse(matched('notexample.org',feed))
        self.assertFalse(matched('example.org.evil.com',feed))
        for bad in [b'<html>blocked</html>',b'foo.example.org\n']:
            with self.assertRaises(ValueError):parse_feed(bad)
        result=snapshot(raw,datetime.datetime.now(datetime.timezone.utc))
        self.assertEqual(result['catalogUrls'],len(catalog_entries()))
        self.assertIn('hosts',result)
        self.assertNotIn('safe',result)
