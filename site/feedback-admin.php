<?php
declare(strict_types=1);
require __DIR__.'/feedback-core.php';
require __DIR__.'/server-core.php';
require __DIR__.'/admin-security.php';
fb_headers();
header('X-Robots-Tag: noindex, nofollow, noarchive');
if(!fb_https()){http_response_code(403);exit('后台只允许 HTTPS。');}
if((int)($_SERVER['CONTENT_LENGTH']??0)>16384){http_response_code(413);exit('提交内容过大。');}
fb_start_session('AVENQIR_ADMIN');
$auth=stored_read('auth');
$logged=aq_shared_adm_logged($auth,$_SESSION);
if(!$logged){
  // Do not redirect POST: a destructive form must not be replayed after login.
  if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){
    http_response_code(403);exit('管理员会话已过期，请从 adm 重新登录。');
  }
  header('Location: admin.php?next=feedback',true,303);exit;
}
$_SESSION['until']=time()+1800;
$csrf=fb_csrf();$notice='';$error=false;$db=null;
try{$db=fb_db();}catch(Throwable $e){$notice=fb_config_message($e);$error=true;}
function fb_go(string $message): never {$_SESSION['fb_flash']=$message;header('Location: feedback-admin.php',true,303);exit;}
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
  if(!fb_csrf_ok()){http_response_code(403);exit('CSRF validation failed');}
  $action=fb_trim($_POST['action']??'',32);
  if($action==='logout'){
    $_SESSION=[];session_destroy();header('Location: admin.php',true,303);exit;
  }
  if(!($db instanceof PDO)){$notice='留言数据库暂不可用，未执行操作。';$error=true;}
  else{
    try{
      if($action==='init_feedback'){
        if(fb_submission_enabled($db))fb_go('留言后台已经启用，无需重复初始化。');
        fb_tables($db);
        $s=$db->prepare("INSERT INTO fb_settings(setting_key,setting_value) VALUES ('feedback_enabled','1') ON DUPLICATE KEY UPDATE setting_value='1'");
        $s->execute();
        fb_go('留言后台已启用，今后只需要 adm 登录。');
      }
      if(!fb_submission_enabled($db))throw new RuntimeException('NOT_INITIALIZED');
      if($action==='set_status'){
        $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT);
        $status=fb_trim($_POST['status']??'',16);
        if(!$id||!in_array($status,['new','read','done'],true))throw new RuntimeException('BAD_INPUT');
        $s=$db->prepare('UPDATE fb_messages SET status=? WHERE id=?');$s->execute([$status,$id]);
        fb_go('留言状态已更新。');
      }elseif($action==='delete'){
        if((string)($_POST['confirm']??'')!=='yes')throw new RuntimeException('BAD_INPUT');
        $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT);if(!$id)throw new RuntimeException('BAD_INPUT');
        $s=$db->prepare('DELETE FROM fb_messages WHERE id=?');$s->execute([$id]);
        fb_go('留言已经删除。');
      }else throw new RuntimeException('BAD_INPUT');
    }catch(Throwable $e){$notice='操作失败，请检查输入与数据库状态。';$error=true;}
  }
}
if(isset($_SESSION['fb_flash'])){$notice=(string)$_SESSION['fb_flash'];unset($_SESSION['fb_flash']);}
// Keep admin view private; never expose personal messages via public JSON endpoints.
$auth=stored_read('auth');
$logged=aq_shared_adm_logged($auth,$_SESSION);
if(!$logged){http_response_code(403);exit('管理员会话已失效，请重新登录 adm。');}
$feedbackEnabled=$db instanceof PDO && fb_submission_enabled($db);
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
<?php if($logged):?><section class="panel" aria-label="管理员入口导航"><span class="label">ADMIN HUB / 身份与远程访问</span><h2>管理入口导航</h2><p class="hint">本页与目录管理共用 <strong>adm</strong> 账号、密码和 2FA。登录一次即可使用两个后台；退出任一后台均使两处会话失效。</p><div class="btnrow"><a class="btn primary" href="admin.php" id="feedbackGoDirectoryAdmin">目录管理 adm · 设置 2FA</a><a class="btn ghost" href="remote-workspace.html" id="feedbackGoAlBrowser">AL 私人浏览器入口</a><a class="btn ghost" href="https://console.altare.gg/" target="_blank" rel="noopener noreferrer">Altare 机器控制台 ↗</a></div></section><?php endif;?>
<?php if($notice!==''):?><div class="fb-alert <?= $error?'fb-error':'fb-ok' ?>" role="status"><?= fb_e($notice) ?></div><?php endif;?>
<?php if(!$db):?><section class="panel"><h2>尚未完成数据库连接</h2><p>请在 VistaPanel 建立 MySQL 数据库，将服务器地址、数据库名称、用户名和密码填入 <code>_private/feedback-config.php</code>，然后重新打开本页面。</p><p class="hint">不要把数据库密码发到聊天或放进 HTML / JavaScript。</p></section>
<?php elseif(!$feedbackEnabled):?><section class="panel fb-admin-mini"><h2>启用留言后台</h2><p class="hint">已通过 adm 身份验证，只需一次点击创建留言数据表并启用收件箱；无需第二套密码。现有留言不会被删除。</p><form method="post"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="init_feedback"><button class="btn primary">启用站长留言后台</button></form></section>
<?php else:?>
<div class="fb-admin-top"><div class="fb-pills"><span>新消息 <?= $counts['new'] ?></span><span>已读 <?= $counts['read'] ?></span><span>已处理 <?= $counts['done'] ?></span></div><div class="btnrow"><a class="btn ghost" href="feedback-admin.php?export=1">导出 JSON 备份</a><a class="btn ghost" href="feedback.php">查看留言页</a></div></div>
<div class="fb-admin-grid"><section class="panel"><div class="sectionhead"><div><span class="label">INBOX</span><h2>最近留言（最多 60 条）</h2></div></div><div class="fb-pills" style="margin-bottom:10px"><a href="?status=all">全部</a><a href="?status=new">未读</a><a href="?status=read">已读</a><a href="?status=done">已处理</a></div>
<?php if(!$messages):?><div class="fb-empty">当前没有匹配的留言。</div><?php endif; ?>
<?php foreach($messages as $m):?><article class="fb-message"><div class="fb-message-meta"><span>#<?= (int)$m['id'] ?></span><span><?= fb_e($kind_names[$m['kind']]??'其他') ?></span><span><?= fb_e($m['status']) ?></span><span><?= fb_e($m['created_at']) ?></span></div><h3><?= fb_e($m['subject']) ?></h3><small>来自：<?= fb_e($m['sender_name']) ?><?= $m['sender_email']!==''?' · '.fb_e($m['sender_email']):'' ?></small><p><?= fb_e($m['body']) ?></p>
<?php if($m['ref_url']!==''):?><p><small>参考链接：<?= fb_e($m['ref_url']) ?></small></p><?php endif;?>
<div class="fb-actions"><form method="post"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="set_status"><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><input type="hidden" name="status" value="read"><button class="btn ghost">标记已读</button></form><form method="post"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="set_status"><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><input type="hidden" name="status" value="done"><button class="btn ghost">标记已处理</button></form>
<?php if($m['sender_email']!==''):?><a class="btn ghost" href="mailto:<?= fb_e($m['sender_email']) ?>?subject=<?= rawurlencode('AVENQIR 留言回复 #'.$m['id']) ?>">邮件应用手动回复</a><?php endif;?>
<form method="post" data-confirm-delete="true"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="confirm" value="yes"><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><button class="btn ghost">删除</button></form></div></article><?php endforeach; ?></section>
<section class="panel"><span class="label">ACCOUNT & SAFETY</span><h2>统一管理员账户 · adm</h2><p class="hint">密码、TOTP 双重验证和恢复码请统一在目录管理后台维护；本站长后台不保存或验证独立管理员密码。</p><div class="btnrow"><a class="btn primary" href="admin.php">管理员安全设置</a></div>
<form method="post" style="margin-top:22px"><input type="hidden" name="csrf" value="<?= fb_e($csrf) ?>"><input type="hidden" name="action" value="logout"><button class="btn ghost">安全退出后台</button></form></section></div>
<?php endif; ?></main><script src="site.js?v=15" defer></script><script src="theme.js?v=15" defer></script><script src="feedback-admin.js?v=81" defer></script></body></html>
