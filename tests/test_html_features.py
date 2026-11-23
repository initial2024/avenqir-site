#!/usr/bin/env python3
"""Cross-check the new static feature wiring without touching the real website."""
import re, unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'

class Parse(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]
        self.scripts=[]
        self.data_targets=[]
        self.internal_hrefs=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if a.get('data-target'):self.data_targets.append(a['data-target'])
        if tag=='script' and a.get('src'):self.scripts.append(a['src'].split('?')[0])
        if tag=='a' and a.get('href'):
            href=a['href']
            if not href.startswith(('http:','https:','mailto:','tel:','#')):self.internal_hrefs.append(href.split('#')[0].split('?')[0])

class Features(unittest.TestCase):
    def test_static_wiring(self):
        expected={
          'transfer.html':['transferCategories','transferExport','transferInput','transferRestore','transferStatus'],
          'tools.html':['codec','codecInput','codecB64Encode','codecB64Decode','codecUrlEncode','codecUrlDecode','color','colorHex','colorPicker'],
          'notes.html':['notePreviewToggle','noteMarkdownPreview','diffTrim','diffCase','timeOutput'],
          'bookmarks.html':['exportNetscape','importNetscape','netscapeMode','netscapePreview','confirmNetscape'],
          'directory.html':['atlasExternalDialog','atlasExternalGo','atlasExternalCancel','atlasExternalHost','atlasRemember','atlasClearApprovals'],
          'appearance.html':['aqThemeStatus'],
          'leave.html':['leaveContinue','leaveFullUrl','leaveRemember'],
          'orbit-bridge.html':['orbitPaste','orbitScan','orbitClear','orbitCodes','orbitLinks'],
          'index.html':[]
        }
        for file,required in expected.items():
            p=Parse();p.feed((SITE/file).read_text('utf-8'))
            self.assertEqual(len(p.ids),len(set(p.ids)),file+' duplicate IDs')
            for key in required:self.assertIn(key,p.ids,file+' missing ID '+key)
            for target in p.data_targets:self.assertIn(target,p.ids,file+' broken module '+target)
            for src in p.scripts:self.assertTrue((SITE/src).is_file(),file+' missing script '+src)
            for target in p.internal_hrefs:
                if target and ('.' in target or target.endswith('/')):
                    self.assertTrue((SITE/target).is_file(),file+' broken page link '+target)
    def test_visible_mode_on_all_pages(self):
        for f in SITE.glob('*.html'):
            if f.name=='deploy-status.html':continue
            html=f.read_text('utf-8')
            if '<header' not in html:continue
            self.assertIn('data-aq-theme-link',html,f.name+' missing static mode link')
            self.assertIn('src="theme.js?v=15"',html,f.name+' missing explicit theme')
            self.assertRegex(html,r'href="theme\.css\?v=(?:15|16|17|18|19|20|21|22|23|24|25)"',f.name+' missing recent theme css')

    def test_service_worker_entries(self):
        s=(SITE/'sw.js').read_text('utf-8')
        entries=re.findall(r"'\./([^']+)'",s.split('function isChallenge',1)[0])
        self.assertGreaterEqual(len(entries),35)
        self.assertEqual(len(entries),len(set(entries)))
        for entry in entries:self.assertTrue((SITE/entry).is_file(),entry)
        for asset in ('quick-search.js','device-transfer.js','transfer-schema.js','transfer.html','notes-enhance.js','tool-addons.js','netscape-format.js','theme.js','theme.css','atlas-paths.js','atlas-expansion.js','atlas-depth-a.js','atlas-depth-b.js','atlas-depth-c.js','atlas-depth-d.js','atlas-ai.js','atlas-regional.js','atlas-everyday.js','atlas-regional-ext.js','atlas-everyday-ext.js','atlas-region.js','atlas-region-ui.js','atlas-safety.js','atlas-guides.js','atlas-find.js','atlas-enrich.js','aq-i18n.js','aq-copy.js','orbit-bridge.js','orbit-bridge.html','atlas-taxonomy.js','atlas-catalog-core.js','atlas-summary.js','feedback-pref.js','link-gate.js','leave.html','leave.js','appearance.html'):
            self.assertIn(asset,entries)
        self.assertIn('slowAES.decrypt',s)
        self.assertIn('/_private/',s)
        self.assertIn('/_store/',s)
    def test_backup_privacy_and_static_features(self):
        for file in ('device-transfer.js','transfer-schema.js','quick-search.js','notes-enhance.js','tool-addons.js'):
            data=(SITE/file).read_text('utf-8')
            self.assertNotIn('.innerHTML',data)
            self.assertNotIn('eval(',data)
            if file in ('device-transfer.js','transfer-schema.js'):
                self.assertNotIn('fetch(',data)
                self.assertNotIn('XMLHttpRequest',data)
        self.assertIn('AVENQIR_TRANSFER',(SITE/'transfer-schema.js').read_text('utf-8'))
        self.assertIn('aria-haspopup',(SITE/'quick-search.js').read_text('utf-8'))

if __name__=='__main__':
    unittest.main()
