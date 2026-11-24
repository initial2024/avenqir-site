from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class DirectoryPerformance(unittest.TestCase):
    def test_same_catalog_version(self):
        for name in ['index.html','directory.html']:
            self.assertIn('atlas-catalog-core.js?v=110',(ROOT/'site'/name).read_text())
    def test_first_paint_and_cached_aggregates(self):
        s=(ROOT/'site/directory.js').read_text()
        self.assertIn('safetyRecords===records&&safetyLocale===currentLocale',s)
        self.assertIn('languageStatsRecords!==records||languageStatsLocale!==target',s)
        self.assertIn('clearTimeout(inputTimer)',s)
        self.assertLess(s.index("source.textContent=T('内置目录已可用"),s.index('catalog.load().then'))
        self.assertIn('if(data.remote){choiceBar();draw();}',s)
        self.assertIn('mountOptionalRecommendations()',s)

    def test_empty_hash_never_used_as_dom_element(self):
        s=(ROOT/'site/directory.js').read_text()
        self.assertIn("const target=id?$(id):null;const panel=target?.closest",s)
        self.assertNotIn('const target=id&&$(id)',s)
