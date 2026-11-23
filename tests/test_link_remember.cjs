"use strict";
const assert=require('node:assert/strict');
const gate=require('../site/link-gate.js');
const map=new Map();
const store={getItem:k=>map.has(k)?map.get(k):null,setItem(k,v){map.set(k,v);},removeItem:k=>map.delete(k)};
assert.equal(gate.approvalCount(store),0);
assert.equal(gate.officialSourceReviewed('https://github.com/'),true);
const site='https://example.com/guide';
assert.equal(gate.maySkipConfirmation(site,store),false);
assert.equal(gate.urlRisk(site).rememberable,true);
assert.equal(gate.remember(site,store),true);
assert.equal(gate.maySkipConfirmation(site,store),true);
assert.equal(gate.approvalCount(store),1);
assert.equal(gate.isRemembered('https://example.com/other',store),false);
assert.equal(gate.isRemembered('https://example.com/guide?mode=1',store),false);
assert.equal(gate.remember('https://example.com/guide?token=secret',store),false);
assert.equal(gate.remember('http://example.com/',store),false);
assert.equal(gate.remember('https://xn--pple-43d.com/',store),false);
assert.equal(gate.remember('https://192.0.2.1/',store),false);
assert.equal(gate.remember('https://example.com/#section',store),false);
for(const u of ['javascript:alert(1)','data:text/html,malicious','file:///etc/passwd',
 'https://127.0.0.1/','http://localhost/','https://192.168.1.3/','https://10.1.2.3/',
 'https://[::1]/','https://user:pass@example.com/','https://169.254.169.254/']){
 assert.equal(gate.urlRisk(u).blocked,true,'must block '+u);
 assert.equal(gate.maySkipConfirmation(u,store),false);
}
const original=Date.now;
Date.now=()=>1760000000000;
assert.equal(gate.remember('https://example.org/',store),true);
Date.now=()=>1760000000000+31*24*60*60*1000;
assert.equal(gate.isRemembered('https://example.org/',store),false,'must expire after 30 days');
Date.now=original;
gate.clearRemembered(store);
assert.equal(gate.approvalCount(store),0);
assert.equal(gate.isRemembered(site,store),false);
const txt=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../site/directory.html'),'utf8');
for(const engine of ['google','bing','duck']){
 assert.match(txt,new RegExp('data-no-match-engine="'+engine+'" rel="noreferrer noopener" referrerpolicy="no-referrer" href="https://'));
}
assert.ok(!txt.includes('data-external="google"'),'no old dead-end search buttons');
assert.match(txt,/id="atlasRemember"/);
assert.match(txt,/id="atlasClearApprovals"/);
console.log('PASS: 30-day exact URL approval, expiry, revoke, dangerous URL hard-block and native consent-based external search links');
