"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const site=path.resolve(__dirname,'../site');
const gate=require(path.join(site,'link-gate.js'));
const safety=require(path.join(site,'atlas-safety.js'));
require(path.join(site,'atlas-paths.js'));
require(path.join(site,'atlas-expansion.js'));
require(path.join(site,'atlas-specialist.js'));
for(const n of ['a','b','c','d'])require(path.join(site,'atlas-depth-'+n+'.js'));
require(path.join(site,'atlas-ai.js'));
require(path.join(site,'atlas-regional.js'));
require(path.join(site,'atlas-everyday.js'));
require(path.join(site,'atlas-regional-ext.js'));
require(path.join(site,'atlas-everyday-ext.js'));
const popularLinks=require(path.join(site,'atlas-popular-links.js'));
const catalog=require(path.join(site,'atlas-catalog-core.js'));
const items=catalog.catalog();
assert.equal(items.length,1239+popularLinks.links.length);
const result=safety.summary(items);
const reviewed=gate.OFFICIAL_URLS.length;
const itemUrls=new Set(items.map(item=>item.url));
assert.ok(gate.OFFICIAL_URLS.every(url=>itemUrls.has(url)));
assert.deepEqual(result,{total:items.length,blocked:0,caution:0,reviewed,pending:items.length-reviewed},'separate structural audit from provenance review');
assert.equal(safety.inspect('https://www.icann.org/').type,'reviewed');
const reviews=fs.readdirSync(site).filter(file=>/^atlas-review-.+\.json$/.test(file))
 .map(file=>JSON.parse(fs.readFileSync(path.join(site,file),'utf8')));
