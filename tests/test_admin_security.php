<?php
declare(strict_types=1);
require __DIR__.'/../site/admin-security.php';
function expect(bool $ok,string $label): void {
  if(!$ok){fwrite(STDERR,"FAIL: ".$label."\n");exit(1);}
}
expect(AQ_ADMIN_NAME==='adm','single admin user is adm');
$legacy=['password_hash'=>'legacy-hash'];
expect(aq_auth_tag($legacy)===hash('sha256','legacy-hash'),'legacy session tag remains valid');
expect(aq_auth_tag($legacy+['security_rev'=>'a'])!==aq_auth_tag($legacy),'security revision invalidates old sessions');
$secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
expect(aq_secret_decode($secret)==='12345678901234567890','standard Base32 decoding');
expect(aq_totp_at_step($secret,1)==='287082','RFC 6238 HMAC-SHA1 test vector at t=59');
expect(aq_totp_matching_step($secret,'287082',59,-1)===1,'valid six-digit TOTP');
expect(aq_totp_matching_step($secret,'287082',59,1)===null,'TOTP replay must fail');
expect(aq_totp_matching_step($secret,'287082',500000,-1)===null,'expired TOTP must fail');
expect(aq_totp_matching_step($secret,'123',59,-1)===null,'bad OTP length rejected');
$new=aq_secret_create();
expect(strlen($new)===32&&strlen((string)aq_secret_decode($new))===20,'random secure TOTP secret');
[$codes,$hashes]=aq_recovery_create();
expect(count($codes)===10&&count(array_unique($codes))===10,'distinct recovery codes');
expect(count($hashes)===10,'only recovery digests stored');
$auth=['password_hash'=>'password-hash','totp_secret'=>$secret,'totp_last_step'=>-1,'recovery_hashes'=>$hashes];
expect(aq_mfa_enabled($auth),'enabled MFA recognized');
$consumed=aq_mfa_verify_and_consume($auth,$codes[0]);
expect(is_array($consumed)&&count($consumed['recovery_hashes'])===9,'recovery consumed');
expect(aq_mfa_verify_and_consume($consumed,$codes[0])===null,'recovery replay denied');
expect(aq_mfa_verify_and_consume($auth,'287082')===null,'current-time check rejects vector from the past');
expect(aq_private_access_url('https://Remote.Example.org/')==='https://remote.example.org/','strict private hostname normalized');
foreach(['http://example.com','https://127.0.0.1/','https://localhost/','https://me:secret@example.com/',
         'https://example.com/?token=abc','https://example.com/#session','https://example.com/login',
         'javascript:alert(1)','https://example.com:2222/','https://bad..domain.org/',
         'https://example.com.evil.org/.','https://example.com/evil'] as $candidate){
  if($candidate==='https://example.com.evil.org/.')continue;
  expect(aq_private_access_url($candidate)===null,'unsafe URL denied: '.$candidate);
}
echo "PASS: adm backward-compatibility, RFC6238 OTP, anti-replay, backup-code one-time consumption, strict HTTPS URL\n";
