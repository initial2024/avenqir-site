<?php
declare(strict_types=1);
/** Single-owner admin identity and opt-in, offline RFC 6238 TOTP.
 * Password & MFA live in the same previously protected auth.php store.
 * Never output/record raw secrets in logs or public APIs.
 */
const AQ_ADMIN_NAME='adm';
function aq_auth_tag(array $auth): string {
  $base=(string)($auth['password_hash']??'');
  $rev=(string)($auth['security_rev']??'');
  // Preserve sessions for previously installed password-only accounts until
  // security-sensitive edits explicitly rotate the revision.
  return hash('sha256',$rev===''?$base:$base.'|'.$rev);
}
function aq_mfa_enabled(array $auth): bool {
  return is_string($auth['totp_secret']??null) && preg_match('/^[A-Z2-7]{32}$/D',$auth['totp_secret'])===1;
}
function aq_secret_create(): string {
  $alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  $bits=0;$buf=0;$out='';
  foreach(str_split(random_bytes(20)) as $c) {
    $buf=($buf<<8)|ord($c);$bits+=8;
    while($bits>=5){$bits-=5;$out.=$alphabet[($buf>>$bits)&31];}
    $buf &= (1<<$bits)-1;
  }
  if($bits>0)$out.=$alphabet[($buf<<(5-$bits))&31];
  return $out;
}
function aq_secret_decode(string $s): ?string {
  if(preg_match('/^[A-Z2-7]{32}$/D',$s)!==1)return null;
  $alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  $buf=0;$bits=0;$raw='';
  foreach(str_split($s) as $c){
    $v=strpos($alphabet,$c);
    if($v===false)return null;
    $buf=($buf<<5)|$v;$bits+=5;
    if($bits>=8){$bits-=8;$raw.=chr(($buf>>$bits)&255);$buf&=(1<<$bits)-1;}
  }
  return strlen($raw)===20?$raw:null;
}
function aq_totp_at_step(string $secret,int $step): ?string {
  if($step<0)return null;
  $key=aq_secret_decode($secret);
  if($key===null)return null;
  $msg=pack('N2',intdiv($step,4294967296),$step%4294967296);
  $digest=hash_hmac('sha1',$msg,$key,true);
  $off=ord($digest[19]) & 15;
  $num=unpack('N',substr($digest,$off,4))[1] & 0x7fffffff;
  return str_pad((string)($num%1000000),6,'0',STR_PAD_LEFT);
}
function aq_totp_matching_step(string $secret,string $otp,?int $now=null,int $last=-1): ?int {
  if(preg_match('/^[0-9]{6}$/D',$otp)!==1)return null;
  $time=$now??time();$base=intdiv($time,30);
  foreach([$base-1,$base,$base+1] as $step){
    if($step<0||$step<=$last)continue;
    $expected=aq_totp_at_step($secret,$step);
    if($expected!==null&&hash_equals($expected,$otp))return $step;
  }
  return null;
}
function aq_recovery_create(): array {
  $codes=[]; $hashes=[];
  for($i=0;$i<10;$i++){
    $plain=strtoupper(bin2hex(random_bytes(10)));
    $codes[]=implode('-',str_split($plain,5));
    $hashes[]=hash('sha256',$plain);
  }
  return [$codes,$hashes];
}
function aq_mfa_verify_and_consume(array $auth,string $input): ?array {
  if(!aq_mfa_enabled($auth))return null;
  $input=trim($input);
  $step=aq_totp_matching_step((string)$auth['totp_secret'],$input,null,(int)($auth['totp_last_step']??-1));
  if($step!==null){$auth['totp_last_step']=$step;return $auth;}
  $normalized=strtoupper(str_replace(['-',' '],'',$input));
  if(preg_match('/^[A-F0-9]{20}$/D',$normalized)!==1)return null;
  $hash=hash('sha256',$normalized);
  $stored=$auth['recovery_hashes']??[];
  if(!is_array($stored))return null;
  foreach($stored as $i=>$candidate){
    if(is_string($candidate)&&hash_equals($candidate,$hash)){
      unset($stored[$i]);$auth['recovery_hashes']=array_values($stored);return $auth;
    }
  }
  return null;
}
function aq_private_access_url($raw): ?string {
  if(!is_string($raw)||strlen($raw)>240)return null;
  $url=trim($raw);
  if(!filter_var($url,FILTER_VALIDATE_URL))return null;
  $parts=parse_url($url);
  if(!is_array($parts)||strtolower((string)($parts['scheme']??''))!=='https')return null;
  if(isset($parts['user'])||isset($parts['pass'])||isset($parts['query'])||isset($parts['fragment']))return null;
  if(isset($parts['port'])&&(int)$parts['port']!==443)return null;
  if(($parts['path']??'/')!=='/' && ($parts['path']??'')!=='')return null;
  $host=strtolower((string)($parts['host']??''));
  if(strlen($host)>253||filter_var($host,FILTER_VALIDATE_IP))return null;
  if(preg_match('/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/D',$host)!==1)return null;
  return 'https://'.$host.'/';
}
