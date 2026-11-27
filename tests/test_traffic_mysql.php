<?php
declare(strict_types=1);
require __DIR__.'/../site/traffic-core.php';
$dsn=getenv('AQ_TEST_DSN')?:'';
if($dsn!=='mysql:host=127.0.0.1;port=3306;dbname=avenqir_test;charset=utf8mb4')throw new RuntimeException('Isolated fixture DB required');
$db=new PDO($dsn,getenv('AQ_TEST_USER'),getenv('AQ_TEST_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
function yes(bool $ok,string $msg):void{if(!$ok)throw new RuntimeException($msg);}
aq_traffic_schema($db);
$now=time();$day=aq_traffic_day($now);$input=['page'=>'home','source'=>'xiaohongshu'];$key='fixture-key';
yes(!aq_traffic_enabled($db),'default off');
aq_traffic_record($db,$input,'8.8.8.8',$key,$now);
yes(aq_traffic_report($db,$day,7)['daily']===[],'disabled never records');
$db->exec('UPDATE aq_traffic_config SET enabled=1 WHERE id=1');
foreach(['8.8.8.8','8.8.8.9','2606:4700:4700::1111','127.0.0.1'] as $ip)aq_traffic_record($db,$input,$ip,$key,$now);
$r=aq_traffic_report($db,$day,7);
yes((int)$r['daily'][0]['hits']===4&&(int)$r['daily'][0]['networks']===2,'four opens, two network prefixes');
yes($r['groups']['source'][0]['label']==='xiaohongshu','source aggregate');
for($i=0;$i<120;$i++)aq_traffic_record($db,$input,'8.8.8.8',$key,$now);
yes((int)aq_traffic_report($db,$day,7)['daily'][0]['hits']===122,'120 per subnet cap');
$db->exec('UPDATE aq_traffic_config SET enabled=0 WHERE id=1');
aq_traffic_record($db,$input,'9.9.9.9',$key,$now);
yes((int)aq_traffic_report($db,$day,7)['daily'][0]['hits']===122,'paused no new data');
echo "PASS real MySQL traffic: off by default, network dedup, source groups and pause\n";
