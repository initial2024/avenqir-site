<?php
declare(strict_types=1);
require __DIR__.'/feedback-core.php';
require __DIR__.'/server-core.php';
require __DIR__.'/feedback-abuse.php';
require __DIR__.'/feedback-turnstile.php';
fb_headers();
if(!fb_https()) {http_response_code(403);exit('请通过 HTTPS 打开留言中心。');}
if((int)($_SERVER['CONTENT_LENGTH']??0)>16384){http_response_code(413);exit('提交内容过大。');}
fb_start_session('AVENQIR_FEEDBACK');
$csrf=fb_csrf();
if(!isset($_SESSION['form_since'])) $_SESSION['form_since']=time();
$notice='';$success=false;$can_submit=false;$db=null;$riskRequired=fb_abuse_required($_SESSION,time());
$quota=200;$ts=fb_ts_config();
if(($_SERVER['REQUEST_METHOD']??'')==='POST'){
  $quota=fb_abuse_budget();
  if($quota['code']!==200){http_response_code($quota['code']);header('Retry-After: 60');$notice='请求过于频繁或保护服务暂不可用，请稍后重试。';}
  if($quota['challenge']){$riskRequired=true;$_SESSION['fb_risk_until']=time()+600;}
}
try { if($quota===200||$quota['code']===200){$db=fb_db(); $can_submit=fb_submission_enabled($db);} }
catch(Throwable $e) { $notice=fb_config_message($e); }
$kind_values=fb_kind_names();
$kind=fb_trim($_GET['type']??'feedback',30);
if(!array_key_exists($kind,$kind_values))$kind='feedback';
$pre_url=fb_trim($_GET['url']??'',1400);
if($pre_url!=='' && (!filter_var($pre_url,FILTER_VALIDATE_URL) || !preg_match('~^https?://~i',$pre_url)))$pre_url='';
$suggest=fb_trim($_GET['q']??'',80);
if(preg_match('/[\\x00-\\x1f]/',$suggest))$suggest='';
$prefill_subject=$suggest!==''?'申请补充收录：'.$suggest:'';
$prefill_body=$suggest!==''?'在公开网址目录中未找到「'.$suggest.'」相关资源。希望管理员审核并补充优质网站。':'';
$inputs=['kind'=>$kind,'name'=>'','email'=>'','subject'=>$prefill_subject,'body'=>$prefill_body,'ref_url'=>$pre_url];
$visibility='private';
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
  foreach($inputs as $k=>$v) $inputs[$k]=fb_trim($_POST[$k]??'', $k==='body'?2000:($k==='ref_url'?1400:($k==='email'?190:120)));
  $requestedVisibility=$_POST['visibility']??'private';
  if($requestedVisibility==='public')$visibility='public';
  if(!isset($kind_values[$inputs['kind']])) $inputs['kind']='feedback';
  if($quota!==200&&$quota['code']!==200){/* quota response already set; no DB write */}
  elseif(!$can_submit){$notice=$notice?:'留言暂不可用，请联系管理员。';}
  elseif(!fb_csrf_ok()){$notice='验证已过期，请刷新后重试。';http_response_code(403);}
  elseif(trim((string)($_POST['website']??''))!==''){
    $success=true; $notice='已收到留言。'; // bot honeypot; do not store
  }
  elseif(time()-(int)($_SESSION['form_since']??time())<2){$notice='操作过快，请稍后再提交。';}
  elseif(time()-(int)($_SESSION['last_sent']??0)<25){$notice='发送太频繁，请稍后重试。';}
  elseif($riskRequired&&!(($ts['mode']==='turnstile')?fb_ts_verify($ts,$_POST['cf-turnstile-response']??null,'feedback'):($ts['mode']==='local'&&fb_abuse_consume($_SESSION,$_POST,time())))){$notice=$ts['mode']==='local'?'请完成下方一次性人机确认后重试。':'第三方人机验证未通过或暂不可用，请刷新重试或使用系统浏览器。';http_response_code(400);}
  elseif((string)($_POST['consent']??'')!=='yes'){$notice='请先确认隐私提示。';}
  elseif(!in_array($requestedVisibility,['private','public'],true)){$notice='请选择留言的可见范围。';http_response_code(400);}
  elseif(preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $inputs['body'])){$notice='留言包含不支持的控制字符。';}
  elseif(strlen($inputs['name'])<2 || strlen($inputs['name'])>180 || trim($inputs['subject'])==='' || (function_exists('mb_strlen') ? mb_strlen($inputs['body'],'UTF-8') : preg_match_all('/./us',$inputs['body']))<10){$notice='请填写昵称、主题，以及至少 10 字的留言内容。';}
  elseif($inputs['email']!=='' && !filter_var($inputs['email'],FILTER_VALIDATE_EMAIL)){$notice='邮箱格式无效，可以留空。';}
  elseif($inputs['ref_url']!=='' && (!filter_var($inputs['ref_url'], FILTER_VALIDATE_URL)||!preg_match('~^https?://~i',$inputs['ref_url']))) {$notice='参考链接必须是完整的 http/https 地址，或者留空。';}
  elseif(preg_match_all('~https?://~i',$inputs['body'])>4){$notice='单条留言最多包含四条网页链接。';}
  elseif($visibility==='public' && preg_match('~[^\s@]+@[^\s@]+\.[^\s@]+~u',$inputs['name']."\n".$inputs['subject']."\n".$inputs['body'])){$notice='请移除公开文字中的邮箱地址。联系邮箱可填在专用输入框。';}
  else {
    try {
      $h=fb_ip_hash();
      $r=$db->prepare('SELECT COUNT(*) FROM fb_messages WHERE ip_digest=? AND created_at>=DATE_SUB(NOW(),INTERVAL 1 HOUR)');
      $r->execute([$h]);
      if((int)$r->fetchColumn()>=3){$notice='同一网络每小时最多提交三条，请稍后再试。';http_response_code(429);}
      else {
        $dup=$db->prepare('SELECT id FROM fb_messages WHERE ip_digest=? AND kind=? AND subject=? AND body=? AND ref_url=? AND created_at>=DATE_SUB(NOW(),INTERVAL 1 DAY) LIMIT 1');
        $dup->execute([$h,$inputs['kind'],$inputs['subject'],$inputs['body'],$inputs['ref_url']]);
        if($dup->fetchColumn()!==false){$notice='相同内容已提交，无需重复发送。';http_response_code(409);}
        else {
        $id=fb_save_message($db,$inputs,$h,$visibility==='public');
        $_SESSION['last_sent']=time();$_SESSION['form_since']=time();
        $_SESSION['fb_submission_notice']=($visibility==='public'
            ? '提交成功。公开留言将在管理员审核通过后展示。'
            : '提交成功。留言仅管理员可见。').' 编号 #'.$id;
        header('Location: feedback.php#write',true,303);exit;
        }
      }
    } catch(Throwable $e) {error_log('AVENQIR feedback insert failed');$notice='保存失败，服务器数据库暂不可用；请勿重复快速提交。';}
  }
}
if(isset($_SESSION['fb_submission_notice'])){
    $success=true;
    $notice=(string)$_SESSION['fb_submission_notice'];
    unset($_SESSION['fb_submission_notice']);
}
$wallKind=fb_trim($_GET['category']??'',30);
if(!isset($kind_values[$wallKind]))$wallKind='';
$wallBefore=filter_var($_GET['before']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]])?:0;
$wallMessages=[];$wallUnavailable=!$can_submit;$wallNext=null;
if($can_submit){
    try{
        $wallMessages=fb_wall_messages($db,$wallKind,$wallBefore);
        if(count($wallMessages)>FB_WALL_PAGE_SIZE){
            array_pop($wallMessages);
            $wallNext=(int)$wallMessages[array_key_last($wallMessages)]['id'];
        }
    }catch(Throwable $e){$wallUnavailable=true;error_log('AVENQIR public feedback read failed');}
}
if($can_submit&&$riskRequired&&$ts['mode']==='local')$human=fb_abuse_issue($_SESSION,time());
$showTurnstile=$can_submit&&$riskRequired&&$ts['mode']==='turnstile';
if($showTurnstile)fb_ts_headers();
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,follow"><meta name="referrer" content="no-referrer"><meta name="description" content="浏览经管理员审核的公开留言，或向 AVENQIR 提交反馈、网址推荐和失效链接报告。"><meta name="theme-color" content="#0a1827"><link rel="icon" href="icon.svg" type="image/svg+xml"><link rel="stylesheet" href="common.css?v=81"><link rel="stylesheet" href="feedback.css?v=130"><link rel="stylesheet" href="theme.css?v=15"><title>留言与网址推荐 · AVENQIR</title></head><body>
<?= fb_nav() ?>
<main class="wrap fb-page"><section class="fb-hero"><h1>留言与网址推荐</h1><p>分享好用的网址、报告失效链接，或告诉我们你希望增加什么。无需注册，发送时可选择谁能看见。</p><div class="fb-page-actions"><a class="btn primary" href="#write">写留言</a><a class="btn ghost" href="#wall">看公开留言</a></div></section>
<div class="fb-columns"><section class="panel fb-main" id="write"><div class="sectionhead"><div><h2>写留言</h2><p>请勿填写密码、验证码、身份证号或其他敏感信息。</p></div></div>
<?php if($notice!==''):?><div class="fb-alert <?= $success?'fb-ok':'fb-error' ?>" role="status"><?= fb_e($notice) ?></div><?php endif; ?>
<?php if($can_submit):?>
<form method="post" class="fb-form" autocomplete="on"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><div class="fb-trap"><label>网站地址<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<fieldset class="fb-visibility">
<legend>谁可以看见这条留言</legend>
<label><input type="radio" name="visibility" value="private"<?= $visibility==='private'?' checked':'' ?>><span><strong>仅管理员可见</strong><small>适合联系管理员、报告问题或发送私人反馈。</small></span></label>
<label><input type="radio" name="visibility" value="public"<?= $visibility==='public'?' checked':'' ?>><span><strong>申请公开</strong><small>审核通过后，访客可看到昵称、主题、正文、类型和日期。</small></span></label>
</fieldset>
<label>留言类型<select name="kind"><?php foreach($kind_values as $value=>$label):?><option value="<?= fb_e($value) ?>"<?= $inputs['kind']===$value?' selected':'' ?>><?= fb_e($label) ?></option><?php endforeach; ?></select></label>
<div class="fb-pair"><label><span>昵称 <b aria-hidden="true">*</b></span><input name="name" maxlength="60" required minlength="2" autocomplete="nickname" placeholder="怎么称呼你？" value="<?= fb_e($inputs['name']) ?>"></label><label><span>联系邮箱 <small>选填，不公开</small></span><input type="email" name="email" maxlength="190" autocomplete="email" placeholder="想收到人工回复时填写" value="<?= fb_e($inputs['email']) ?>"></label></div>
<label><span>主题 <b aria-hidden="true">*</b></span><input name="subject" maxlength="120" required placeholder="例如：推荐一个很好用的网站" value="<?= fb_e($inputs['subject']) ?>"></label>
<label><span>相关网页 <small>选填，仅管理员可见</small></span><input type="url" name="ref_url" maxlength="1400" inputmode="url" placeholder="https://example.com/" value="<?= fb_e($inputs['ref_url']) ?>"></label>
<label><span>留言内容 <b aria-hidden="true">*</b></span><textarea name="body" maxlength="2000" minlength="10" required rows="6" placeholder="说说你发现的问题、推荐的理由，或者希望增加的功能…"><?= fb_e($inputs['body']) ?></textarea></label>
<?php if(isset($human)):?><fieldset><legend>额外人机确认</legend><p>仅在重复或异常请求时出现。回答后继续发送，不需要第三方账号。</p><input type="hidden" name="human_id" value="<?=fb_e($human['id'])?>"><label><?=fb_e($human['question'])?><input name="human_answer" inputmode="numeric" autocomplete="off" maxlength="3" required></label></fieldset><?php endif;?>
<?php if($showTurnstile):?><fieldset><legend>Cloudflare 人机验证</legend><p>高频提交需额外验证。Cloudflare 会处理验证所需的浏览器和网络信号；不会由本站发送留言正文或邮箱。若组件无法加载，请使用系统浏览器。</p><div class="cf-turnstile" data-sitekey="<?=fb_e($ts['sitekey'])?>" data-action="feedback" data-theme="auto" data-size="flexible"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script></fieldset><?php elseif($riskRequired&&$ts['mode']==='unavailable'):?><p role="alert">验证配置不可用，请稍后再试。</p><?php endif;?>
<label class="fb-consent"><input type="checkbox" name="consent" value="yes" required><span>我已阅读<a href="privacy.html">隐私说明</a>，同意管理员保存留言，并按我选择的可见范围处理。</span></label>
<button class="btn primary fb-submit" type="submit">发送留言 <span aria-hidden="true">↗</span></button><p class="fb-caption">反垃圾限制：每个网络出口每小时最多 3 条；高频请求需额外人机确认，重复内容不会再次入库。无即时回复承诺；提交不代表已发送邮件。</p></form>
<?php else:?><div class="fb-alert fb-error"><strong>留言暂不可用。</strong><p>其他网页和工具可继续使用。</p></div><?php endif; ?></section>
<aside class="fb-side"><section class="fb-side-card"><div class="fb-side-icon" aria-hidden="true">↗</div><h2>推荐优质网站</h2><p>管理员会审核网址推荐。留言获准公开后，网址仍需另行审核收录。</p><a href="directory.html">浏览公开网址目录 →</a></section><section class="fb-side-card"><div class="fb-side-icon" aria-hidden="true">◈</div><h2>可见范围</h2><p>公开留言经过人工审核。填写的联系邮箱与参考网页仅管理员可见。</p><a href="privacy.html">查看隐私说明 →</a></section></aside></div>
<section class="panel fb-wall" id="wall" aria-labelledby="wall-title">
  <div class="sectionhead"><div><h2 id="wall-title">公开留言</h2><p>这里展示访客主动申请公开并经管理员审核的留言。</p></div></div>
  <nav class="fb-wall-filters" aria-label="公开留言类型">
  <?php foreach([''=>'全部']+$kind_values as $value=>$label):?>
    <a class="btn ghost"<?= $wallKind===$value?' aria-current="true"':'' ?> href="feedback.php<?= $value!==''?'?category='.rawurlencode($value):'' ?>#wall"><?= fb_e($label) ?></a>
  <?php endforeach; ?>
  </nav>
  <?php if($wallUnavailable):?><p class="fb-empty">公开留言暂不可用，请稍后再来。</p>
  <?php elseif(!$wallMessages):?><p class="fb-empty"><?= $wallKind==='' && $wallBefore===0?'还没有公开留言。':'这里暂时没有更多留言。' ?></p>
  <?php else:?>
  <div class="fb-wall-list">
  <?php foreach($wallMessages as $message):?>
  <article class="fb-message">
    <div class="fb-message-meta"><span><?= fb_e($kind_values[$message['kind']]??'网站留言') ?></span><time datetime="<?= fb_e($message['submitted_date']) ?>"><?= fb_e($message['submitted_date']) ?></time></div>
    <h3><?= fb_e($message['subject']) ?></h3>
    <small><?= fb_e($message['sender_name']) ?></small>
    <p><?= fb_e($message['body']) ?></p>
  </article>
  <?php endforeach; ?>
  </div>
  <?php endif; ?>
  <div class="fb-page-actions">
    <?php if($wallBefore>0):?><a class="btn ghost" href="feedback.php<?= $wallKind!==''?'?category='.rawurlencode($wallKind):'' ?>#wall">返回最新留言</a><?php endif; ?>
    <?php if($wallNext!==null):?><a class="btn ghost" href="feedback.php?<?= fb_e(http_build_query(['category'=>$wallKind,'before'=>$wallNext])) ?>#wall">更早留言</a><?php endif; ?>
    <a class="btn primary" href="#write">写留言</a>
  </div>
</section>
</main><footer class="wrap footer"><span>© 2026 AVENQIR · Feedback</span><span><a href="privacy.html">隐私说明</a> · <a href="disclaimer.html">免责声明</a> · <a href="feedback-admin.php" rel="nofollow">留言管理</a></span></footer><script src="site.js?v=15" defer></script><script src="theme.js?v=15" defer></script><script src="feedback-pref.js?v=130" defer></script></body></html>
