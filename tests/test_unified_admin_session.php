<?php
declare(strict_types=1);
require __DIR__.'/../site/admin-security.php';
function expect_shared(bool $ok,string $label):void{if(!$ok){fwrite(STDERR,"FAIL: $label\n");exit(1);}}
$auth=['password_hash'=>'somehash','security_rev'=>'revision','username'=>'adm'];
$session=['logged'=>true,'until'=>2000,'auth_tag'=>aq_auth_tag($auth)];
expect_shared(aq_shared_adm_logged($auth,$session,1000),'valid session grants both backends');
expect_shared(!aq_shared_adm_logged(null,$session,1000),'missing auth denies');
expect_shared(!aq_shared_adm_logged($auth,$session,2000),'expiry denies');
expect_shared(!aq_shared_adm_logged($auth,$session,2100),'past expiry denies');
expect_shared(!aq_shared_adm_logged($auth,array_merge($session,['logged'=>false]),1000),'logout denies');
expect_shared(!aq_shared_adm_logged($auth,array_merge($session,['auth_tag'=>'bad']),1000),'forged tag denies');
$rotated=$auth;$rotated['security_rev']='changed';
expect_shared(!aq_shared_adm_logged($rotated,$session,1000),'password/MFA change invalidates');
expect_shared(!aq_shared_adm_logged($auth,['logged'=>true,'until'=>2000],1000),'missing tag denies');
echo "PASS: shared adm auth, expiry, logout and security revision invalidation\n";
