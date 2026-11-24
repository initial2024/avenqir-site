<?php
declare(strict_types=1);
require __DIR__.'/../site/admin-security.php';
require __DIR__.'/../site/passkey-core.php';
function yes(bool $v):void{if(!$v)throw new RuntimeException('test assertion failed');}
function denied(callable $f):void{try{$f();}catch(Throwable $e){return;}throw new RuntimeException('negative verification unexpectedly passed');}
// Generate a real P-256 key and synthetic authenticator messages, never a live owner key.
$priv=openssl_pkey_new(['private_key_type'=>OPENSSL_KEYTYPE_EC,'curve_name'=>'prime256v1']);
yes($priv!==false);$details=openssl_pkey_get_details($priv);$pub=$details['key'];
$id=random_bytes(32);$user=aq_pk_encode(random_bytes(32));$challenge=random_bytes(32);
$client=function(string $kind,string $origin=AQ_PK_ORIGIN)use($challenge):string{return json_encode(['type'=>$kind,'origin'=>$origin,'challenge'=>aq_pk_encode($challenge),'crossOrigin'=>false],JSON_THROW_ON_ERROR);};
$cdata=$client('webauthn.get');
$authData=hash('sha256',AQ_PK_RP,true).chr(5).pack('N',1);
openssl_sign($authData.hash('sha256',$cdata,true),$signature,$priv,OPENSSL_ALGO_SHA256);
$key=['id'=>aq_pk_encode($id),'public_key'=>$pub,'counter'=>0];
$in=['id'=>aq_pk_encode($id),'clientDataJSON'=>aq_pk_encode($cdata),'authenticatorData'=>aq_pk_encode($authData),'signature'=>aq_pk_encode($signature),'userHandle'=>$user];
yes(aq_pk_assertion($in,$key,$user,$challenge)===1);
denied(fn()=>aq_pk_assertion($in,$key,$user,random_bytes(32)));
denied(fn()=>aq_pk_assertion(array_replace($in,['id'=>aq_pk_encode(random_bytes(32))]),$key,$user,$challenge));
denied(fn()=>aq_pk_assertion(array_replace($in,['userHandle'=>aq_pk_encode(random_bytes(32))]),$key,$user,$challenge));
denied(fn()=>aq_pk_assertion(array_replace($in,['signature'=>aq_pk_encode(random_bytes(64))]),$key,$user,$challenge));
denied(fn()=>aq_pk_assertion($in,array_replace($key,['counter'=>1]),$user,$challenge));
denied(fn()=>aq_pk_client($client('webauthn.get','https://evil.avenqir.bg5.net'),'webauthn.get',$challenge));
$noUV=hash('sha256',AQ_PK_RP,true).chr(1).pack('N',2);
openssl_sign($noUV.hash('sha256',$cdata,true),$noUVsig,$priv,OPENSSL_ALGO_SHA256);
denied(fn()=>aq_pk_assertion(array_replace($in,['authenticatorData'=>aq_pk_encode($noUV),'signature'=>aq_pk_encode($noUVsig)]),$key,$user,$challenge));
// fmt:none CBOR attestation with a valid P-256 COSE key, UV and UP set.
function bs(string $s):string{$n=strlen($s);return ($n<24?chr(0x40+$n):($n<256?"\x58".chr($n):"\x59".pack('n',$n))).$s;}
function ts(string $s):string{return chr(0x60+strlen($s)).$s;}
$cose="\xa5\x01\x02\x03\x26\x20\x01\x21".bs($details['ec']['x'])."\x22".bs($details['ec']['y']);
$ad=hash('sha256',AQ_PK_RP,true).chr(0x45).pack('N',0).str_repeat("\0",16).pack('n',strlen($id)).$id.$cose;
$att="\xa3".ts('fmt').ts('none').ts('attStmt')."\xa0".ts('authData').bs($ad);
$create=['id'=>aq_pk_encode($id),'clientDataJSON'=>aq_pk_encode($client('webauthn.create')),'attestationObject'=>aq_pk_encode($att)];
$registered=aq_pk_registration($create,$challenge);
yes($registered['id']===$key['id']);yes(aq_pk_assertion($in,$registered,$user,$challenge)===1);
denied(fn()=>aq_pk_registration(array_replace($create,['id'=>aq_pk_encode(random_bytes(32))]),$challenge));
$s=[];aq_pk_challenge($s,'get','r1',$challenge);yes(aq_pk_take($s,'get','r1')===$challenge);
denied(fn()=>aq_pk_take($s,'get','r1'));
aq_pk_challenge($s,'get','r1',$challenge);denied(fn()=>aq_pk_take($s,'get','r2'));
aq_pk_challenge($s,'get','r1',$challenge);$s['pk_pending']['expires']=time()-1;denied(fn()=>aq_pk_take($s,'get','r1'));
$auth=['password_hash'=>'x','security_rev'=>'r1','totp_secret'=>aq_secret_create()];
$record=['rev'=>aq_auth_tag($auth),'keys'=>[$registered]];
yes(count(aq_pk_record($auth,$record)['keys'])===1);
$auth['security_rev']='r2';yes(aq_pk_record($auth,$record)['keys']===[]);
echo "PASS: real ES256 registration and assertion; wrong origin/challenge/id/handle/signature, missing UV, replay and revision denied\n";

