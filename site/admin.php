<?php
declare(strict_types=1);
require __DIR__.'/server-core.php';
require __DIR__.'/admin-security.php';
if((($_SERVER['HTTPS']??'')!=='on' && ($_SERVER['HTTPS']??'')!=='1') && (string)($_SERVER['SERVER_PORT']??'')!=='443'){
  http_response_code(403); header('Content-Type: text/plain; charset=utf-8');exit('后台必须使用 HTTPS。请通过 https://avenqir.bg5.net/admin.php 打开。');
}
ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
session_name('AVENQIR_ADMIN');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
header('Cache-Control: no-store, private, max-age=0');header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
if(!isset($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(24));
$auth=stored_read('auth');$logged=aq_shared_adm_logged($auth,$_SESSION);
if(!$logged && ($_SERVER['REQUEST_METHOD']??'GET')==='GET'){
  if(($_GET['next']??'')==='feedback')$_SESSION['admin_after_login']='feedback-admin.php';
  elseif(isset($_GET['next']))unset($_SESSION['admin_after_login']);
}
if($logged)$_SESSION['until']=time()+1800;
$notice='';$failure=false;
function post_action(): string {return is_string($_POST['action']??null)?$_POST['action']:'';}
function go_admin(string $msg,string $target='admin.php'): never {
  $_SESSION['flash']=$msg;
  header('Location: '.($target==='feedback-admin.php'?'feedback-admin.php':'admin.php'),true,303);exit;
}
function aq_post_login_destination():string{
  $target=($_SESSION['admin_after_login']??'')==='feedback-admin.php'?'feedback-admin.php':'admin.php';
  unset($_SESSION['admin_after_login']);return $target;
}
if($_SERVER['REQUEST_METHOD']==='POST'){
  if(!hash_equals($_SESSION['csrf'],(string)($_POST['csrf']??''))){http_response_code(403);exit('CSRF check failed');}
  $act=post_action();
  if($act==='setup' && $auth===null){
    $code=(string)($_POST['setup_code']??'');$expected=require __DIR__.'/private-settings.php';
    $pwd=(string)($_POST['password']??'');$pwd2=(string)($_POST['password_confirm']??'');
    if(!is_string($expected)||!hash_equals($expected,$code)){$failure=true;$notice='激活码错误。';}
    elseif(strlen($pwd)<14||strlen($pwd)>128||$pwd!==$pwd2){$failure=true;$notice='管理员密码需要至少14个字符、两次一致。';}
    elseif(!stored_write('auth',['username'=>AQ_ADMIN_NAME,'password_hash'=>password_hash($pwd,PASSWORD_DEFAULT),'created'=>gmdate('c')])){$failure=true;$notice='保存管理员凭据失败：'.store_failure_reason().' 不要修改目录为 777，也不要重新上传激活码文件。';}
    else{session_regenerate_id(true);$_SESSION['logged']=true;$_SESSION['auth_tag']=aq_auth_tag((array)stored_read('auth'));$_SESSION['until']=time()+1800;go_admin('后台设置成功；初始化入口已关闭。',aq_post_login_destination());}
  }elseif($act==='login' && $auth!==null){
    $username=(string)($_POST['username']??'');
    $pwd=(string)($_POST['password']??'');
    $factor=(string)($_POST['mfa_code']??'');
    $fails=(int)($_SESSION['fails']??0);$until=(int)($_SESSION['lock_until']??0);
    if($until>time()){$failure=true;$notice='尝试过多，请稍后重试。';}
    elseif(!hash_equals(AQ_ADMIN_NAME,$username)||!password_verify($pwd,(string)($auth['password_hash']??''))){
      $_SESSION['fails']=$fails+1;
      if($_SESSION['fails']>=5)$_SESSION['lock_until']=time()+300;
      $failure=true;$notice='管理员账号或密码不正确。';
    }else{
      $verified=$auth;$freshMfa=false;
      $trustedHere=aq_trust_allowed($auth,$_COOKIE);
      if(aq_mfa_enabled($auth) && !$trustedHere){
        $verified=aq_mfa_consume_login($pwd,$factor);
        $freshMfa=$verified!==null;
      }
      if($verified===null){
        $_SESSION['fails']=$fails+1;
        if($_SESSION['fails']>=5)$_SESSION['lock_until']=time()+300;
        $failure=true;$notice='动态验证码或恢复码不正确，或已使用。';
      }else{
        session_regenerate_id(true);
        $_SESSION['logged']=true;$_SESSION['auth_tag']=aq_auth_tag($verified);
        $_SESSION['until']=time()+1800;$_SESSION['fails']=0;$_SESSION['lock_until']=0;
        $trustedSaved=false;
        if($freshMfa && (string)($_POST['trust_device']??'')==='yes'){
          $trustedSaved=aq_trust_register($pwd,aq_auth_tag($verified));
        }
        go_admin($trustedSaved?'登录成功，并信任当前浏览器 14 天。':'登录成功 · adm。',
          aq_post_login_destination());
      }
    }
  }elseif($act==='logout' && $logged){$_SESSION=[];session_destroy();header('Location: admin.php',true,303);exit;}
  elseif($logged){
    $links=public_links();
    if($act==='save'){
      $id=text_limit($_POST['id']??'',40);
      $row=valid_link($_POST['name']??'',$_POST['url']??'',$_POST['category']??'',$_POST['description']??'',$id,$_POST['languages']??'');
      if(!$row){$failure=true;$notice='网址或语言标签无效：仅接受合法 http(s) 地址和最多八个支持的语言代码。';}
      else{
        $pos=null;
        foreach($links as $i=>$x)if(($x['id']??'')===$id){$pos=$i;break;}
        if($pos===null && count($links)>=MAX_LINKS){$failure=true;$notice='超过公开目录的条目上限。';}
        else{if($pos===null)$links[]=$row;else $links[$pos]=$row;
          if(stored_write('links',$links))go_admin('公开目录已更新。');$failure=true;$notice='保存失败：'.store_failure_reason();
        }
      }
    }elseif($act==='delete'){
      $id=text_limit($_POST['id']??'',40);$old=count($links);
      $links=array_values(array_filter($links,fn($x)=>($x['id']??'')!==$id));
      if(count($links)===$old)go_admin('没有找到需要删除的条目。');
      if(stored_write('links',$links))go_admin('已删除条目。');$failure=true;$notice='删除失败：'.store_failure_reason();
    }elseif($act==='bulk'){
      $raw=(string)($_POST['bulk']??'');$lines=preg_split('/\r?\n/',$raw);
      if(strlen($raw)>22000 || count($lines)>80){$failure=true;$notice='每批最多80行、22KB。';}
      else{
        $new=[];$invalid=[];
        foreach($lines as $i=>$line){if(trim($line)==='')continue;$parts=explode('|',$line,5);if(count($parts)<2){$invalid[]=$i+1;continue;}
          $r=valid_link($parts[0],$parts[1],$parts[2]??'',$parts[3]??'','',$parts[4]??'');if(!$r){$invalid[]=$i+1;continue;}$new[]=$r;
        }
        if($invalid){$failure=true;$notice='第 '.implode(', ',$invalid).' 行格式错误，整批未导入。';}
        elseif(count($new)+count($links)>MAX_LINKS){$failure=true;$notice='导入后超过总数上限。';}
        else{$seen=array_column($links,'url');$added=0;
          foreach($new as $r){if(in_array($r['url'],$seen,true))continue;$links[]=$r;$seen[]=$r['url'];$added++;}
          if(stored_write('links',$links))go_admin('已导入 '.$added.' 条新网址（重复 URL 已跳过）。');$failure=true;$notice='导入失败：'.store_failure_reason();
        }
      }
    }elseif($act==='restore'){
      $f=$_FILES['backup']??null;
      if(!is_array($f)||($f['error']??1)!==UPLOAD_ERR_OK||($f['size']??0)>200000){$failure=true;$notice='没有选择有效的 JSON 备份文件，或文件大于200KB。';}
      else{
        $raw=@file_get_contents((string)$f['tmp_name']);
        $obj=is_string($raw)?json_decode($raw,true):null;
        $rows=is_array($obj)?($obj['items']??null):null;
        if(($obj['format']??'')!=='avenqir-public-v7'||!is_array($rows)||count($rows)>MAX_LINKS){$failure=true;$notice='JSON 备份格式不正确。';}
        else{
          $clean=[];$ids=[];$urls=[];
          foreach($rows as $row){
            if(!is_array($row)){ $clean=null;break;}
            $id=text_limit($row['id']??'',40);
            if($id===''||in_array($id,$ids,true)){ $clean=null;break;}
            $n=valid_link($row['name']??'',$row['url']??'',$row['category']??'',$row['description']??'',$id,$row['languages']??'');
            if(!$n||in_array($n['url'],$urls,true)){ $clean=null;break;}
            $clean[]=$n;$ids[]=$id;$urls[]=$n['url'];
          }
          if($clean===null){$failure=true;$notice='备份包含无效网址、重复ID或重复链接，未覆盖原数据。';}
          elseif(($_POST['confirm_restore']??'')!=='yes'){$failure=true;$notice='恢复备份前必须明确确认覆盖操作。';}
          elseif(stored_write('links',$clean)){go_admin('成功恢复 '.count($clean).' 条公开网址。');}
          else{$failure=true;$notice='恢复写入失败：'.store_failure_reason();}
        }
      }
    }elseif($act==='mfa_begin'){
      $pwd=(string)($_POST['current_password']??'');
      if(aq_mfa_enabled($auth)){$failure=true;$notice='已开启双重验证，不能重复绑定。';}
      elseif(!password_verify($pwd,(string)($auth['password_hash']??''))){$failure=true;$notice='密码错误，未开始双重验证绑定。';}
      else{
        $_SESSION['mfa_pending']=aq_secret_create();
        $_SESSION['mfa_pending_at']=time();
        go_admin('请在验证器中添加当前密钥，再输入一次6位动态码确认绑定。');
      }
    }elseif($act==='mfa_confirm'){
      $pending=(string)($_SESSION['mfa_pending']??'');
      $since=(int)($_SESSION['mfa_pending_at']??0);
      $pwd=(string)($_POST['current_password']??'');
      $otp=(string)($_POST['mfa_code']??'');
      if(aq_mfa_enabled($auth)){$failure=true;$notice='双重验证已经启用。';}
      elseif($since<time()-600||$since>time()||aq_secret_decode($pending)===null){$failure=true;$notice='绑定窗口已过期，重新开始。';unset($_SESSION['mfa_pending'],$_SESSION['mfa_pending_at']);}
      elseif(!password_verify($pwd,(string)($auth['password_hash']??''))){$failure=true;$notice='当前密码错误，未启用双重验证。';}
      else{
        $step=aq_totp_matching_step($pending,$otp);
        if($step===null){$failure=true;$notice='验证码错误，未启用双重验证。';}
        elseif(!aq_mfa_lock_ready()){$failure=true;$notice='服务器不支持可靠的 MFA 锁文件：为避免锁定管理员，暂不启用双重验证。';}
        else{
          [$codes,$hashes]=aq_recovery_create();
          $newAuth=$auth;$newAuth['username']=AQ_ADMIN_NAME;
          $newAuth['totp_secret']=$pending;$newAuth['totp_last_step']=$step;
          $newAuth['recovery_hashes']=$hashes;$newAuth['security_rev']=bin2hex(random_bytes(18));
          if(stored_write('auth',$newAuth)){
            unset($_SESSION['mfa_pending'],$_SESSION['mfa_pending_at']);
            $_SESSION['mfa_recovery_once']=$codes;
            $_SESSION['logged']=false;$_SESSION['auth_tag']='';
            go_admin('2FA 已启用。请先离线保存下面仅显示一次的十组恢复码，再重新登录 adm。');
          }
          $failure=true;$notice='保存 MFA 凭据失败：'.store_failure_reason().'；未启用，请勿删除验证器配置。';
        }
      }
    }elseif($act==='mfa_disable'){
      $pwd=(string)($_POST['current_password']??'');
      $otp=(string)($_POST['mfa_code']??'');
      $newAuth=aq_mfa_consume_login($pwd,$otp);
      if($newAuth===null){$failure=true;$notice='密码和动态验证码或恢复码校验未通过，MFA 保持启用。';}
      else{
        unset($newAuth['totp_secret'],$newAuth['totp_last_step'],$newAuth['recovery_hashes']);
        $newAuth['security_rev']=bin2hex(random_bytes(18));
        if(stored_write('auth',$newAuth)){
          $_SESSION['logged']=false;$_SESSION['auth_tag']='';
          go_admin('双重验证已关闭；所有旧会话失效。请重新登录。');
        }
        $failure=true;$notice='写入失败，双重验证状态未确认：'.store_failure_reason();
      }
    }elseif($act==='revoke_trusted'){
      $pwd=(string)($_POST['current_password']??'');
      $factor=(string)($_POST['mfa_code']??'');
      if(!password_verify($pwd,(string)($auth['password_hash']??''))){
        $failure=true;$notice='密码错误，没有撤销设备。';
      }elseif(aq_mfa_enabled($auth) && aq_mfa_consume_login($pwd,$factor)===null){
        $failure=true;$notice='撤销设备前需重新通过 2FA，设备授权未改变。';
      }elseif(!aq_trust_clear_all()){
        $failure=true;$notice='无法保存撤销结果，原设备授权未改变。';
      }else go_admin('已撤销全部受信任设备；新设备须重新验证密码与 2FA。');
    }elseif($act==='change_password'){
      $old=(string)($_POST['old_password']??'');$new=(string)($_POST['new_password']??'');$confirm=(string)($_POST['new_confirm']??'');
      if(!password_verify($old,(string)($auth['password_hash']??''))){$failure=true;$notice='原密码错误，未修改。';}
      elseif(strlen($new)<14||strlen($new)>128||$new!==$confirm){$failure=true;$notice='新密码需至少14字符，且两次输入一致。';}
      else{
        $updated=$auth;
        if(aq_mfa_enabled($auth)){
          $updated=aq_mfa_consume_login($old,(string)($_POST['mfa_code']??''));
          if($updated===null){$failure=true;$notice='修改密码还需有效的动态验证码或恢复码。';}
        }
        if(!$failure){
          $updated['username']=AQ_ADMIN_NAME;
          $updated['password_hash']=password_hash($new,PASSWORD_DEFAULT);
          $updated['security_rev']=bin2hex(random_bytes(18));
          $updated['changed']=gmdate('c');
          if(stored_write('auth',$updated)){
            $_SESSION=[];session_destroy();header('Location: admin.php',true,303);exit;
          }
          $failure=true;$notice='密码修改失败：'.store_failure_reason();
        }
      }
    }else{$failure=true;$notice='不支持的操作。';}
  }else{$failure=true;$notice='尚未登录或会话已过期，请重新登录。';}
}
$auth=stored_read('auth');$logged=aq_shared_adm_logged($auth,$_SESSION);
$recovery_once=$_SESSION['mfa_recovery_once']??null;
unset($_SESSION['mfa_recovery_once']);
if($logged && isset($_GET['export'])){
  header('Content-Type: application/json; charset=utf-8');header('Content-Disposition: attachment; filename="avenqir-public-directory-backup.json"');
  echo json_encode(['format'=>'avenqir-public-v7','exported'=>gmdate('c'),'items'=>public_links()],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
}
if(isset($_SESSION['flash'])){if($notice==='')$notice=(string)$_SESSION['flash'];unset($_SESSION['flash']);}
$edit=null;
if($logged&&isset($_GET['edit']))foreach(public_links() as $r)if(($r['id']??'')===(string)$_GET['edit']){$edit=$r;break;}
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>AVENQIR · 目录管理</title><link href="common.css?v=7" rel="stylesheet"></head><body class="admin-body">
<header class="headbar"><div class="wrap head-inner"><a class="logo" href="index.html">⬡ AVENQIR</a><nav class="main-nav"><a href="directory.html">公开目录</a><a href="index.html">网站首页</a></nav><span class="microbadge">ADMIN</span></div></header>
<main class="wrap"><section class="hero"><div class="eyebrow">PRIVATE ADMIN · HTTPS ONLY</div><h1>网址目录管理后台</h1><p class="subline">这里只发布你愿意公开的网址。后台无需 GitHub Token；数据保存在 SEUS 主机的受保护 PHP 数据文件中。</p><?php if($logged):?><div class="btnrow"><a class="btn primary" href="feedback-admin.php" id="adminGoFeedback">打开站长留言 · 无需重复登录</a><a class="btn ghost" href="admin.php">管理网址目录</a></div><p class="hint">两处共用 adm 身份、密码和 2FA；退出任一后台即退出全部。</p><?php endif;?></section>
<?php if($notice!==''):?><p class="admin-notice<?= $failure?' error':'' ?>" role="status"><?= e($notice) ?></p><?php endif; ?>
<?php if(is_array($recovery_once)&&count($recovery_once)===10):?>
<section class="panel admin-form" aria-label="MFA one-time backup codes"><h2>2FA 已绑定 · 恢复码只显示一次</h2>
<p class="hint">把十组恢复码立即保存到密码管理器或离线位置。每组只能使用一次。不要截图分享或粘贴到聊天中。离开或刷新此页面后不会再显示。</p>
<pre style="overflow-wrap:anywhere;white-space:pre-wrap;font-size:1rem"><?= e(implode("\n",$recovery_once)) ?></pre>
<a class="btn ghost" href="admin.php">我已保存恢复码，返回 adm 登录</a></section>
<?php endif; ?>
<?php if($auth===null):?>
<section class="panel admin-form"><span class="label">FIRST SETUP</span><h2>首次激活账号：adm</h2><p class="hint">从单独下载的私人激活码文件中复制一次性激活码。激活成功后不能重复注册管理员。</p>
<form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="setup"><label>初始化激活码<input type="password" name="setup_code" autocomplete="off" required></label><label>设置管理员独立密码（至少 14 字符）<input type="password" name="password" minlength="14" autocomplete="new-password" required></label><label>再次输入密码<input type="password" name="password_confirm" minlength="14" autocomplete="new-password" required></label><button class="btn primary" type="submit">激活管理后台</button></form></section>
<?php elseif(!$logged):?>
<section class="panel admin-form"><span class="label">SIGN IN</span><h2>管理员登录</h2><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="login">
<label>管理员账号<input type="text" name="username" value="adm" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>
<label>管理员密码<input type="password" name="password" autocomplete="current-password" required></label>
<?php if(aq_mfa_enabled($auth) && !aq_trust_allowed($auth,$_COOKIE)):?>
<label>验证器动态码（6位）或一次性恢复码<input type="text" name="mfa_code" inputmode="text" autocomplete="one-time-code" maxlength="24" required></label>
<label class="toggleline"><input type="checkbox" name="trust_device" value="yes"> 信任此浏览器 14 天（之后仍需管理员密码，不再重复输入 2FA）</label>
<?php elseif(aq_mfa_enabled($auth)):?><p class="hint">当前浏览器已获授权：仍需填写管理员密码，14 天内无需重复动态验证码。</p><?php endif; ?>
<button class="btn primary" type="submit">登录 adm</button></form><p class="hint">HTTPS 加密 + 会话过期 + CSRF 校验；共享主机上不建议存储敏感信息。</p></section>
<?php else:?>
<section class="panel wide" aria-label="AL private browser">
<div class="sectionhead"><div><span class="label">OWNER ONLY · AL SANDBOX</span>
<h2>adm 的 AL 私人浏览器入口</h2>
<p>打开你在本机保存的 Cloudflare Access 远程浏览器地址；首次需到 AVENQIR 的私人入口保存。访问仍由 Cloudflare Access 身份认证和 VNC 密码保护，不能绕过登录。</p></div></div>
<div class="btnrow"><a id="adminAlDirect" class="btn primary" href="remote-workspace.html" target="_blank" rel="noopener noreferrer">打开 AL 私人浏览器</a>
<a class="btn ghost" href="remote-workspace.html" target="_blank" rel="noopener noreferrer">设置 / 检查 AL 连接</a></div>
<p class="hint" id="adminAlState">如果尚未配置、AL 未运行或 Cloudflare Access 未放行，该入口不会自动连通。</p>
</section>
<div class="layout"><section class="panel wide"><div class="sectionhead"><div><span class="label">PUBLIC CATALOG</span><h2>当前公开网址（<?= count(public_links()) ?> 条）</h2><p>手机上点击编辑即可修改；不同设备再次打开目录会获得服务器最新数据。</p></div><a class="btn ghost" href="admin.php?export=1">下载 JSON 备份</a></div><div class="admin-list">
<?php foreach(public_links() as $x): ?><div class="admin-item"><div><strong><?= e($x['name']) ?></strong><p><?= e($x['category']) ?> · <?= e($x['url']) ?></p></div><div class="btnrow"><a class="btn ghost mini-btn" href="admin.php?edit=<?= urlencode($x['id']) ?>#editor">编辑</a><form method="post"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= e($x['id']) ?>"><button class="btn ghost mini-btn" type="submit">删除</button></form></div></div><?php endforeach; ?>
</div></section>
<section class="panel" id="editor"><span class="label">EDITOR</span><h2><?= $edit?'编辑现有条目':'新增公开网址' ?></h2><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="save"><input type="hidden" name="id" value="<?= e($edit['id']??'') ?>"><label>显示名称<input name="name" maxlength="90" value="<?= e($edit['name']??'') ?>" required></label><label>完整网址<input name="url" type="url" inputmode="url" maxlength="1800" value="<?= e($edit['url']??'') ?>" placeholder="https://example.org" required></label><label>分类（可留空自动建议）<input name="category" maxlength="40" value="<?= e($edit['category']??'') ?>" placeholder="如：AI编程、科研、地图；留空自动分类"></label><p class="hint">留空后系统根据已知官方域名或明确关键词自动分类；证据不足写为“待分类”。你填写的分类始终优先，不代表该网站安全认证。</p><label>介绍<input name="description" maxlength="320" value="<?= e($edit['description']??'') ?>"></label><label>支持的页面语言（可选）<input name="languages" maxlength="100" value="<?= e(implode(',',is_array($edit['languages']??null)?$edit['languages']:[])) ?>" placeholder="en,ja,zh-Hans"></label><p class="hint">最多八种语言，用逗号分隔。只填写网页实际支持的语言；留空表示未知，不会由国家、地区或域名后缀推断。</p><button class="btn primary">保存到所有设备可见的公开目录</button></form></section>
<section class="panel"><span class="label">BULK IMPORT</span><h2>批量快速新增</h2><p class="hint">每行：名称 | URL | 分类（可空） | 备注 | 语言代码（可空）。例如：Research | https://example.org/ | 学术 | 公开检索 | en,fr。重复 URL 自动跳过；分类留空时谨慎自动建议，无法确认则标“待分类”；仅接受合法 http(s) 地址。</p><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="bulk"><textarea name="bulk" maxlength="22000" rows="9" placeholder="OpenStreetMap | https://www.openstreetmap.org/ | 地图 | 开放地图"></textarea><button class="btn primary">批量导入</button></form><p class="hint">升级网站时不要删除或覆盖 `_store/`，特别是其中的 links.php 与 auth.php。</p></section>
<section class="panel"><span class="label">RESTORE / BACKUP</span><h2>从 JSON 备份恢复公开目录</h2><p class="hint">仅接受本后台导出的 avenqir-public-v7 格式。此操作会覆盖服务器上的全部公开网址，恢复前先导出当前数据。</p><form method="post" enctype="multipart/form-data" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="restore"><input type="file" name="backup" accept=".json,application/json" required><label class="toggleline"><input type="checkbox" name="confirm_restore" value="yes" required> 我确认覆盖当前全部公开目录</label><button type="submit" class="btn ghost">恢复备份 JSON</button></form></section>
<section class="panel"><span class="label">TRUSTED BROWSERS</span><h2>受信任浏览器</h2>
<p class="hint">首次密码＋2FA 后可选择信任当前浏览器 14 天；以后仍必须输入管理员密码。浏览器 Cookie 是可撤销的授权凭据，不使用设备指纹，也不是系统通行密钥。</p>
<p role="status">当前有效授权：<?= aq_trust_active_count($auth) ?> 台/浏览器配置（最多 6 项）。</p>
<?php if(aq_mfa_enabled($auth) && aq_trust_active_count($auth)>0):?>
<form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="revoke_trusted">
<label>当前管理员密码<input name="current_password" type="password" autocomplete="current-password" required></label>
<label>当前动态验证码或恢复码<input name="mfa_code" type="text" autocomplete="one-time-code" maxlength="24" required></label>
<button class="btn ghost" type="submit">撤销全部已授权浏览器（需密码和 2FA）</button></form><?php endif; ?>
</section>
<section class="panel"><span class="label">ACCOUNT / ADM / MFA</span><h2>管理员账号：adm</h2>
<p class="hint">仅此一个目录管理员账号。原密码保持不变；TOTP 双重验证为显式绑定，未绑定不会自动要求验证码。登录保护和 Cloudflare Access 是相互独立的两层。</p>
<?php if(aq_mfa_enabled($auth)):?>
<p role="status">状态：TOTP 双重验证已开启。只有提供当前管理员密码及有效验证器动态码或恢复码，才能关闭。</p>
<form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="mfa_disable">
<label>当前管理员密码<input type="password" name="current_password" autocomplete="current-password" required></label>
<label>当前动态码或一次性恢复码<input type="text" name="mfa_code" maxlength="24" autocomplete="one-time-code" required></label>
<button class="btn ghost" type="submit">校验并关闭 2FA（所有会话退出）</button></form>
<?php else:?>
<p role="status">状态：2FA 尚未绑定。</p>
<?php if(is_string($_SESSION['mfa_pending']??null) && (int)($_SESSION['mfa_pending_at']??0)>=time()-600):?>
<div class="panel"><h3>绑定验证器 · 第二步</h3>
<p class="hint">在验证器 App 里手动添加 TOTP：账户 <b>adm</b>、发行方 <b>AVENQIR</b>、算法 SHA-1、每 30 秒更新、6 位。</p>
<label>一次性绑定密钥（请勿分享）
<input type="text" readonly autocomplete="off" value="<?= e((string)$_SESSION['mfa_pending']) ?>" aria-label="TOTP secret for authenticator"></label>
<p class="hint">若使用支持 otpauth 的验证器，可打开此链接手动导入。密钥只能在当前 HTTPS 私人管理会话中查看。</p>
<a class="btn ghost" href="<?= e('otpauth://totp/AVENQIR%3Aadm?secret='.rawurlencode((string)$_SESSION['mfa_pending']).'&issuer=AVENQIR&algorithm=SHA1&digits=6&period=30') ?>">在验证器里导入</a>
<form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="mfa_confirm">
<label>确认管理员密码<input type="password" name="current_password" autocomplete="current-password" required></label>
<label>验证器当前 6 位动态码<input type="text" name="mfa_code" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
<button class="btn primary" type="submit">验证并正式启用 2FA</button></form>
</div>
<?php else:?>
<form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="mfa_begin">
<label>当前管理员密码<input type="password" name="current_password" autocomplete="current-password" required></label>
<button class="btn primary" type="submit">开始绑定验证器</button></form>
<?php endif; ?>
<?php endif; ?>
</section>
<section class="panel"><span class="label">ACCOUNT SECURITY</span><h2>更换管理员密码</h2><form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="change_password"><label>当前密码<input type="password" name="old_password" autocomplete="current-password" required></label><label>新密码（至少14字符）<input type="password" name="new_password" minlength="14" autocomplete="new-password" required></label><label>重复新密码<input type="password" name="new_confirm" minlength="14" autocomplete="new-password" required></label>
<?php if(aq_mfa_enabled($auth)):?><label>动态码或一次性恢复码<input type="text" name="mfa_code" maxlength="24" autocomplete="one-time-code" required></label><?php endif; ?>
<button type="submit" class="btn ghost">修改密码并退出登录</button></form></section></div>
<form method="post" class="admin-logout"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="logout"><button class="btn ghost">退出管理后台</button></form>
<?php endif; ?></main><?php if($logged):?><script src="admin-al-link.js?v=1" defer></script><?php endif; ?></body></html>
