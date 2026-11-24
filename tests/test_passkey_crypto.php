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
try{aq_pk_take($s,'get','r1');throw new LogicException('replay accepted');}catch(RuntimeException $e){}
$auth=['password_hash'=>'x','security_rev'=>'r1','totp_secret'=>aq_secret_create()];
$record=['rev'=>aq_auth_tag($auth),'keys'=>[$registered]];
yes(count(aq_pk_record($auth,$record)['keys'])===1);
$auth['security_rev']='r2';yes(aq_pk_record($auth,$record)['keys']===[]);
echo "PASS: real ES256 registration and assertion; wrong origin/challenge/id/handle/signature, missing UV, replay and revision denied\n";