$engine=aq_pk_engine();$opts=$engine->getCreateArgs(random_bytes(32),'adm','AVENQIR adm',120,true,true);
$wire=json_decode(json_encode($opts,JSON_THROW_ON_ERROR),true,16,JSON_THROW_ON_ERROR)['publicKey'];
yes($wire['rp']['id']===AQ_PK_RP);yes($wire['authenticatorSelection']['userVerification']==='required');yes($wire['authenticatorSelection']['residentKey']==='required');yes(strlen(aq_pk_decode($wire['challenge'],128))===32);yes(strlen(aq_pk_decode($wire['user']['id'],64))===32);
echo "PASS: create options JSON wire format and UV policy\n";


// Android Credential Manager origin is the base64url SHA-256 APK certificate digest.
// Test the actual signed Android clientData, not a rewritten HTTPS origin.
$cert='6e3e5b0837be9708238fec5b20bd80cf51a2aa63b244f1946257401f3aee0491';
yes(AQ_PK_ANDROID_ORIGIN==='android:apk-key-hash:'.aq_pk_encode(hex2bin($cert)));
$dal=json_decode(file_get_contents(__DIR__.'/../site/.well-known/assetlinks.json'),true,16,JSON_THROW_ON_ERROR);
$matched=false;
foreach($dal as $entry){
  if(($entry['target']['package_name']??null)!=='de.kango99w.orbitadmin')continue;
  foreach(($entry['target']['sha256_cert_fingerprints']??[]) as $fingerprint){
    if(strtolower(str_replace(':','',$fingerprint))===$cert && in_array('delegate_permission/common.get_login_creds',$entry['relation']??[],true))$matched=true;
  }
}
yes($matched);
$androidCreate=array_replace($create,['clientDataJSON'=>aq_pk_encode($client('webauthn.create',AQ_PK_ANDROID_ORIGIN))]);
$androidRegistered=aq_pk_registration($androidCreate,$challenge);
yes($androidRegistered['id']===$registered['id']);
$androidClient=$client('webauthn.get',AQ_PK_ANDROID_ORIGIN);
yes(openssl_sign($authData.hash('sha256',$androidClient,true),$androidSig,$priv,OPENSSL_ALGO_SHA256));
$androidIn=array_replace($in,['clientDataJSON'=>aq_pk_encode($androidClient),'signature'=>aq_pk_encode($androidSig)]);
yes(aq_pk_assertion($androidIn,$androidRegistered,$user,$challenge)===1);
// Different signing certificate must fail even with an otherwise valid assertion.
$foreignOrigin='android:apk-key-hash:'.aq_pk_encode(str_repeat('x',32));
$foreignClient=$client('webauthn.get',$foreignOrigin);
yes(openssl_sign($authData.hash('sha256',$foreignClient,true),$foreignSig,$priv,OPENSSL_ALGO_SHA256));
denied(fn()=>aq_pk_assertion(array_replace($in,['clientDataJSON'=>aq_pk_encode($foreignClient),'signature'=>aq_pk_encode($foreignSig)]),$registered,$user,$challenge));
denied(fn()=>aq_pk_registration(array_replace($create,['clientDataJSON'=>aq_pk_encode($client('webauthn.create',$foreignOrigin))]),$challenge));
// A valid signature for the Android origin cannot authenticate a modified HTTPS clientData.
denied(fn()=>aq_pk_assertion(array_replace($androidIn,['clientDataJSON'=>aq_pk_encode($cdata)]),$registered,$user,$challenge));
echo "PASS: exact fixed Android certificate origin registration/assertion, foreign certificate and modified signed origin denied\n";
