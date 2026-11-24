<?php
declare(strict_types=1);
// Owner-only WebAuthn adapter. The pinned library performs CBOR and signature validation.
const AQ_PK_RP='avenqir.bg5.net';
const AQ_PK_ORIGIN='https://avenqir.bg5.net';
// SHA-256 of the verified Orbit Mail personal fixed signing certificate,
// also declared in the site's Digital Asset Links. Do not trust arbitrary APK hashes.
const AQ_PK_ANDROID_ORIGIN='android:apk-key-hash:bj5bCDe-lwgjj-xbIL2Az1GiqmOyRPGUYldAHzruBJE';
function aq_pk_origins():array{return [AQ_PK_ORIGIN,AQ_PK_ANDROID_ORIGIN];}
const AQ_PK_TTL=120;
const AQ_PK_MAX=6;
function aq_pk_require(bool $ok):void {if(!$ok)throw new RuntimeException('Passkey operation denied');}
function aq_pk_encode(string $raw):string{return rtrim(strtr(base64_encode($raw),'+/','-_'),'=');}
function aq_pk_decode($raw,int $max=65536):string{
  aq_pk_require(is_string($raw)&&strlen($raw)>0&&strlen($raw)<=2*$max&&preg_match('/^[A-Za-z0-9_-]+$/D',$raw)===1);
  $bin=base64_decode(strtr($raw,'-_','+/'),true);
  aq_pk_require(is_string($bin)&&strlen($bin)<=$max&&aq_pk_encode($bin)===$raw);
  return $bin;
}
function aq_pk_engine():\ReportUri\Passkeys\WebAuthn{
  require_once __DIR__.'/webauthn/src/WebAuthn.php';
  return new \ReportUri\Passkeys\WebAuthn('AVENQIR',AQ_PK_RP,true,aq_pk_origins());
}
function aq_pk_client(string $raw,string $type,string $challenge):void{
  $j=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
  aq_pk_require(is_array($j)&&($j['type']??null)===$type&&in_array($j['origin']??null,aq_pk_origins(),true)
    &&($j['crossOrigin']??false)===false&&!isset($j['topOrigin'])
    &&hash_equals($challenge,aq_pk_decode($j['challenge']??null,128)));
}
function aq_pk_record(?array $auth,?array $state):array{
  if(!is_array($auth)||!aq_mfa_enabled($auth)||!is_array($state)||!is_string($state['rev']??null)
    ||!hash_equals(aq_auth_tag($auth),$state['rev'])||!is_array($state['keys']??null))return ['keys'=>[]];
  return $state;
}
function aq_pk_challenge(array &$session,string $kind,string $rev,string $challenge):void{
  $session['pk_pending']=['kind'=>$kind,'rev'=>$rev,'challenge'=>aq_pk_encode($challenge),'expires'=>time()+AQ_PK_TTL];
}
function aq_pk_take(array &$session,string $kind,string $rev,?int $now=null):string{
  $p=$session['pk_pending']??null;unset($session['pk_pending']);
  $now=$now??time();
  aq_pk_require(is_array($p)&&($p['kind']??null)===$kind&&($p['rev']??null)===$rev
    &&is_int($p['expires']??null)&&$p['expires']>$now&&$p['expires']<=$now+AQ_PK_TTL);
  return aq_pk_decode($p['challenge']??null,128);
}
function aq_pk_registration(array $input,string $challenge):array{
  $rawId=aq_pk_decode($input['id']??null,1024);
  $client=aq_pk_decode($input['clientDataJSON']??null,4096);
  aq_pk_client($client,'webauthn.create',$challenge);
  $engine=aq_pk_engine();
  $out=$engine->processCreate($client,aq_pk_decode($input['attestationObject']??null),$challenge,true,true);
  aq_pk_require(is_string($out->credentialId)&&hash_equals($rawId,$out->credentialId)&&is_string($out->credentialPublicKey)
    &&$out->userVerified===true&&$out->userPresent===true);
  return ['id'=>aq_pk_encode($rawId),'public_key'=>$out->credentialPublicKey,'counter'=>(int)($out->signatureCounter??0),'created'=>time()];
}
function aq_pk_assertion(array $input,array $key,string $user,string $challenge):int{
  $id=aq_pk_decode($input['id']??null,1024);
  aq_pk_require(hash_equals(aq_pk_decode($key['id']??null,1024),$id));
  // Login uses an explicit allowCredentials list for the only owner. A supplied handle must match.
  if(isset($input['userHandle']))aq_pk_require(hash_equals(aq_pk_decode($user,64),aq_pk_decode($input['userHandle'],64)));
  $client=aq_pk_decode($input['clientDataJSON']??null,4096);
  aq_pk_client($client,'webauthn.get',$challenge);
  $engine=aq_pk_engine();
  aq_pk_require($engine->processGet($client,aq_pk_decode($input['authenticatorData']??null,8192),
    aq_pk_decode($input['signature']??null,4096),$key['public_key'],$challenge,(int)$key['counter'],true,true)===true);
  return (int)($engine->getSignatureCounter()??0);
}
function aq_pk_lock(callable $fn){
  $f=@fopen(__DIR__.'/_store/.passkey.lock','c');
  if($f===false)throw new RuntimeException('Passkey storage unavailable');
  if(!flock($f,LOCK_EX)){fclose($f);throw new RuntimeException('Passkey lock unavailable');}
  try{return $fn();}finally{flock($f,LOCK_UN);fclose($f);}
}
