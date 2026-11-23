<?php
declare(strict_types=1);
require __DIR__.'/feedback-core.php';
fb_headers();
header('X-Robots-Tag: noindex, nofollow, noarchive');
if(!fb_https()){http_response_code(403);exit('后台只允许 HTTPS。');}
if((int)($_SERVER['CONTENT_LENGTH']??0)>16384){http_response_code(413);exit('提交内容过大。');}
fb_start_session('AVENQIR_FEEDBACK_ADMIN');
$csrf=fb_csrf();$notice='';$error=false;$db=null;$hash=null;
try{$db=fb_db();$hash=fb_admin_hash($db);}catch(Throwable $e){$notice=fb_config_message($e);$error=true;}
$logged=$hash!==null && !empty($_SESSION['fb_logged']) && (int)($_SESSION['fb_until']??0)>time() && isset($_SESSION['fb_auth_tag']) && hash_equals((string)$_SESSION['fb_auth_tag'],hash('sha256',$hash));
if($logged) $_SESSION['fb_until']=time()+1800;
function fb_go(string $message): never {$_SESSION['fb_flash']=$message;header('Location: feedback-admin.php',true,303);exit;}
if($_SERVER['REQUEST_METHOD']==='POST' && $db instanceof PDO){
  if(!fb_csrf_ok()){http_response_code(403);exit('CSRF validation failed');}
  $action=fb_trim($_POST['action']??'',32);
  if($action==='setup' && $hash===null) {
    $code=(string)($_POST['setup_code']??'');$pwd=(string)($_POST['password']??'');$confirm=(string)($_POST['confirm_password']??'');
    if(!hash_equals((string)(fb_conf()['setup_sha256']??''),hash('sha256',$code))){$notice='激活码不正确。';$error=true;}
    elseif(strlen($pwd)<14 || strlen($pwd)>128 || $pwd!==$confirm){$notice='管理员密码应为 14～128 个字符，两次输入一致。';$error=true;}
    else try {
      fb_tables($db);
      $pw_hash=password_hash($pwd,PASSWORD_DEFAULT);
      $s=$db->prepare("INSERT IGNORE INTO fb_settings(setting_key,setting_value) VALUES ('admin_password',?)");$s->execute([$pw_hash]);
      if($s->rowCount()!==1){$notice='后台已经完成首次激活，不能重复初始化。';$error=true;}
      else{session_regenerate_id(true);$_SESSION['fb_logged']=true;$_SESSION['fb_until']=time()+1800;$_SESSION['fb_auth_tag']=hash('sha256',$pw_hash);fb_go('首次激活成功，留言收件箱已启用。');}
    } catch(Throwable $e) {error_log('Feedback setup failure');$notice='初始化数据库表失败。请检查数据库用户权限、表空间和主机支持情况。';$error=true;}
  }elseif($action==='login' && $hash!==null){
    $pw=(string)($_POST['password']??'');
    try {
      $ip=fb_ip_hash();
      $s=$db->prepare('SELECT COUNT(*) FROM fb_login_attempts WHERE ip_digest=? AND at_time>=DATE_SUB(NOW(), INTERVAL 15 MINUTE)');$s->execute([$ip]);
      if((int)$s->fetchColumn()>=5){$notice='登录尝试过多，请 15 分钟后再试。';$error=true;}
      elseif(password_verify($pw,$hash)){
        $db->prepare('DELETE FROM fb_login_attempts WHERE ip_digest=?')->execute([$ip]);
        session_regenerate_id(true);$_SESSION['fb_logged']=true;$_SESSION['fb_auth_tag']=hash('sha256',$hash);$_SESSION['fb_until']=time()+1800;
        fb_go('已登录留言管理后台。');
      }else{
        $db->prepare('INSERT INTO fb_login_attempts(ip_digest) VALUES(?)')->execute([$ip]);
        $notice='密码错误。';$error=true;
      }
    }catch(Throwable $e){error_log('Feedback login failed');$notice='暂时无法登录，请稍后重试。';$error=true;}
  }elseif($action==='logout' && $logged){$_SESSION=[];session_destroy();header('Location: feedback-admin.php',true,303);exit;}
  elseif($logged){
    try {
      if($action==='set_status') {
        $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT);$status=fb_trim($_POST['status']??'',16);
        if(!$id||!in_array($status,['new','read','done'],true)) throw new RuntimeException('BAD_INPUT');
        $s=$db->prepare('UPDATE fb_messages SET status=? WHERE id=?');$s->execute([$status,$id]);fb_go('留言状态已更新。');
      }elseif($action==='delete') {
        if((string)($_POST['confirm']??'')!=='yes')throw new RuntimeException('BAD_INPUT');
        $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT);if(!$id)throw new RuntimeException('BAD_INPUT');
        $s=$db->prepare('DELETE FROM fb_messages WHERE id=?');$s->execute([$id]);fb_go('留言已经删除。');
      }elseif($action==='change_password') {
        $old=(string)($_POST['old']??'');$next=(string)($_POST['next']??'');$again=(string)($_POST['again']??'');
        if(!password_verify($old,$hash)||strlen($next)<14||strlen($next)>128||$next!==$again)throw new RuntimeException('BAD_INPUT');
        $new_hash=password_hash($next,PASSWORD_DEFAULT);
        $s=$db->prepare("UPDATE fb_settings SET setting_value=? WHERE setting_key='admin_password'");$s->execute([$new_hash]);
        $_SESSION=[];session_destroy();header('Location: feedback-admin.php',true,303);exit;
      }else throw new RuntimeException('BAD_INPUT');
    }catch(Throwable $e){$notice='操作失败，请检查输入与数据库状态。';$error=true;}
  }else{$notice='请先登录。';$error=true;}
}
if(isset($_SESSION['fb_flash'])){$notice=(string)$_SESSION['fb_flash'];unset($_SESSION['fb_flash']);}
// Keep admin view private; never expose personal messages via public JSON endpoints.
$hash=$db instanceof PDO ? fb_admin_hash($db) : null;
$logged=$hash!==null && !empty($_SESSION['fb_logged']) && (int)($_SESSION['fb_until']??0)>time() && isset($_SESSION['fb_auth_tag']) && hash_equals((string)$_SESSION['fb_auth_tag'],hash('sha256',$hash));
$statusFilter=fb_trim($_GET['status']??'all',12);
if(!in_array($statusFilter,['all','new','read','done'],true))$statusFilter='all';
if($logged && isset($_GET['export']) && $db instanceof PDO){
  try {
    $rows=$db->query('SELECT id,kind,sender_name,sender_email,subject,body,ref_url,status,created_at FROM fb_messages ORDER BY id DESC LIMIT 5000')->fetchAll();
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="avenqir-feedback-backup.json"');
    echo json_encode(['format'=>'avenqir-feedback-v81','exported_at'=>gmdate('c'),'messages'=>$rows],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_INVALID_UTF8_SUBSTITUTE);exit;
  }catch(Throwable $e){$notice='备份失败，数据库暂不可用。';$error=true;}
}
$messages=[];$counts=['new'=>0,'read'=>0,'done'=>0];
if($logged && $db instanceof PDO){
  try {
    foreach($db->query('SELECT status,COUNT(*) AS count FROM fb_messages GROUP BY status')->fetchAll() as $r)if(isset($counts[$r['status']]))$counts[$r['status']]=(int)$r['count'];
    if($statusFilter==='all')$s=$db->query('SELECT id,kind,sender_name,sender_email,subject,body,ref_url,status,created_at FROM fb_messages ORDER BY id DESC LIMIT 60');
    else{$s=$db->prepare('SELECT id,kind,sender_name,sender_email,subject,body,ref_url,status,created_at FROM fb_messages WHERE status=? ORDER BY id DESC LIMIT 60');$s->execute([$statusFilter]);}
    $messages=$s->fetchAll();
  }catch(Throwable $e){$notice='读取留言失败，请检查数据库状态。';$error=true;}
}
$kind_names=['feedback'=>'网站反馈','link'=>'网址推荐','broken'=>'失效链接','contact'=>'联系站长'];
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0a1827"><link rel="stylesheet" href="common.css?v=81"><link rel="stylesheet" href="feedback.css?v=81"><link rel="stylesheet" href="theme.css?v=15"><title>留言管理 · AVENQIR</title></head><body>
<?= fb_nav() ?>
<main class="wrap fb-admin-page"><div class="fb-admin-heading"><span class="label">PRIVATE MESSAGE INBOX</span><h1>留言管理后台</h1><p class="hint">仅站长可见 · 不向访客公开邮箱和消息内容 · 不自动发送邮件</p></div>
<?php if($logged):?><section class="panel" aria-label="管理员入口导航"><span class="label">ADMIN HUB / 身份与远程访问</span><h2>管理入口导航</h2><p class="hint">本页是留言收件箱，使用独立的留言管理员密码。目录管理员账号为 <strong>adm</strong>，其 2FA 在“目录管理 adm”里单独设置；当前登录不代表已经取得目录后台权限。</p><div class="btnrow"><a class="btn primary" href="admin.php" id="feedbackGoDirectoryAdmin">目录管理 adm · 设置 2FA</a><a class="btn ghost" href="remote-workspace.html" id="feedbackGoAlBrowser">AL 私人浏览器入口</a><a class="btn ghost" href="https://console.altare.gg/" target="_blank" rel="noopener noreferrer">Altare 机器控制台 ↗</a></div></section><?php endif;?>
<?php if($notice!==''):?><div class="fb-alert <?= $error?'fb-error':'fb-ok' ?>" role="status"><?= fb_e($notice) ?></div><?php endif;?>
<?php if(!$db):?><section class="panel"><h2>尚未完成数据库连接</h2><p>请在 VistaPanel 建立 MySQL 数据库，将服务器地址、数据库名称、用户名和密码填入 <code>_private/feedback-config.php</code>，然后重新打开本页面。</p><p class="hint">不要把数据库密码发到聊天或放进 HTML / JavaScript。</p></section>
<?php elseif(!$hash):?><section class="panel fb-admin-mini"><h2>首次初始化</h2><p class="hint">仅需一次：输入另行下载的私人激活码，并设置独立管理员密码。后台自动建立留言数据表。</p><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="setup"><label>私人激活码<input name="setup_code" type="password" autocomplete="off" required></label><label>管理员独立密码（14～128 字符）<input type="password" name="password" minlength="14" autocomplete="new-password" required></label><label>再次输入密码<input type="password" name="confirm_password" minlength="14" autocomplete="new-password" required></label><button class="btn primary">初始化并启用留言后台</button></form></section>
<?php elseif(!$logged):?><section class="panel fb-admin-mini"><h2>留言管理员登录（独立于 adm 目录后台）</h2><p class="hint">目录后台的 adm 账号及其 TOTP 绑定在上方“目录管理 adm”入口。本页目前仍使用已有的独立留言密码，暂不共用 2FA 或 Cookie。</p><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="login"><label>管理员密码<input type="password" name="password" autocomplete="current-password" required></label><button class="btn primary">进入收件箱</button></form><p class="hint">独立登录密码，且不会向用户提供注册入口。连续登录失败会限速。</p></section>
<?php else:?>
<div class="fb-admin-top"><div class="fb-pills"><span>新消息 <?= $counts['new'] ?></span><span>已读 <?= $counts['read'] ?></span><span>已处理 <?= $counts['done'] ?></span></div><div class="btnrow"><a class="btn ghost" href="feedback-admin.php?export=1">导出 JSON 备份</a><a class="btn ghost" href="feedback.php">查看留言页</a></div></div>
<div class="fb-admin-grid"><section class="panel"><div class="sectionhead"><div><span class="label">INBOX</span><h2>最近留言（最多 60 条）</h2></div></div><div class="fb-pills" style="margin-bottom:10px"><a href="?status=all">全部</a><a href="?status=new">未读</a><a href="?status=read">已读</a><a href="?status=done">已处理</a></div>
<?php if(!$messages):?><div class="fb-empty">当前没有匹配的留言。</div><?php endif; ?>
<?php foreach($messages as $m):?><article class="fb-message"><div class="fb-message-meta"><span>#<?= (int)$m['id'] ?></span><span><?= fb_e($kind_names[$m['kind']]??'其他') ?></span><span><?= fb_e($m['status']) ?></span><span><?= fb_e($m['created_at']) ?></span></div><h3><?= fb_e($m['subject']) ?></h3><small>来自：<?= fb_e($m['sender_name']) ?><?= $m['sender_email']!==''?' · '.fb_e($m['sender_email']):'' ?></small><p><?= fb_e($m['body']) ?></p>
<?php if($m['ref_url']!==''):?><p><small>参考链接：<?= fb_e($m['ref_url']) ?></small></p><?php endif;?>
<div class="fb-actions"><form method="post"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="set_status"><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><input type="hidden" name="status" value="read"><button class="btn ghost">标记已读</button></form><form method="post"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="set_status"><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><input type="hidden" name="status" value="done"><button class="btn ghost">标记已处理</button></form>
<?php if($m['sender_email']!==''):?><a class="btn ghost" href="mailto:<?= fb_e($m['sender_email']) ?>?subject=<?= rawurlencode('AVENQIR 留言回复 #'.$m['id']) ?>">邮件应用手动回复</a><?php endif;?>
<form method="post" data-confirm-delete="true"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="confirm" value="yes"><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><button class="btn ghost">删除</button></form></div></article><?php endforeach; ?></section>
<section class="panel"><span class="label">ACCOUNT & SAFETY</span><h2>站长后台设置</h2><p class="hint">建议每周查看一次留言，定期清理无用消息并备份。邮件通知尚未开通。</p><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="change_password"><label>原密码<input type="password" name="old" required></label><label>新密码（至少14字符）<input type="password" name="next" minlength="14" required></label><label>确认新密码<input type="password" name="again" minlength="14" required></label><button class="btn ghost">修改密码并退出登录</button></form>
<form method="post" style="margin-top:22px"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="logout"><button class="btn ghost">安全退出后台</button></form></section></div>
<?php endif; ?></main><script src="site.js?v=15" defer></script><script src="theme.js?v=15" defer></script><script src="feedback-admin.js?v=81" defer></script></body></html>
