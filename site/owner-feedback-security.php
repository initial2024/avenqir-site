<?php
declare(strict_types=1);
// Check access using the same owner session as admin.php before loading
// optional feedback components. Do not expose stack traces or secret values.
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
require_once __DIR__.'/server-core.php';
require_once __DIR__.'/admin-security.php';
require_once __DIR__.'/feedback-core.php';
if(!fb_https()) {http_response_code(403);exit('请通过 HTTPS 访问管理员测试中心。');}
fb_start_session('AVENQIR_ADMIN');
if(!aq_shared_adm_logged(stored_read('auth'),$_SESSION)){header('Location: admin.php',true,303);exit('请先登录 AVENQIR 管理后台。');}
$_SESSION['until']=time()+1800;
try {
 require_once __DIR__.'/feedback-abuse.php';
 require_once __DIR__.'/feedback-turnstile.php';
} catch(Throwable $e) {
 http_response_code(503);error_log('AVENQIR owner feedback protection dependency unavailable');
 exit('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>防滥用测试暂不可用</title><p>验证模块暂不可用，请稍后刷新。</p><a href="admin.php">返回管理后台</a></html>');
}
if((int)($_SERVER['CONTENT_LENGTH']??0)>8192){http_response_code(413);exit;}
$csrf=fb_csrf();$notice='';
try{$cfg=fb_ts_config();}catch(Throwable $e){$cfg=['mode'=>'unavailable'];$notice='第三方验证配置暂不可读；本机测试仍可使用。';}
$testSession=$_SESSION['fb_security_test']??[];
if(!is_array($testSession))$testSession=[];
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
 if(!fb_csrf_ok()){http_response_code(403);exit;}
 $action=$_POST['action']??'';
 if($action==='local_test'){
  $notice=fb_abuse_consume($testSession,$_POST,time())?'PASS：本机算术挑战通过（仅测试，无留言入库）。':'DENY：答案错误、过期或已使用。';
 }elseif($action==='selftest'){
  // Entirely in memory; never consumes the production quota or writes a message.
  $s=[];$pass=true;for($i=0;$i<8;$i++){[$r,$s]=fb_abuse_step($s,1,'simulation');$pass=$pass&&$r['code']===200&&$r['challenge']===($i>=2);}
  [$r,$s]=fb_abuse_step($s,1,'simulation');$pass=$pass&&$r['code']===429;
  $sim=[];$c=fb_abuse_issue($sim,100);$post=['human_id'=>$c['id'],'human_answer'=>$sim['fb_human']['answer']];
  $pass=$pass&&fb_abuse_consume($sim,$post,101)&&!fb_abuse_consume($sim,$post,102);
  $c=fb_abuse_issue($sim,100);$post=['human_id'=>$c['id'],'human_answer'=>$sim['fb_human']['answer']];$pass=$pass&&!fb_abuse_consume($sim,$post,401);
  $notice=$pass?'PASS：模拟限流、风险触发、一次性验证及过期拒绝。':'FAIL：保护逻辑自检失败。';
 }elseif($action==='configure'){
  $site=trim(is_string($_POST['sitekey']??null)?$_POST['sitekey']:'');$secret=trim(is_string($_POST['secret']??null)?$_POST['secret']:'');
  if(!fb_ts_keys_valid($site,$secret))$notice='拒绝：请输入正式生产密钥，不接受测试密钥。';
  elseif(!function_exists('curl_init'))$notice='无法启用：服务器缺少 PHP cURL。';
  else{
   // Stage privately. The real widget must pass before the config can affect visitors.
   $_SESSION['fb_ts_pending']=['mode'=>'turnstile','sitekey'=>$site,'secret'=>$secret,'expires'=>time()+600];
   $notice='待验证：请完成下方真实 Turnstile 测试，成功后才启用。';
  }
 }elseif($action==='activate'){
  $pending=$_SESSION['fb_ts_pending']??null;
  if(!is_array($pending)||($pending['expires']??0)<=time()){$notice='暂存配置已过期，请重新填写。';unset($_SESSION['fb_ts_pending']);}
  elseif(fb_ts_verify($pending,$_POST['cf-turnstile-response']??null,'feedback_test')){
   $notice=stored_write('feedback_turnstile',['enabled'=>true,'sitekey'=>$pending['sitekey'],'secret'=>$pending['secret']])?'PASS：真实凭证通过，正式风险触发模式已启用。':'验证通过，但保存失败；旧配置不变。';
   unset($_SESSION['fb_ts_pending']);$cfg=fb_ts_config();
  }else $notice='DENY：真实验证失败，未启用新配置。';
 }elseif($action==='live_test'){
  $notice=fb_ts_verify($cfg,$_POST['cf-turnstile-response']??null,'feedback_test')?'PASS：正式 Turnstile 服务端验证通过（无留言入库）。':'DENY：正式凭证验证失败。';
 }elseif($action==='disable'){
  $notice=stored_write('feedback_turnstile',['enabled'=>false])?'已切换为本机风险挑战。':'保存失败，旧配置不变。';unset($_SESSION['fb_ts_pending']);$cfg=fb_ts_config();
 }
}
$human=fb_abuse_issue($testSession,time());$_SESSION['fb_security_test']=$testSession;
$pending=$_SESSION['fb_ts_pending']??null;
if(is_array($pending)&&($pending['expires']??0)<=time()){unset($_SESSION['fb_ts_pending']);$pending=null;}
$widget=is_array($pending)?$pending:($cfg['mode']==='turnstile'?$cfg:null);
if($widget!==null)fb_ts_headers();
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>防滥用测试 · AVENQIR</title><link rel="stylesheet" href="common.css?v=103"><link rel="stylesheet" href="theme.css"></head><body><main class="wrap owner-security-page"><h1>防滥用测试与配置</h1><p>AVENQIR · v104 · 管理员测试中心</p><a class="btn ghost" href="admin.php">返回管理后台</a><p>只限管理员。测试不会发送真实留言、消耗正式提交额度或修改正式限流计数。</p><p role="status"><?=fb_e($notice)?></p><section class="panel"><h2>本机挑战</h2><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=fb_e($csrf)?>"><input type="hidden" name="human_id" value="<?=fb_e($human['id'])?>"><label><?=fb_e($human['question'])?><input name="human_answer" inputmode="numeric" autocomplete="off" maxlength="3" required></label><button name="action" value="local_test" class="btn primary">验证答案</button></form><form method="post"><input type="hidden" name="csrf" value="<?=fb_e($csrf)?>"><button name="action" value="selftest" class="btn ghost">运行限流、过期与重放自检</button></form></section>
<section class="panel"><h2>Cloudflare Turnstile</h2><p>当前模式：<?=fb_e($cfg['mode']==='turnstile'?'已启用（高风险反馈）':($cfg['mode']==='local'?'本机算术挑战':'配置不可用'))?>。普通访问不加载第三方验证脚本。正式密钥不会出现在页面或 GitHub。</p><details><summary>配置正式密钥</summary><p>在 <a href="https://dash.cloudflare.com/" rel="noopener noreferrer" target="_blank">Cloudflare 控制台</a> 创建 Managed 小组件，允许的主机名仅填写 avenqir.bg5.net。输入 Site Key 和 Secret Key 后，必须通过真实验证才启用。</p><form method="post" class="stack" autocomplete="off"><input type="hidden" name="csrf" value="<?=fb_e($csrf)?>"><label>Site Key<input name="sitekey" required maxlength="128" autocomplete="off"></label><label>Secret Key<input name="secret" type="password" required maxlength="128" autocomplete="new-password"></label><button name="action" value="configure" class="btn primary">暂存并测试配置</button></form></details>
<?php if($widget!==null):?><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=fb_e($csrf)?>"><div class="cf-turnstile" data-sitekey="<?=fb_e($widget['sitekey'])?>" data-action="feedback_test" data-size="flexible" data-theme="auto"></div><button name="action" value="<?=is_array($pending)?'activate':'live_test'?>" class="btn primary"><?=is_array($pending)?'验证并启用':'测试正式凭证'?></button></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><?php endif;?>
<?php if($cfg['mode']!=='local'):?><form method="post"><input type="hidden" name="csrf" value="<?=fb_e($csrf)?>"><button name="action" value="disable" class="btn ghost">停用第三方验证，恢复本机挑战</button></form><?php endif;?></section></main><script src="theme.js?v=15" defer></script></body></html>
