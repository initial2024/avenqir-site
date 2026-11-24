<?php
declare(strict_types=1);
/* Optional production Turnstile, restricted to AVENQIR and two actions.
 * No third-party calls on ordinary directory browsing. Never return or log secrets. */
const FB_TS_HOST='avenqir.bg5.net';
function fb_ts_keys_valid($site,$secret):bool {
 return is_string($site)&&is_string($secret)&&
 preg_match('/^[A-Za-z0-9_-]{20,128}$/D',$site)===1&&
 preg_match('/^[A-Za-z0-9_-]{20,128}$/D',$secret)===1&&
 !preg_match('/^[123]x000000/',$site)&&!preg_match('/^[123]x000000/',$secret);
}
function fb_ts_config():array {
 $s=stored_read('feedback_turnstile');
 if($s===null)return ['mode'=>is_file(store_path('feedback_turnstile'))?'unavailable':'local'];
 if(($s['enabled']??null)===false)return ['mode'=>'local'];
 if(($s['enabled']??null)!==true||!fb_ts_keys_valid($s['sitekey']??null,$s['secret']??null))return ['mode'=>'unavailable'];
 return ['mode'=>'turnstile','sitekey'=>$s['sitekey'],'secret'=>$s['secret']];
}
function fb_ts_headers():void {
 header("Content-Security-Policy: default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
}
function fb_ts_verdict($reply,string $action,int $now):bool {
 if(!in_array($action,['feedback','feedback_test'],true)||!is_array($reply)||($reply['success']??null)!==true||
 ($reply['hostname']??null)!==FB_TS_HOST||($reply['action']??null)!==$action||!is_string($reply['challenge_ts']??null))return false;
 $ts=strtotime($reply['challenge_ts']);
 return $ts!==false&&$ts<=$now+15&&$ts>=$now-300;
}
function fb_ts_verify(array $cfg,$token,string $action):bool {
 if(($cfg['mode']??'')!=='turnstile'||!is_string($token)||strlen($token)<1||strlen($token)>2048||
 !in_array($action,['feedback','feedback_test'],true)||!function_exists('curl_init'))return false;
 $c=curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
 if($c===false)return false;
 try{
  curl_setopt_array($c,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>http_build_query(['secret'=>$cfg['secret'],'response'=>$token]),CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>8,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>['Content-Type: application/x-www-form-urlencoded']]);
  $body=curl_exec($c);
  return is_string($body)&&strlen($body)<=16384&&curl_getinfo($c,CURLINFO_HTTP_CODE)===200&&fb_ts_verdict(json_decode($body,true),$action,time());
 }catch(Throwable $e){return false;}
 finally{curl_close($c);}
}
