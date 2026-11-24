<?php
declare(strict_types=1);
require __DIR__.'/feedback-core.php';
fb_headers();
if(!fb_https()) {http_response_code(403);exit('请通过 HTTPS 打开留言中心。');}
if((int)($_SERVER['CONTENT_LENGTH']??0)>16384){http_response_code(413);exit('提交内容过大。');}
fb_start_session('AVENQIR_FEEDBACK');
$csrf=fb_csrf();
if(!isset($_SESSION['form_since'])) $_SESSION['form_since']=time();
$notice='';$success=false;$can_submit=false;
try { $db=fb_db(); $can_submit=fb_submission_enabled($db); }
catch(Throwable $e) { $notice=fb_config_message($e); }
$kind_values=['feedback'=>'网站反馈','link'=>'推荐网址','broken'=>'失效链接','contact'=>'联系站长'];
$kind=fb_trim($_GET['type']??'feedback',30);
if(!array_key_exists($kind,$kind_values))$kind='feedback';
$pre_url=fb_trim($_GET['url']??'',1400);
if($pre_url!=='' && (!filter_var($pre_url,FILTER_VALIDATE_URL) || !preg_match('~^https?://~i',$pre_url)))$pre_url='';
$suggest=fb_trim($_GET['q']??'',80);
if(preg_match('/[\\x00-\\x1f]/',$suggest))$suggest='';
$prefill_subject=$suggest!==''?'申请补充收录：'.$suggest:'';
$prefill_body=$suggest!==''?'在公开网址目录中未找到「'.$suggest.'」相关资源。希望站长审核并补充优质网站。':'';
$inputs=['kind'=>$kind,'name'=>'','email'=>'','subject'=>$prefill_subject,'body'=>$prefill_body,'ref_url'=>$pre_url];
if($_SERVER['REQUEST_METHOD']==='POST') {
  foreach($inputs as $k=>$v) $inputs[$k]=fb_trim($_POST[$k]??'', $k==='body'?2000:($k==='ref_url'?1400:($k==='email'?190:120)));
  if(!isset($kind_values[$inputs['kind']])) $inputs['kind']='feedback';
  if(!$can_submit){$notice=$notice?:'留言暂未启用，站长正在配置数据库。';}
  elseif(!fb_csrf_ok()){$notice='验证已过期，请刷新后重试。';http_response_code(403);}
  elseif(trim((string)($_POST['website']??''))!==''){
    $success=true; $notice='已收到留言。'; // bot honeypot; do not store
  }
  elseif(time()-(int)($_SESSION['form_since']??time())<2){$notice='操作过快，请稍后再提交。';}
  elseif(time()-(int)($_SESSION['last_sent']??0)<25){$notice='发送太频繁，请稍后重试。';}
  elseif((string)($_POST['consent']??'')!=='yes'){$notice='请先确认隐私提示。';}
  elseif(preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $inputs['body'])){$notice='留言包含不支持的控制字符。';}
  elseif(strlen($inputs['name'])<2 || strlen($inputs['name'])>180 || trim($inputs['subject'])==='' || (function_exists('mb_strlen') ? mb_strlen($inputs['body'],'UTF-8') : preg_match_all('/./us',$inputs['body']))<10){$notice='请填写昵称、主题，以及至少 10 字的留言内容。';}
  elseif($inputs['email']!=='' && !filter_var($inputs['email'],FILTER_VALIDATE_EMAIL)){$notice='邮箱格式无效，可以留空。';}
  elseif($inputs['ref_url']!=='' && (!filter_var($inputs['ref_url'], FILTER_VALIDATE_URL)||!preg_match('~^https?://~i',$inputs['ref_url']))) {$notice='参考链接必须是完整的 http/https 地址，或者留空。';}
  elseif(preg_match_all('~https?://~i',$inputs['body'])>4){$notice='单条留言最多包含四条网页链接。';}
  else {
    try {
      $h=fb_ip_hash();
      $r=$db->prepare('SELECT COUNT(*) FROM fb_messages WHERE ip_digest=? AND created_at>=DATE_SUB(NOW(),INTERVAL 1 HOUR)');
      $r->execute([$h]);
      if((int)$r->fetchColumn()>=3){$notice='同一网络每小时最多提交三条，请稍后再试。';http_response_code(429);}
      else {
        $insert=$db->prepare("INSERT INTO fb_messages (kind,sender_name,sender_email,subject,body,ref_url,ip_digest) VALUES (?,?,?,?,?,?,?)");
        $insert->execute([$inputs['kind'],$inputs['name'],$inputs['email'],$inputs['subject'],$inputs['body'],$inputs['ref_url'],$h]);
        $_SESSION['last_sent']=time();$_SESSION['form_since']=time();
        $success=true;$notice='提交成功！这条留言只会显示在站长后台，不会公开。编号 #'.(int)$db->lastInsertId();
        $inputs=['kind'=>'feedback','name'=>'','email'=>'','subject'=>'','body'=>'','ref_url'=>''];
      }
    } catch(Throwable $e) {error_log('AVENQIR feedback insert failed');$notice='保存失败，服务器数据库暂不可用；请勿重复快速提交。';}
  }
}
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="index,follow"><meta name="description" content="向 AVENQIR 站长提交网站反馈、网址推荐或失效链接报告。无需注册，内容不公开。"><meta name="theme-color" content="#0a1827"><link rel="icon" href="icon.svg" type="image/svg+xml"><link rel="stylesheet" href="common.css?v=81"><link rel="stylesheet" href="feedback.css?v=81"><link rel="stylesheet" href="theme.css?v=15"><title>留言与网址推荐 · AVENQIR</title></head><body>
<?= fb_nav() ?>
<main class="wrap fb-page"><section class="fb-hero"><p class="eyebrow">AVENQIR / FEEDBACK</p><h1>把想说的话，<br>留在这里。</h1><p>推荐一个网站，报告失效链接，或给网站提个建议。无需注册，提交后只由站长查看。</p><div class="fb-pills"><span>✦ 无需账户</span><span>✦ 人工处理</span><span>✦ 不公开内容</span></div></section>
<div class="fb-columns"><section class="panel fb-main"><div class="sectionhead"><div><span class="label">SEND A MESSAGE</span><h2>给站长留言</h2><p>不支持上传附件。不要填写密码、验证码、身份证信息或其他敏感数据。</p></div></div>
<?php if($notice!==''):?><div class="fb-alert <?= $success?'fb-ok':'fb-error' ?>" role="status"><?= fb_e($notice) ?></div><?php endif; ?>
<?php if($can_submit):?>
<form method="post" class="fb-form" autocomplete="on"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><div class="fb-trap"><label>网站地址<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<label>留言类型<select name="kind"><?php foreach($kind_values as $value=>$label):?><option value="<?= fb_e($value) ?>"<?= $inputs['kind']===$value?' selected':'' ?>><?= fb_e($label) ?></option><?php endforeach; ?></select></label>
<div class="fb-pair"><label>昵称 <b>*</b><input name="name" maxlength="60" required minlength="2" autocomplete="nickname" placeholder="怎么称呼你？" value="<?= fb_e($inputs['name']) ?>"></label><label>联系邮箱 <small>选填，不公开</small><input type="email" name="email" maxlength="190" autocomplete="email" placeholder="想收到人工回复时填写" value="<?= fb_e($inputs['email']) ?>"></label></div>
<label>主题 <b>*</b><input name="subject" maxlength="120" required placeholder="例如：推荐一个很好用的网站" value="<?= fb_e($inputs['subject']) ?>"></label>
<label>相关网页 <small>选填</small><input type="url" name="ref_url" maxlength="1400" inputmode="url" placeholder="https://example.com/" value="<?= fb_e($inputs['ref_url']) ?>"></label>
<label>留言内容 <b>*</b><textarea name="body" maxlength="2000" minlength="10" required rows="6" placeholder="说说你发现的问题、推荐的理由，或者希望增加的功能…"><?= fb_e($inputs['body']) ?></textarea></label>
<label class="fb-consent"><input type="checkbox" name="consent" value="yes" required> 我已阅读<a href="privacy.html">隐私说明</a>，同意站长为处理反馈而保存此留言和选填邮箱。</label>
<button class="btn primary fb-submit" type="submit">发送留言 <span aria-hidden="true">↗</span></button><p class="fb-caption">反垃圾限制：每个网络出口每小时最多 3 条。无即时回复承诺；提交不代表已发送邮件。</p></form>
<?php else:?><div class="fb-alert fb-error"><strong>留言系统尚未开放。</strong><p>这不会影响其他网页和工具。请站长进入<a href="feedback-admin.php">留言管理后台</a>完成 MySQL 配置与初始化。</p></div><?php endif; ?></section>
<aside class="fb-side"><section class="fb-side-card"><div class="fb-side-icon">↗</div><h2>推荐优质网站</h2><p>无论是学习、开发、文化、生活还是趣味工具，都可以推荐。站长人工审核后才会加入公开网址目录。</p><a href="directory.html">浏览公开网址目录 →</a></section><section class="fb-side-card"><div class="fb-side-icon">◈</div><h2>关于隐私</h2><p>访客无需注册。提交内容进入私人后台，不出现在公开留言墙。填写邮箱仅用于站长可能的人工回复。</p><a href="privacy.html">查看隐私说明 →</a></section><section class="fb-side-card"><div class="fb-side-icon">☼</div><h2>查看其他功能</h2><p>网络检测、轻量工具、解压游戏和私人书签都可以继续使用。</p><a href="index.html">返回 AVENQIR 首页 →</a></section></aside></div>
</main><footer class="wrap footer"><span>© 2026 AVENQIR · Feedback</span><span><a href="privacy.html">隐私说明</a> · <a href="disclaimer.html">免责声明</a> · <a href="feedback-admin.php" rel="nofollow">站长后台</a></span></footer><script src="site.js?v=15" defer></script><script src="theme.js?v=15" defer></script><script src="feedback-pref.js?v=15" defer></script></body></html>
