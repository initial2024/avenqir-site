<?php
declare(strict_types=1);
require __DIR__.'/server-core.php';
require __DIR__.'/admin-security.php';
require __DIR__.'/passkey-core.php';
if(((($_SERVER['HTTPS']??'')!=='on'&&($_SERVER['HTTPS']??'')!=='1')&&(string)($_SERVER['SERVER_PORT']??'')!=='443')
 ||strtolower((string)($_SERVER['HTTP_HOST']??''))!==AQ_PK_RP){http_response_code(403);exit('HTTPS required');}
ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
session_name('AVENQIR_ADMIN');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
header('Permissions-Policy: publickey-credentials-get=(self), publickey-credentials-create=(self)');
if(!isset($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(24));
$auth=stored_read('auth');$logged=aq_shared_adm_logged($auth,$_SESSION);
$state=aq_pk_record($auth,stored_read('passkeys'));
$ready=aq_mfa_enabled($auth??[])&&function_exists('openssl_verify')&&function_exists('mb_strlen')&&is_file(__DIR__.'/webauthn/src/WebAuthn.php');
function pk_json(array $data,int $code=200):never{
  http_response_code($code);header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
}
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
  try{
    aq_pk_require($ready&&($_SERVER['HTTP_ORIGIN']??'')===AQ_PK_ORIGIN
      &&hash_equals($_SESSION['csrf'],(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''))
      &&strtolower(trim(explode(';',(string)($_SERVER['CONTENT_TYPE']??''))[0]))==='application/json');
    $raw=file_get_contents('php://input',false,null,0,150001);
    aq_pk_require(is_string($raw)&&strlen($raw)<=150000);
    $in=json_decode($raw,true,16,JSON_THROW_ON_ERROR);aq_pk_require(is_array($in));
    $action=$in['action']??'';
    $rev=aq_auth_tag($auth);
    $now=time();
    if((int)($_SESSION['pk_window']??0)<$now-300){$_SESSION['pk_window']=$now;$_SESSION['pk_attempts']=0;}
    $_SESSION['pk_attempts']=(int)($_SESSION['pk_attempts']??0)+1;
    aq_pk_require($_SESSION['pk_attempts']<=20 && (int)($_SESSION['lock_until']??0)<=$now);
    if($action==='register_begin'||$action==='revoke'){
      aq_pk_require($logged);
      $pwd=$in['password']??null;$otp=$in['otp']??null;
      aq_pk_require(is_string($pwd)&&strlen($pwd)<=128&&is_string($otp)&&preg_match('/^[0-9]{6}$/D',$otp)===1);
      $verified=aq_mfa_consume_login($pwd,$otp);
      if(!is_array($verified)){
        $_SESSION['fails']=(int)($_SESSION['fails']??0)+1;
        if($_SESSION['fails']>=5)$_SESSION['lock_until']=time()+300;
        throw new RuntimeException('Reauthentication failed');
      }
      aq_pk_require(hash_equals($rev,aq_auth_tag($verified)));
      $_SESSION['fails']=0;$_SESSION['lock_until']=0;
      if($action==='revoke'){
        aq_pk_lock(function()use($rev){
          $latest=stored_read('auth');aq_pk_require(is_array($latest)&&hash_equals($rev,aq_auth_tag($latest)));
          aq_pk_require(stored_write('passkeys',['rev'=>$rev,'user'=>aq_pk_encode(random_bytes(32)),'keys'=>[]]));
        });
        unset($_SESSION['pk_pending']);pk_json(['ok'=>true]);
      }
      $options=aq_pk_lock(function()use($rev){
        $latest=stored_read('auth');aq_pk_require(is_array($latest)&&hash_equals($rev,aq_auth_tag($latest)));
        $s=aq_pk_record($latest,stored_read('passkeys'));
        aq_pk_require(count($s['keys'])<AQ_PK_MAX);
        if(!isset($s['user'])){
          $s=['rev'=>$rev,'user'=>aq_pk_encode(random_bytes(32)),'keys'=>[]];
          aq_pk_require(stored_write('passkeys',$s));
        }
        $engine=aq_pk_engine();$ids=array_map(fn($k)=>aq_pk_decode($k['id'],1024),$s['keys']);
        $args=$engine->getCreateArgs(aq_pk_decode($s['user'],64),'adm','AVENQIR adm',AQ_PK_TTL,true,true,null,array_values($ids));
        aq_pk_challenge($_SESSION,'create',$rev,$engine->getChallenge()->getBinaryString());
        $_SESSION['pk_pending']['user']=$s['user'];
        return $args;
      });
      pk_json(['ok'=>true,'options'=>$options]);
    }
    if($action==='register_finish'){
      $pending=$_SESSION['pk_pending']??[];
      $challenge=aq_pk_take($_SESSION,'create',$rev);aq_pk_require($logged);
      $key=aq_pk_registration($in,$challenge);
      aq_pk_lock(function()use($rev,$key,$pending){
        $latest=stored_read('auth');aq_pk_require(is_array($latest)&&hash_equals($rev,aq_auth_tag($latest)));
        $s=aq_pk_record($latest,stored_read('passkeys'));
        aq_pk_require(isset($s['user'])&&hash_equals($s['user'],(string)($pending['user']??''))&&count($s['keys'])<AQ_PK_MAX&&!isset($s['keys'][$key['id']]));
        $s['keys'][$key['id']]=$key;aq_pk_require(stored_write('passkeys',$s));
      });
      pk_json(['ok'=>true]);
    }
    if($action==='login_begin'){
      aq_pk_require(!$logged&&count($state['keys'])>0);
      $engine=aq_pk_engine();$ids=array_values(array_map(fn($k)=>aq_pk_decode($k['id'],1024),$state['keys']));
      $args=$engine->getGetArgs($ids,AQ_PK_TTL,true,true,true,true,true,true);
      aq_pk_challenge($_SESSION,'get',$rev,$engine->getChallenge()->getBinaryString());
      $_SESSION['pk_pending']['user']=$state['user'];
      pk_json(['ok'=>true,'options'=>$args]);
    }
    if($action==='login_finish'){
      $pending=$_SESSION['pk_pending']??[];
      $challenge=aq_pk_take($_SESSION,'get',$rev);aq_pk_require(!$logged);
      aq_pk_lock(function()use($rev,$in,$challenge,$pending){
        $latest=stored_read('auth');aq_pk_require(is_array($latest)&&hash_equals($rev,aq_auth_tag($latest)));
        $s=aq_pk_record($latest,stored_read('passkeys'));
        $id=aq_pk_encode(aq_pk_decode($in['id']??null,1024));
        aq_pk_require(isset($s['keys'][$id],$s['user'])&&hash_equals($s['user'],(string)($pending['user']??'')));
        $s['keys'][$id]['counter']=aq_pk_assertion($in,$s['keys'][$id],$s['user'],$challenge);
        aq_pk_require(stored_write('passkeys',$s));
      });
      $latest=stored_read('auth');aq_pk_require(is_array($latest)&&hash_equals($rev,aq_auth_tag($latest)));
      session_regenerate_id(true);$_SESSION['logged']=true;$_SESSION['auth_tag']=$rev;$_SESSION['until']=time()+1800;
      $_SESSION['csrf']=bin2hex(random_bytes(24));$_SESSION['fails']=0;$_SESSION['lock_until']=0;
      $target=($_SESSION['admin_after_login']??'')==='feedback-admin.php'?'feedback-admin.php':'admin.php';
      unset($_SESSION['admin_after_login']);pk_json(['ok'=>true,'next'=>$target]);
    }
    throw new RuntimeException('Invalid action');
  }catch(Throwable $e){unset($_SESSION['pk_pending']);pk_json(['ok'=>false,'message'=>'操作未通过验证或已过期。请重新尝试，或返回密码＋2FA 登录。'],403);}
}
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){http_response_code(405);exit;}
if($logged)$_SESSION['until']=time()+1800;
?>
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AVENQIR · 通行密钥</title><link rel="stylesheet" href="common.css"><script src="passkey.js" defer></script></head>
<body><main class="wrap"><section class="hero"><h1>管理员通行密钥 · Passkey</h1><p>仅限 adm。使用系统指纹、人脸或设备 PIN 验证；网站只保存公钥，不接触生物识别数据。</p><a class="btn ghost" href="admin.php">返回密码登录 / 目录管理</a></section>
<section class="panel stack" id="pk-panel" data-csrf="<?= htmlspecialchars($_SESSION['csrf'],ENT_QUOTES,'UTF-8') ?>">
<?php if(!$ready):?><p>需要先启用 TOTP 双重验证，并且主机支持 WebAuthn 验签。密码登录保持可用。</p>
<?php elseif($logged):?><h2>已登记通行密钥：<?= count($state['keys']) ?> / <?= AQ_PK_MAX ?></h2>
<p>每次新增或撤销均需重新验证密码及当前 6 位动态码。修改密码或重置 2FA 后，旧通行密钥自动失效。</p>
<form id="pk-manage" class="stack" method="post" action="passkey.php"><label>管理员密码<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label>
<label>当前 TOTP 动态码<input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
<button type="button" class="btn primary" id="pk-register" disabled>登记系统通行密钥</button>
<button type="button" class="btn ghost" id="pk-revoke" disabled>撤销全部通行密钥</button></form>
<p>撤销不会删除手机密码管理器里的记录；可在系统中手动清理。现有登录会话仍遵循原有 30 分钟空闲过期规则。</p>
<?php else:?><h2>使用通行密钥登录</h2><button type="button" class="btn primary" id="pk-login" disabled>使用系统通行密钥</button><p>必须先在已登录的管理后台登记通行密钥。如果设备不支持或密钥遗失，请使用原密码与 2FA。</p><?php endif;?>
<p role="status" id="pk-status">正在检测浏览器支持情况…</p></section></main></body></html>
