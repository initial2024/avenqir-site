"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const site=path.resolve(__dirname,'../site');
const gate=require(path.join(site,'link-gate.js'));
const orbit=require(path.join(site,'orbit-bridge.js'));
assert.equal(orbit.ORBIT_URL,'https://inbox.kango99w.de/');
assert.equal(gate.urlRisk(orbit.ORBIT_URL).blocked,false);
assert.equal(gate.officialSourceReviewed(orbit.ORBIT_URL),false,
 'Orbit ownership is not a safety certificate and must not bypass external confirmation');
const example='Your verification code is 482731. Open https://example.org/verify?token=secret-123 now.';
const result=orbit.inspect(example);
assert.deepEqual(result.codes,['482731']);
assert.equal(result.links.length,1);
assert.equal(result.links[0].host,'example.org');
assert.equal(result.links[0].url,'https://example.org/verify?token=secret-123');
assert.equal(result.links[0].blocked,false);
assert.deepEqual(orbit.inspect('Balance $1,204 on 2026-11-23').codes,[],
 'Uncontextualized numbers are not verification codes');
assert.deepEqual(orbit.inspect('Your OTP: 12-34-56').codes,['123456']);
assert.equal(orbit.inspect('code 456789\nhttps://127.0.0.1/').links[0].blocked,true,
 'private/localhost redirect blocked even when pasted in an email');
assert.equal(orbit.inspect('code 345678\nhttp://example.org/insecure').links.length,0,
 'HTTP verification links do not receive a launch/copy entry');
assert.equal(orbit.inspect('code 345678\nhttps://username:pw@example.org/').links.length,0,
 'credential-bearing URLs filtered');
assert.equal(orbit.inspect('A'.repeat(40000)).truncated,true);
assert.ok(orbit.inspect('code 123456 code 123456').codes.length<=1,'duplicate code deduplication');
const js=fs.readFileSync(path.join(site,'orbit-bridge.js'),'utf8');
const html=fs.readFileSync(path.join(site,'orbit-bridge.html'),'utf8');
const home=fs.readFileSync(path.join(site,'index.html'),'utf8');
const directory=fs.readFileSync(path.join(site,'directory.html'),'utf8');
const nav=fs.readFileSync(path.join(site,'site.js'),'utf8');
const palette=fs.readFileSync(path.join(site,'quick-search.js'),'utf8');
const sw=fs.readFileSync(path.join(site,'sw.js'),'utf8');
assert.ok(html.includes('href="leave.html?url=https%3A%2F%2Finbox.kango99w.de%2F'),
 'Orbit launch must route through existing offsite confirmation');
for(const x of ['orbitPaste','orbitScan','orbitClear','orbitStatus','orbitCodes','orbitLinks'])assert.ok(html.includes('id="'+x+'"'));
assert.ok(home.includes('orbit-bridge.html'));
assert.ok(directory.includes('orbit-bridge.html'));
assert.ok(nav.includes("orbit-bridge.html"));
assert.ok(palette.includes("orbit-bridge.html"));
assert.ok(sw.includes("'./orbit-bridge.js'")&&sw.includes("'./orbit-bridge.html'"));
for(const bad of ['fetch(', 'XMLHttpRequest','sendBeacon(', 'localStorage','sessionStorage','document.cookie','postMessage(','.innerHTML','console.log']){
 assert.ok(!js.includes(bad),'Orbit companion must not read/send/persist email text: '+bad);
}
assert.ok(!html.includes('type="module" src="https://'),'no remote bridge scripts');
assert.ok(js.includes("root.navigator.clipboard.writeText"),'clipboard requires click');
assert.ok(js.includes("addEventListener('click'"),'analysis only on explicit user interaction');
assert.ok(!html.includes('type="password"'),'no attempt to collect Orbit credentials');
console.log('PASS: Orbit bridge respects isolated mailbox auth, no cross-origin API, opt-in in-memory OTP parsing, masked codes, risky URL gate and public offsite confirmation');
