import unittest, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class SearchFlowTests(unittest.TestCase):
    def test_js_syntax(self):
        for name in ['directory.js','feedback-pref.js','sw.js']:
            subprocess.run(['node','--check',str(ROOT/'site'/name)],check=True)
    def test_explicit_search_and_navigation(self):
        s=(ROOT/'site/directory.js').read_text()
        for token in ['submitSearch(input.value)','submitSearch(r.name)','scrollToResults()','if(filtered().length)return','if(pendingNoMatchQuery)completeSearch()','searchEngineDestination','atlasClearFilters']:
            self.assertIn(token,s)
        self.assertNotIn("feedback.php?type=link&q=",s)
    def test_feedback_opt_out(self):
        s=(ROOT/'site/feedback-pref.js').read_text()
        self.assertIn("sessionStorage.removeItem('avenqir.feedback.query.once.v1')",s)
        self.assertIn("check.addEventListener('change'",s)
        self.assertIn('localStorage.removeItem(KEY)',s)
