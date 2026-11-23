"use strict";
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../site');
const netscape=require(path.join(root,'netscape-format.js'));
const themes=require(path.join(root,'theme.js'));
const record=(name,url,category)=>({name,url,category,note:'',fav:false,todo:false,custom:true,at:Date.now(),id:name});
const original=[
  record('GitHub 与 文档','https://github.com/','开发'),
  record('日本語 <测试>','https://example.com/path?q=%E6%97%A5%E6%9C%AC&v=1','学习'),
  record('备忘 & 笔记','https://example.com/a','学习')
];
const exported=netscape.exportHTML(original);
assert.match(exported,/NETSCAPE-Bookmark-file-1/);
assert.match(exported,/charset=UTF-8/i);
assert.match(exported,/&amp;/);
assert.match(exported,/&lt;测试&gt;/);
const imported=netscape.parse(exported);
assert.equal(imported.records.length,3);
assert.equal(imported.records[0].category,'开发');
assert.equal(imported.records[1].category,'学习');
assert.equal(imported.records[1].name,'日本語 <测试>');
assert.equal(imported.records[2].name,'备忘 & 笔记');
assert.equal(imported.skipped,0);
assert.equal(imported.duplicates,0);
const bad=[
'<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>',
'<DT><H3>测试分类</H3><DL><p>',
'<DT><A HREF="javascript:alert(1)">JS</A>',
'<DT><A HREF="https://user:secret@example.com/">Credentials</A>',
'<DT><A HREF="https://safe.example/a?b=1&amp;c=2">Valid 甲</A>',
'<DT><A HREF="https://safe.example/a?b=1&amp;c=2">Duplicate</A>',
'<DT><A HREF="file:///etc/passwd">File</A>',
'</DL><p></DL><p>'].join('\n');
const clean=netscape.parse(bad);
assert.equal(clean.records.length,1);
assert.equal(clean.records[0].url,'https://safe.example/a?b=1&c=2');
assert.equal(clean.skipped,3);
assert.equal(clean.duplicates,1);
assert.equal(clean.records[0].category,'测试分类');
const injection='<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="https://example.com">x&lt;img src=x onerror=alert(1)&gt;</A></DL>';
assert.equal(netscape.parse(injection).records[0].name,'x<img src=x onerror=alert(1)>');
assert.match(netscape.exportHTML([record('<script>alert(1)</script>','https://example.com','学习')]),/&lt;script&gt;/);
assert.throws(()=>netscape.parse('<html>not bookmarks</html>'));
assert.throws(()=>netscape.parse('x'.repeat(1024*1024+10)));
let large='<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>';
for(let i=0;i<201;i++)large+='<DT><A HREF="https://example.com/'+i+'">Item '+i+'</A>\n';
assert.throws(()=>netscape.parse(large),/超过/);
assert.equal(themes.valid('dark'),'dark');
assert.equal(themes.valid('eye'),'eye');
assert.equal(themes.valid('light'),'light');
assert.equal(themes.valid('invalid'),'system');
assert.equal(themes.resolve('system',true),'light');
assert.equal(themes.resolve('system',false),'dark');
assert.equal(themes.resolve('eye',true),'eye');
console.log('PASS: Netscape browser interchange, nested folders, UTF-8, XSS inertness, bad schemes, limits, and theme resolution');
