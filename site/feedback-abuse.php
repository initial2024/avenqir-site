<?php
declare(strict_types=1);
/* Lightweight server-side friction, not a proof of humanity or bot detection.
 * Only public feedback POSTs. No third-party calls, fingerprinting or raw IP.
 * Bounded state, ten-minute HMAC salt, serialized counters. */
function fb_abuse_step(array $s,int $bucket,string $peer):array {
 if(($s['bucket']??null)!==$bucket)$s=['bucket'=>$bucket,'salt'=>bin2hex(random_bytes(32)),'total'=>0,'peers'=>[]];
 if(!is_string($s['salt']??null)||!is_int($s['total']??null)||!is_array($s['peers']??null))throw new RuntimeException('invalid quota');
 $k=hash_hmac('sha256',$peer,$s['salt']);$n=$s['peers'][$k]??0;
 if($s['total']>=120||$n>=8)return [['code'=>429,'challenge'=>true],$s];
 $s['total']++;$s['peers'][$k]=$n+1;
 return [['code'=>200,'challenge'=>$n>=2],$s];
}
function fb_abuse_budget():array {
 $dir=__DIR__.'/_store';$deny=['code'=>503,'challenge'=>false];
 if(!store_init($dir))return $deny;
 $fp=@fopen($dir.'/.feedback-quota.lock','c');
 if($fp===false)return $deny;
 if(!@flock($fp,LOCK_EX|LOCK_NB)){fclose($fp);return $deny;}
 try{
  $ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');
  if(!filter_var($ip,FILTER_VALIDATE_IP))$ip='unknown';
  [$result,$next]=fb_abuse_step(stored_read('feedback_quota')??[],intdiv(time(),600),$ip);
  if($result['code']!==200)return $result;
  return stored_write('feedback_quota',$next)?$result:$deny;
 }catch(Throwable $e){return $deny;}
 finally{flock($fp,LOCK_UN);fclose($fp);}
}
function fb_abuse_required(array $session,int $now):bool{return (int)($session['fb_risk_until']??0)>$now;}
function fb_abuse_issue(array &$session,int $now):array{
 $a=random_int(2,19);$b=random_int(1,9);
 $id=bin2hex(random_bytes(16));
 $session['fb_human']=['id'=>$id,'answer'=>(string)($a+$b),'expires'=>$now+300];
 return ['id'=>$id,'question'=>$a.' + '.$b.' = ?'];
}
function fb_abuse_consume(array &$session,array $post,int $now):bool{
 $c=$session['fb_human']??null;unset($session['fb_human']);
 return is_array($c)&&($c['expires']??0)>$now&&
 is_string($post['human_id']??null)&&is_string($post['human_answer']??null)&&
 hash_equals($c['id'],$post['human_id'])&&hash_equals($c['answer'],trim($post['human_answer']));
}
