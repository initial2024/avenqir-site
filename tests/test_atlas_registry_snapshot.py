import datetime, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_atlas_registry_snapshot import build,parse_registry
class RegistryTests(unittest.TestCase):
    def test_registry_scope(self):
        raw=('Domain name,Domain type,Organization name\n'+''.join('agency%d.gov,Federal - Executive,Agency %d\n'%(i,i) for i in range(510))).encode()
        items=[{'url':u} for u in ['https://www.agency1.gov/path','https://agency1.gov.evil.com/','https://notagency1.gov/','http://agency1.gov/','https://agency1.gov:8443/']]
        data=build(raw,items,datetime.datetime.now(datetime.timezone.utc))
        self.assertEqual(list(data['records']),['https://www.agency1.gov/path'])
        self.assertEqual(data['records'][items[0]['url']]['organization'],'Agency 1')
        self.assertNotIn('safe',data)
        with self.assertRaises(ValueError):parse_registry(b'<html>denied</html>')
        with self.assertRaises(ValueError):parse_registry(raw+b'agency1.gov,Federal - Executive,Duplicate\n')
