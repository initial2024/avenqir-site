"use strict";
const assert=require('node:assert/strict');
const m=require('../site/recommendations-model.js');
assert.equal(m.displayScore({count:1,average:null,score:42},false),null);
assert.equal(m.displayScore({count:4,average:5,score:100},false),null);
assert.equal(m.displayScore({count:5,average:4.2,score:75},false),75);
assert.equal(m.displayScore({clicks:9,score:82},false),null);
assert.equal(m.displayScore({score:70},true),70);
assert.equal(m.displayScore({count:10,average:4,score:101},false),null);
assert.equal(m.publicAverage(undefined),0);
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../site/recommendations.html'),'utf8');
for(const id of ['recScope','recSource','recBasis','recClearFilter'])assert.ok(html.includes('id="'+id+'"'));
const source=fs.readFileSync(require('node:path').join(__dirname,'../site/atlas-source-ui.js'),'utf8');
assert.ok(source.includes("risk.forcePrompt"));
assert.ok(source.includes("badge('blocked')"));
const cat=require('../site/recommendations-catalog.json');
assert.equal(new Set(cat.map(r=>r.id)).size,cat.length);
console.log('v138 recommendation display and catalog contracts PASS');

const dir=fs.readFileSync(require('node:path').join(__dirname,'../site/directory.js'),'utf8');
const rec=fs.readFileSync(require('node:path').join(__dirname,'../site/recommendations.js'),'utf8');
assert.ok(source.includes("'aq:quick-rating'")&&source.includes('cancelable:true'));
assert.ok(rec.includes("dialog.showModal()")&&rec.includes("publicVote.checked")&&rec.includes("sourceUI.refreshRatings(true)"));
assert.ok(dir.includes("sourceUI?.average(x.url)")&&dir.includes("sourceUI?.recommendation(x.url)"));
assert.ok(!rec.includes("write(SHARE,'1');\n        await post"));
console.log('v139 inline rating and directory ranking contracts PASS');

assert.equal(m.returnPrompt({id:'r1',at:1000,departed:true},9000),true);
assert.equal(m.returnPrompt({id:'r1',at:1000,departed:false},9000),false);
assert.equal(m.returnPrompt({id:'r1',at:1000,departed:true},8999),false);
assert.equal(m.returnPrompt({id:'r1',at:1000,departed:true},1801001),false);
assert.equal(m.returnPrompt({id:'https://private.example',at:1000,departed:true},9000),false);
console.log('PASS return-rating session age and departure gates');

assert.equal(m.PAUSE,300000);
assert.ok(dir.includes("'popular'")&&dir.includes('atlasRatingWindow'));
assert.ok(rec.includes("href.startsWith('leave.html')")&&rec.includes('sessionClicks'));
console.log('PASS closed-loop click and ranking wiring');