const superseded=new Set(reviews.flatMap(doc=>doc.records.flatMap(row=>
 row.previousUrl?[row.previousUrl]:row.status==='revoked'?[row.url]:[]
)));
for(const doc of reviews){
 for(const row of doc.records){
  if(row.status==='pending')continue;
  if(superseded.has(row.url)){
   assert.equal(gate.officialSourceReviewed(row.url),false);
   continue;
  }
  assert.ok(itemUrls.has(row.url),'Review outside the curated catalog: '+row.url);
  assert.ok(row.source.startsWith('https://'));
  assert.equal(gate.officialSourceReviewed(row.url),true);
  assert.equal(gate.maySkipConfirmation(row.url+'?next=evil',null),false);
 }
}
for(const url of ['https://www.who.int/','https://pubchem.ncbi.nlm.nih.gov/','https://www.icann.org/','https://www.gov.uk/','https://www.wto.org/']){
 assert.equal(gate.officialSourceReviewed(url),true,'verified source URL '+url);
}
for(const url of ['https://www.icann.org.evil.example.com/','https://www.icann.org/redirect','https://www.icann.org/?next=https://evil.example','https://www.icann.org/#jump','http://www.icann.org/']){
 assert.equal(gate.officialSourceReviewed(url),false,'exact URL provenance prevents unsafe lookalikes: '+url);
}
for(const raw of [
 'javascript:alert(1)','data:text/html,abc','file:///etc/passwd',
 'https://127.0.0.1/','https://0x7f000001/','https://0177.0.0.1/',
 'https://0.0.0.0/','https://10.3.4.5/','https://172.20.1.5/',
 'https://192.168.0.1/','https://169.254.169.254/',
 'https://100.100.1.1/','https://192.0.2.1/','https://198.51.100.2/',
 'https://203.0.113.30/','https://198.18.4.2/',
 'https://224.0.0.1/','https://255.255.255.255/',
 'https://[::1]/','https://[::]/','https://[fe80::abcd]/',
 'https://[fd00::1234]/','https://[fc00::1]/','https://[ff02::1]/',
 'https://[2001:db8::1]/','https://[::ffff:127.0.0.1]/',
 'https://test.internal/','https://foo.local/','https://local.test/',
 'https://foo.invalid/','https://abc.example/'
]){
 const verdict=gate.urlRisk(raw);
 assert.equal(verdict.blocked,true,'private/reserved/unsafe URL must be blocked: '+raw);
 assert.equal(gate.maySkipConfirmation(raw,null),false);
 assert.equal(safety.inspect(raw).type,'blocked');
}
for(const raw of [
 'http://www.gnu.org/','https://xn--pple-43d.com/','https://8.8.8.8/',
 'https://[2606:4700:4700::1111]/','https://bit.ly/a','https://t.co/a',
 'https://foo.zip/','https://foo.mov/','https://example.org/?redirect=1',
 'https://example.org/#item','https://example.org:8443/'
]){
 const verdict=gate.urlRisk(raw);
 assert.equal(verdict.blocked,false,'caution should not be mislabeled malware: '+raw);
 assert.equal(verdict.forcePrompt,true,'danger characteristic requires a prompt: '+raw);
 assert.equal(verdict.rememberable,false);
 assert.equal(safety.inspect(raw).type,'caution');
}
assert.equal(gate.urlRisk('https://www.target.com/').forcePrompt,false,'ordinary .com must not match t.co shortener substring');
assert.equal(gate.urlRisk('https://phet.colorado.edu/').forcePrompt,false,'legitimate short substring in hostname must not trigger');
assert.equal(safety.inspect('https://example.org/').type,'pending');
const storeMap=new Map();
const store={getItem:k=>storeMap.get(k)||null,setItem:(k,v)=>storeMap.set(k,v),removeItem:k=>storeMap.delete(k)};
assert.equal(gate.remember('https://example.org/',store),true);
assert.equal(gate.maySkipConfirmation('https://example.org/',store),true);
assert.equal(safety.inspect('https://example.org/').type,'pending','user consent never becomes official verification');
assert.equal(gate.remember('https://bit.ly/a',store),false,'caution cannot be remembered');
const url=safety.googleStatusLink('https://www.who.int/');
assert.equal(url,'https://transparencyreport.google.com/safe-browsing/search?url='+encodeURIComponent('https://www.who.int/'));
for(const raw of ['https://example.org/?key=secret','https://example.org/#private','http://example.org/','https://127.0.0.1/']){
 assert.equal(safety.googleStatusLink(raw),null,'never disclose tokens/unsafe URLs to external lookups');
}
const html=fs.readFileSync(path.join(site,'directory.html'),'utf8');
const script=fs.readFileSync(path.join(site,'directory.js'),'utf8');
const safetyJS=fs.readFileSync(path.join(site,'atlas-safety.js'),'utf8');
const theme=fs.readFileSync(path.join(site,'theme.css'),'utf8');
const serviceWorker=fs.readFileSync(path.join(site,'sw.js'),'utf8');
const privacy=fs.readFileSync(path.join(site,'privacy.html'),'utf8');
for(const id of ['atlasSecurityTitle','atlasSecurityCounts']){
 assert.ok(html.includes('id="'+id+'"'));
}
const gateScript=html.search(/link-gate\.js\?v=[0-9]+/);
const safetyScript=html.search(/atlas-safety\.js\?v=[0-9]+/);
assert.ok(gateScript>=0&&gateScript<safetyScript);
assert.ok(safetyScript<html.search(/directory\.js\?v=[0-9]+/));
assert.ok(serviceWorker.includes("'./atlas-safety.js'"));
assert.ok(script.includes('renderSafetyAudit()'));
assert.ok(script.includes("a.removeAttribute('href')"),'blocked entries must have no direct link');
assert.ok(script.includes('safety?.googleStatusLink(url)'),'external lookup is per user selection');
assert.ok(html.includes('手动查 Google Safe Browsing'));
assert.ok(theme.includes('.atlas-security-counts'));
assert.ok(privacy.includes('只有你主动点击单条'));
for(const marker of ['fetch(', 'XMLHttpRequest','sendBeacon(','navigator.geolocation','document.cookie']){
 assert.ok(!safetyJS.includes(marker),'no passive third-party or visitor calls: '+marker);
}
assert.ok(!script.includes('安全认证通过'),'must not claim certification');
const backend={url:'https://100.74.2.3/',name:'Untrusted internal link',category:'其他',description:'test'};
const newCounts=safety.summary([backend,...items]);
assert.equal(newCounts.blocked,1,'backend links need identical runtime structural screening');
console.log(`PASS: ${result.total} catalog URLs, ${result.reviewed} exact source reviews, ${result.pending} pending provenance, reserved IPv4/IPv6 blocking and explicit risk checks`);
