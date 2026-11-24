from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
class ProjectPrivacyTests(unittest.TestCase):
    def test_public_project_defaults_empty_and_generic(self):
        html=(SITE/'projects.html').read_text()
        js=(SITE/'projects.js').read_text()
        for s in ('initial2024','kango99w','u2584604327'):
            self.assertNotIn(s,html+js)
        self.assertIn('read(repoKey,[])',js)
        self.assertIn("const repoKey='avenqir_projects_local_v5'",js)
        self.assertIn('legacyPanel',html)
        self.assertIn('input:checked',js)
        self.assertIn('if(owner)return',js)
        self.assertIn("credentials:'omit'",js)
    def test_owner_only_storage_and_protection(self):
        php=(SITE/'owner-projects.php').read_text()
        for s in ('aq_shared_adm_logged','hash_equals','no-store, private','owner_projects','LOCK_EX','data-scope="owner"','<?=e($repo)?>'):
            self.assertIn(s,php)
        self.assertLess(php.index('aq_shared_adm_logged'),php.index('aq_owner_project_items($owner)'))
        self.assertIn("'owner_projects'",(SITE/'server-core.php').read_text())
        self.assertIn('href="owner-projects.php"',(SITE/'admin.php').read_text())
        sw=(SITE/'sw.js').read_text()
        self.assertNotIn("'./owner-projects.php'",sw)
        self.assertIn("u.pathname.endsWith('.php')",sw)
if __name__=='__main__':unittest.main()
