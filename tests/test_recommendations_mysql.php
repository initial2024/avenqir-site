<?php
declare(strict_types=1);
require __DIR__.'/../site/recommendations-core.php';
// Never run these mutations against a production DB.
$dsn=getenv('AQ_TEST_DSN')?:'';
if(!str_contains($dsn,'host=127.0.0.1;')||!str_contains($dsn,'dbname=avenqir_test;'))throw new RuntimeException('Isolated fixture DB required');
$db=new PDO($dsn,getenv('AQ_TEST_USER'),getenv('AQ_TEST_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
function yes(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
rec_schema($db);
$key='fixture-key-not-for-production';
$now=intdiv(time(),86400)*86400+3600;
$vote=static fn(int $i)=>hash('sha256','fixture-'.$i);
$event=static fn(string $a,string $id,int $i,int $stars=5)=>['action'=>$a,'tool_id'=>$id,'voter_token'=>$vote($i),'stars'=>$stars];
$cat=['r1'=>[],'r2'=>[],'r3'=>[]];
yes(rec_write($db,$key,$event('click','r1',1),'8.8.8.8',$now)==='recorded','first open');
yes(rec_write($db,$key,$event('click','r1',1),'8.8.8.8',$now+299)==='duplicate','rolling <300 seconds');
yes(rec_write($db,$key,$event('click','r1',1),'8.8.8.8',$now+300)==='recorded','rolling 300 seconds');
yes(rec_write($db,$key,$event('click','r2',1),'8.8.8.8',$now+301)==='recorded','different tool');
for($i=0;$i<5;$i++)yes(rec_write($db,$key,$event('rate','r1',$i+1,4),'11.'.$i.'.0.1',$now+400)==='recorded','rating insert');
yes(rec_write($db,$key,$event('rate','r1',1,5),'11.0.0.1',$now+401)==='recorded','rating edit');
yes(rec_write($db,$key,$event('rate','r1',1,5),'11.0.0.1',$now+402)==='recorded','third rating');
yes(rec_write($db,$key,$event('rate','r1',1,1),'11.0.0.1',$now+403)==='limited','fourth rating denied');
yes(rec_write($db,$key,$event('rate','r2',1,5),'12.0.0.1',$now+404)==='recorded','small sample');
$stats=rec_stats($db,$cat,$now+500,7);
yes($stats['r1']['count']===5&&abs($stats['r1']['average']-4.2)<0.01,'one vote per browser');
yes($stats['r1']['clicks']===2&&$stats['r1']['score']===86,'Bayesian prior 3.5 plus normalized heat');
yes($stats['r2']['count']===1&&$stats['r2']['average']===null&&$stats['r2']['score']===null,'small sample suppressed');
for($i=0;$i<10;$i++)yes(rec_write($db,$key,$event('click','r3',$i+100),'9.9.9.'.($i+1),$now+600)==='recorded','network click allowance');
yes(rec_write($db,$key,$event('click','r3',111),'9.9.9.99',$now+600)==='limited','same IPv4 /24 quota');
for($i=0;$i<5;$i++)yes(rec_write($db,$key,$event('rate','r3',$i+100,4),'13.2.3.'.($i+1),$now+610)==='recorded','network rating allowance');
yes(rec_write($db,$key,$event('rate','r3',112,4),'13.2.3.99',$now+610)==='limited','same IPv4 /24 rating quota');
yes(rec_write($db,$key,$event('remove','r1',1),'11.0.0.1',$now+620)==='recorded','withdraw one');
yes(rec_stats($db,$cat,$now+630,7)['r1']['average']===null,'below threshold after withdrawal');
$db->prepare('INSERT INTO aq_rec_daily(tool_id,day_id,hits) VALUES (?,?,?)')->execute(['r1',intdiv($now,86400)-10,9]);
yes(rec_stats($db,$cat,$now+630,7)['r1']['clicks']===2,'seven-day filter');
yes(rec_stats($db,$cat,$now+630,30)['r1']['clicks']===11,'thirty-day filter');
echo "PASS actual MySQL: rolling cooldown, unique vote, thresholds, Bayesian score, network limits, withdrawal and time windows\n";
