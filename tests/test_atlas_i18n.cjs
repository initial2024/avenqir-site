"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const site=path.resolve(__dirname,'../site');
const enrich=require(path.join(site,'atlas-enrich.js'));
const language=require(path.join(site,'aq-i18n.js'));
const finder=require(path.join(site,'atlas-find.js'));
const guides=require(path.join(site,'atlas-guides.js'));
const paths=require(path.join(site,'atlas-paths.js'));
const gate=require(path.join(site,'link-gate.js'));
require(path.join(site,'atlas-expansion.js'));
require(path.join(site,'atlas-specialist.js'));
for(const n of ['a','b','c','d'])require(path.join(site,'atlas-depth-'+n+'.js'));
require(path.join(site,'atlas-ai.js'));
require(path.join(site,'atlas-regional.js'));
require(path.join(site,'atlas-everyday.js'));
require(path.join(site,'atlas-regional-ext.js'));
require(path.join(site,'atlas-everyday-ext.js'));
const catalog=require(path.join(site,'atlas-catalog-core.js'));
assert.equal(catalog.catalog().length,1028,'original curated resources preserved');
assert.equal(language.LOCALES.length,40,'forty manually selectable interface locales');
assert.equal(new Set(language.LOCALES.map(x=>x.code)).size,40);
assert.equal(language.detect([]),'en','no detectable browser language defaults to English');
assert.equal(language.detect(['xx-YY','aa-XX']),'en');
assert.equal(language.detect(['zz-XX','ja-JP']),'ja','first supported browser preference');
assert.equal(language.detect(['en-GB','ja-JP']),'en','browser preference order preserved');
assert.equal(language.detect(['zh-TW']),'zh-Hant');
assert.equal(language.detect(['zh-CN']),'zh-Hans');
assert.equal(language.normalize('__proto__'),null);
assert.equal(language.translate('nav.directory','fr'),'Sites web');
assert.equal(language.translate('nav.bookmarks','ja'),'ブックマーク');
assert.equal(language.translate('nav.directory','xx'),'Websites');
assert.equal(language.category('开发')==='开发'||language.category('开发')==='Development',true,'category mapping safe outside browser');
assert.equal(finder.initials('书签'),'sq','Chinese initials for common bookmarks term');
assert.equal(finder.initials('网络'),'wl','Chinese initials for network category');
assert.ok(finder.matches('sq',['私人书签']));
assert.ok(finder.matches('network',['Network diagnostics']));
assert.ok(!finder.matches('abcdxyz',['私人书签']));

const records=[
 {name:'GitHub advanced repository',url:'https://github.com/initial2024/new-project',description:'code hosting'},
 {name:'Unidentified public resource',url:'https://new-resource.example.org/',description:'An independent useful page.'},
 {name:'Unknown public library',url:'https://unknown.example.org/',category:'阅读',description:'Book reference'},
 {name:'Image generation tool',url:'https://imaginary-tool.example.org/en/',description:'AI image generation'},
 {name:'Multifunction research site',url:'https://misc.example.org/',description:'academic papers and network diagnostics'}
];
assert.equal(enrich.suggestCategory(records[0]).category,'开源项目','specific domain category');
assert.equal(enrich.suggestCategory(records[1]).category,'待分类','no unreliable guess');
assert.equal(enrich.suggestCategory(records[3]).category,'AI绘图');
assert.equal(enrich.suggestCategory(records[4]).category,'待分类','ambiguous keywords not forced');
assert.equal(enrich.enrich(records[2]).category,'阅读','editor category always takes priority');
assert.equal(enrich.enrich(records[0]).categorySource,'high');
assert.equal(enrich.enrich(records[1]).categorySource,'none');
assert.deepEqual(enrich.urlLanguages('https://example.org/ja/help'),['ja']);
assert.deepEqual(enrich.urlLanguages('https://example.org/zh-CN/page'),['zh-Hans']);
assert.deepEqual(enrich.urlLanguages('https://example.jp/news'),[],'country-code TLD is not website language');
assert.deepEqual(enrich.urlLanguages('https://example.org/products'),[],'ordinary URL path is not a language');
assert.deepEqual(enrich.languages({url:'https://example.jp/',languages:['ja','en']}).values,['ja','en']);
assert.deepEqual(enrich.languages({url:'https://example.jp/'}).values,[],'region is not language');
assert.equal(enrich.priority({url:'https://example.org/ja/',languages:['en']},'en'),0,'explicit tags override path guesses');
assert.equal(enrich.priority({url:'https://example.org/'},'ja'),1,'unknown retained by default');
assert.equal(enrich.priority({url:'https://example.org/',languages:['en']},'ja'),2,'English as general fallback after unknown');
assert.equal(enrich.priority({url:'https://example.org/',languages:['fr']},'ja'),3,'known nonmatch sorted last');
const remote=catalog.sanitize([
 {name:'Research portal',url:'https://new-site.example.org/en/',description:'Academic research papers',category:'',languages:['en','ja']},
 {name:'Unspecified source',url:'https://no-topic.example.org/',description:'Nothing to categorize',languages:[]}
]);
assert.equal(remote.length,2);
const merged=catalog.catalog(remote);
assert.equal(merged.length,1030);
assert.equal(merged[0].category,'学术');
assert.deepEqual(merged[0].languages,['en','ja']);
assert.equal(merged[0].languageSource,'explicit');
assert.equal(merged[1].category,'待分类');
assert.deepEqual(merged[1].languages,[]);
assert.equal(gate.officialSourceReviewed(merged[0].url),false,'auto category does NOT grant official provenance');
assert.equal(gate.maySkipConfirmation(merged[0].url,null),false,'auto category cannot bypass gate');

