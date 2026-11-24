<?php
require __DIR__.'/../site/feedback-abuse.php';
function check($v){if(!$v)throw new RuntimeException('feedback protection failed');}
$s=[];
for($i=0;$i<8;$i++){[$r,$s]=fb_abuse_step($s,1,'203.0.113.1');check($r['code']===200&&$r['challenge']===($i>=2));}
[$r,$s]=fb_abuse_step($s,1,'203.0.113.1');check($r['code']===429);
check(strpos(json_encode($s),'203.0.113.1')===false);
[$r,$s]=fb_abuse_step($s,2,'203.0.113.1');check($r['code']===200&&!$r['challenge']);
$session=[];$c=fb_abuse_issue($session,100);$post=['human_id'=>$c['id'],'human_answer'=>$session['fb_human']['answer']];
check(fb_abuse_consume($session,$post,101));check(!fb_abuse_consume($session,$post,102));
$c=fb_abuse_issue($session,100);$post=['human_id'=>$c['id'],'human_answer'=>$session['fb_human']['answer']];check(!fb_abuse_consume($session,$post,401));
echo "PASS feedback POST budget, risk challenge, expiry and replay rejection\n";
