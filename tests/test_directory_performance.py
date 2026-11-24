from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class DirectoryPerformance(unittest.TestCase):
    def test_same_catalog_version(self):
        for name in ['index.html','directory.html']:
            self.assertIn('atlas-catalog-core.js?v=105',(ROOT/'site'/name).read_text())
    def test_first_paint_and_cached_aggregates(self):
        s=(ROOT/'site/directory.js').read_text()
        self.assertIn('safetyRecords===records&&safetyLocale===currentLocale',s)
        self.assertIn('languageStatsRecords!==records||languageStatsLocale!==target',s)
        self.assertIn('clearTimeout(inputTimer)',s)
        self.assertLess(s.index("source.textContent=T('内置目录已可用"),s.index('catalog.load().then'))
        self.assertIn('if(data.remote){choiceBar();draw();}',s)
        self.assertIn('mountOptionalRecommendations()',s)