for(const flow of paths.flows){
 const zh=guides.forFlow(flow,'zh-Hans'),en=guides.forFlow(flow,'en'),ja=guides.forFlow(flow,'ja');
 assert.ok(zh&&en&&ja,flow.id);
 assert.equal(zh.steps.length,flow.urls.length);
 assert.equal(en.steps.length,flow.urls.length);
 assert.deepEqual(en.steps.map(x=>x.url),flow.urls,'guide stays aligned to original links');
 assert.equal(en.outcome,ja.outcome,'untranslated guide text falls back to English');
 assert.ok(en.check.length>10);
}
const map=new Map([['avenqir.locale.v1','ja']]);
const window={navigator:{languages:['fr-FR','en-US']},localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
vm.runInNewContext(fs.readFileSync(path.join(site,'aq-i18n.js'),'utf8'),{window});
assert.equal(window.AVENQIR_I18N.locale,'ja','saved manual language overrides browser');
assert.equal(window.AVENQIR_I18N.set('de'),true);
assert.equal(map.get('avenqir.locale.v1'),'de');
assert.equal(window.AVENQIR_I18N.locale,'de');
assert.equal(window.AVENQIR_I18N.set('auto'),true);
assert.equal(map.has('avenqir.locale.v1'),false,'automatic mode removes preference');
assert.equal(window.AVENQIR_I18N.locale,'fr');
assert.equal(window.AVENQIR_I18N.set('xx-QQ'),false,'unsupported code not stored');
const dir=fs.readFileSync(path.join(site,'directory.html'),'utf8');
const home=fs.readFileSync(path.join(site,'index.html'),'utf8');
const page=fs.readFileSync(path.join(site,'directory.js'),'utf8');
const backend=fs.readFileSync(path.join(site,'server-core.php'),'utf8');
const admin=fs.readFileSync(path.join(site,'admin.php'),'utf8');
const sw=fs.readFileSync(path.join(site,'sw.js'),'utf8');
const siteJs=fs.readFileSync(path.join(site,'site.js'),'utf8');
for(const html of [dir,home]){
 assert.ok(html.indexOf('atlas-enrich.js?v=24')<html.indexOf('atlas-catalog-core.js?v=19'),'enrichment loads before catalog');
}
assert.ok(dir.includes('atlasSiteLanguageMode'));
assert.ok(dir.includes('atlasSiteLanguageHint'));
assert.ok(page.includes("languageMode()!=='exact'||languageRank(x)===0"));
assert.ok(page.includes("enrichment?.priority"));
assert.ok(page.includes('categorySource'));
assert.ok(backend.includes("infer_link_category"));
assert.ok(backend.includes("valid_link_languages"));
assert.ok(admin.includes('name="languages"'));
assert.ok(admin.includes('分类（可留空自动建议）'));
assert.ok(sw.includes("'./atlas-enrich.js'"));
assert.ok(siteJs.includes('aq-i18n.js?v=23'));
assert.ok(!fs.readFileSync(path.join(site,'atlas-enrich.js'),'utf8').includes('fetch('));
console.log('PASS: 40 interface locales, browser auto/English fallback, local manual preference, 11 bilingual guides, cautious future-site category and explicit language matching with original security gate');
