from pathlib import Path
import unittest,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from ftps_deploy import deploy_order
class OwnerMobileLayout(unittest.TestCase):
    def test_navigation_and_wrapping(self):
        site=ROOT/'site'
        admin=(site/'admin.php').read_text()
        css=(site/'common.css').read_text()
        self.assertIn('<nav class="owner-action-grid"',admin)
        self.assertIn('grid-template-columns:1fr',css.split('@media(max-width:720px){.owner-action-grid',1)[1])
        self.assertIn('.owner-action-grid>.btn{display:flex',css)
        self.assertIn('white-space:normal;overflow-wrap:anywhere',css)
        self.assertTrue((site/'owner-feedback-security.php').is_file())
    def test_dependencies_precede_entrypoints(self):
        site=ROOT/'site'
        names=['admin.php','owner-feedback-security.php','feedback-turnstile.php','feedback-abuse.php','server-core.php','common.css','sw.js']
        order=sorted((site/n for n in names),key=deploy_order)
        ordered=[p.name for p in order]
        for dep in ['feedback-turnstile.php','feedback-abuse.php','server-core.php','common.css']:
            self.assertLess(ordered.index(dep),ordered.index('owner-feedback-security.php'))
        self.assertLess(ordered.index('owner-feedback-security.php'),ordered.index('admin.php'))
        self.assertEqual(ordered[-1],'sw.js')
