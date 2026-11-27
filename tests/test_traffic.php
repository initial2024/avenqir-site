<?php
declare(strict_types=1);
require __DIR__.'/../site/traffic-core.php';
function check(bool $ok,string $msg):void{if(!$ok)throw new RuntimeException($msg);}
check(aq_traffic_day(57600)===1,'UTC+8 rollover');
[$family,$prefix]=aq_traffic_network('8.8.8.8');check($family==='ipv4'&&strlen($prefix)===3,'v4 /24');
check(aq_traffic_network('8.8.8.9')[1]===$prefix,'same subnet');
check(aq_traffic_network('::ffff:8.8.8.8')===[$family,$prefix],'mapped address normalization');
check(aq_traffic_network('2606:4700:4700::1111')[0]==='ipv6','v6');
check(strlen(aq_traffic_network('2606:4700:4700::1111')[1])===6,'v6 /48');
foreach(['127.0.0.1','10.1.2.3','100.64.1.2','bad'] as $ip)check(aq_traffic_network($ip)===['unknown',null],'unknown IP');
check(aq_traffic_digest('test',1,$family,$prefix)!==aq_traffic_digest('test',2,$family,$prefix),'daily rotation');
check(aq_traffic_digest('test',1,'unknown',null)===null,'unknown not unique');
check(aq_traffic_input(['page'=>'directory','source'=>'xiaohongshu']),'valid bounded input');
foreach([['page'=>'admin','source'=>'direct'],['page'=>'home','source'=>'https://example.com/private'],['page'=>'home','source'=>'direct','ip'=>'1.2.3.4']] as $row)check(!aq_traffic_input($row),'reject raw input');
echo "PASS traffic network grouping, daily rotation and input minimization\n";
