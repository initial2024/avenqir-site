<?php
declare(strict_types=1);
/** Single-owner admin identity and opt-in, offline RFC 6238 TOTP.
 * Password & MFA live in the same previously protected auth.php store.
 * Never output/record raw secrets in logs or public APIs.
 */
const AQ_ADMIN_NAME='adm';
/** Both private backends accept the SAME server-side authenticated adm session. */
function aq_shared_adm_logged(?array $auth,array $session,?int $now=null):bool {
  if(!is_array($auth)||empty($session['logged']))return false;
  $expires=$session['until']??null;
  $tag=$session['auth_tag']??null;
  if(!is_numeric($expires)||(int)$expires<=($now??time())||!is_string($tag))return false;
  return hash_equals(aq_auth_tag($auth),$tag);
}
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


// Opt-in trusted browser, 14 days. NOT a passwordless authenticator.
// It bypasses repeated TOTP only after a fresh password+TOTP registration.
// Token is never stored in plaintext server-side and is scoped to one HTTPS site.
const AQ_TRUST_COOKIE='__Host-AVENQIR_TRUST';
const AQ_TRUST_TTL=1209600;
function aq_trust_cookie_value($cookies):string {
  if(!is_array($cookies))return '';
  $token=$cookies[AQ_TRUST_COOKIE]??'';
  return is_string($token) && preg_match('/^[A-Za-z0-9_-]{43}$/D',$token)===1 ? $token : '';
}
function aq_trust_allowed(?array $auth,$cookies,?int $now=null):bool {
  if(!is_array($auth)||!aq_mfa_enabled($auth))return false;
  $raw=aq_trust_cookie_value($cookies);
  if($raw==='')return false;
  $hash=hash('sha256',$raw);
  $rev=(string)($auth['security_rev']??'');
  foreach(($auth['trusted_devices']??[]) as $d){
    if(!is_array($d))continue;
    if((int)($d['expires']??0)<=($now??time()))continue;
    if(!is_string($d['token_hash']??null) || !is_string($d['rev']??null))continue;
    if(hash_equals($rev,$d['rev']) && hash_equals($d['token_hash'],$hash))return true;
  }
  return false;
}
function aq_trust_set_cookie(string $token,int $expires):void{
  setcookie(AQ_TRUST_COOKIE,$token,[
    'expires'=>$expires,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict'
  ]);
}
function aq_trust_register(string $password):bool{
  // Serialize with MFA login / protected auth writes.
  $lock=@fopen(__DIR__.'/_store/.admin-mfa.lock','c');
  if($lock===false)return false;
  if(!@flock($lock,LOCK_EX)){fclose($lock);return false;}
  $token=null;$expires=0;$ok=false;
  try{
    $latest=stored_read('auth');
    if(!is_array($latest)||!aq_mfa_enabled($latest) ||
       !password_verify($password,(string)($latest['password_hash']??'')))return false;
    $now=time();$expires=$now+AQ_TRUST_TTL;
    $token=rtrim(strtr(base64_encode(random_bytes(32)),'+/','-_'),'=');
    $items=[];
    foreach(($latest['trusted_devices']??[]) as $item){
      if(is_array($item) && (int)($item['expires']??0)>$now &&
         isset($item['token_hash']) && is_string($item['token_hash']) &&
         ($item['rev']??'')===($latest['security_rev']??''))$items[]=$item;
    }
    // Maximum six entries; rolling eviction on registration.
    $items=array_slice($items,-5);
    $items[]=['id'=>bin2hex(random_bytes(8)),
      'token_hash'=>hash('sha256',$token),'rev'=>(string)($latest['security_rev']??''),
      'created'=>$now,'expires'=>$expires];
    $latest['trusted_devices']=$items;
    $ok=stored_write('auth',$latest);
  }finally{
    flock($lock,LOCK_UN);fclose($lock);
  }
  if($ok && is_string($token))aq_trust_set_cookie($token,$expires);
  return $ok;
}
function aq_trust_clear_all():bool{
  $lock=@fopen(__DIR__.'/_store/.admin-mfa.lock','c');
  if($lock===false)return false;
  if(!@flock($lock,LOCK_EX)){fclose($lock);return false;}
  try{
    $latest=stored_read('auth');
    if(!is_array($latest))return false;
    $latest['trusted_devices']=[];
    $saved=stored_write('auth',$latest);
  }finally{
    flock($lock,LOCK_UN);fclose($lock);
  }
  if($saved)aq_trust_set_cookie('',time()-3600);
  return $saved;
}
function aq_trust_active_count(?array $auth,?int $now=null):int {
  if(!is_array($auth))return 0;
  $count=0;$rev=(string)($auth['security_rev']??'');
  foreach(($auth['trusted_devices']??[]) as $d){
    if(is_array($d) && ($d['rev']??null)===$rev &&
       (int)($d['expires']??0)>($now??time()))++$count;
  }
  return $count;
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

/** Serialize recovery-code consumption and TOTP step tracking across sessions.
 * The exclusive lock is stored in the protected directory, not in the web root.
 * Used only after auth database was first initialized by the owner.
 */
function aq_mfa_lock_ready(): bool {
  // Activation must fail closed if this shared host cannot create / lock the
  // same protected file required for all future TOTP / recovery logins.
  $dir=__DIR__.'/_store';
  if(!is_dir($dir))return false;
  $handle=@fopen($dir.'/.admin-mfa.lock','c');
  if($handle===false)return false;
  try{
    if(!@flock($handle,LOCK_EX|LOCK_NB))return false;
    @flock($handle,LOCK_UN);
    return true;
  }finally{@fclose($handle);}
}
function aq_mfa_consume_login(string $password,string $factor): ?array {
  $lockPath=__DIR__.'/_store/.admin-mfa.lock';
  $handle=@fopen($lockPath,'c');
  if($handle===false)return null;
  if(!flock($handle,LOCK_EX)){fclose($handle);return null;}
  try{
    $latest=stored_read('auth');
    if(!is_array($latest)||!password_verify($password,(string)($latest['password_hash']??''))||!aq_mfa_enabled($latest))return null;
    $updated=aq_mfa_verify_and_consume($latest,$factor);
    if($updated===null||!stored_write('auth',$updated))return null;
    return $updated;
  }finally{
    flock($handle,LOCK_UN);fclose($handle);
  }
}
