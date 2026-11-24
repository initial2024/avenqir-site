<?php
declare(strict_types=1);
require __DIR__.'/../site/admin-security.php';
function check_trusted(bool $ok,string $label):void{
 if(!$ok){fwrite(STDERR,"FAIL: $label\n");exit(1);}
}
$secret=aq_secret_create();
$auth=['username'=>'adm','password_hash'=>'x','security_rev'=>'r1','totp_secret'=>$secret];
$token=rtrim(strtr(base64_encode(str_repeat('a',32)),'+/','-_'),'=');
$entry=['token_hash'=>hash('sha256',$token),'rev'=>'r1','created'=>100,'expires'=>150];
$auth['trusted_devices']=[$entry];
$cookie=[AQ_TRUST_COOKIE=>$token];
check_trusted(aq_trust_allowed($auth,$cookie,120),'valid trusted token');
check_trusted(!aq_trust_allowed($auth,[],120),'missing token');
check_trusted(!aq_trust_allowed($auth,$cookie,151),'expired token');
check_trusted(!aq_trust_allowed($auth,[AQ_TRUST_COOKIE=>$token.'x'],120),'malformed token');
check_trusted(!aq_trust_allowed($auth,[AQ_TRUST_COOKIE=>rtrim(strtr(base64_encode(str_repeat('b',32)),'+/','-_'),'=')],120),'wrong token');
$rotated=$auth;$rotated['security_rev']='r2';
check_trusted(!aq_trust_allowed($rotated,$cookie,120),'security revision invalidates token');
$no2fa=$auth;unset($no2fa['totp_secret']);
check_trusted(!aq_trust_allowed($no2fa,$cookie,120),'no 2FA enabled');
check_trusted(aq_trust_active_count($auth,120)===1,'count valid');
check_trusted(aq_trust_active_count($auth,151)===0,'expire count');
echo "PASS: trusted device SHA256 token, expiry, revision, MFA requirements\n";
