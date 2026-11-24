<?php
declare(strict_types=1);
/* Fixed-size, minute-local rate budget. Never trust X-Forwarded-For or record raw IP.
 * Not an app identity or a substitute for host/WAF limits. */
function aq_status_quota_step(array $state,int $minute,string $ip):array {
 if(($state['minute']??null)!==$minute){
  $state=['minute'=>$minute,'salt'=>bin2hex(random_bytes(32)),'total'=>0,'peers'=>[]];
 }
 if(!is_string($state['salt']??null)||!is_int($state['total']??null)||!is_array($state['peers']??null))throw new RuntimeException('Invalid quota state');
 $key=hash_hmac('sha256',$ip,$state['salt']);
 $count=$state['peers'][$key]??0;
 if($state['total']>=180||$count>=12)return [429,$state];
 $state['total']++;$state['peers'][$key]=$count+1;
 return [200,$state];
}
function aq_status_quota():int {
 $dir=__DIR__.'/_store';
 if(!store_init($dir))return 503;
 $lock=@fopen($dir.'/.status-quota.lock','c');
 if($lock===false)return 503;
 if(!@flock($lock,LOCK_EX|LOCK_NB)){fclose($lock);return 503;}
 try{
  $ip=(string)($_SERVER['REMOTE_ADDR']??'');
  if(filter_var($ip,FILTER_VALIDATE_IP)===false)$ip='unknown';
  [$code,$next]=aq_status_quota_step(stored_read('status_quota')??[],intdiv(time(),60),$ip);
  if($code!==200)return $code;
  return stored_write('status_quota',$next)?200:503;
 }catch(Throwable $e){return 503;}
 finally{flock($lock,LOCK_UN);fclose($lock);}
}
