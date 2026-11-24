<?php
require __DIR__.'/../site/feedback-turnstile.php';
function ck($v){if(!$v)throw new RuntimeException('Turnstile policy failed');}
ck(!fb_ts_keys_valid('1x00000000000000000000AA','1x0000000000000000000000000000000AA'));
ck(fb_ts_keys_valid(str_repeat('a',24),str_repeat('b',32)));
$n=1800000000;$good=['success'=>true,'hostname'=>'avenqir.bg5.net','action'=>'feedback','challenge_ts'=>gmdate('c',$n-10)];
ck(fb_ts_verdict($good,'feedback',$n));
ck(!fb_ts_verdict($good,'feedback_test',$n));
foreach(['success'=>false,'hostname'=>'evil.example','action'=>'login','challenge_ts'=>gmdate('c',$n-301)] as $k=>$v)ck(!fb_ts_verdict(array_replace($good,[$k=>$v]),'feedback',$n));
ck(!fb_ts_verify(['mode'=>'local'],'fake','feedback'));
echo "PASS production-only keys, host/action/freshness and fail-closed verification\n";
