<?php
declare(strict_types=1);
require __DIR__.'/server-core.php';
require __DIR__.'/admin-security.php';
if(!in_array($_SERVER['HTTPS']??'', ['on','1'],true) && (string)($_SERVER['SERVER_PORT']??'')!=='443'){http_response_code(403);exit;}
ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
session_name('AVENQIR_ADMIN');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; connect-src https://api.github.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
$auth=stored_read('auth');
if(!aq_shared_adm_logged($auth,$_SESSION)){header('Location: admin.php',true,303);exit;}
if(!isset($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(24));
$owner=(string)($auth['username']??AQ_ADMIN_NAME);
function aq_project_name($s):?string {
 if(!is_string($s))return null;
 $s=trim($s);
 return preg_match('/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/D',$s)&&strpos($s,'..')===false&&substr($s,-2)!=='/.'?$s:null;
}
function aq_owner_project_items(string $owner):array {
 $data=stored_read('owner_projects');
 if($data===null){if(is_file(store_path('owner_projects'))){http_response_code(503);exit('Storage unavailable');}return [];}
 if(($data['owner']??null)!==$owner||!is_array($data['items']??null)){http_response_code(403);exit;}
 return array_values(array_filter($data['items'],function($r){return aq_project_name($r)!==null;}));
}
$items=aq_owner_project_items($owner);$notice='';
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
 if(!is_string($_POST['csrf']??null)||!hash_equals($_SESSION['csrf'],$_POST['csrf'])){http_response_code(403);exit;}
 $dir=__DIR__.'/_store';
 if(!store_init($dir)){http_response_code(503);exit('Storage unavailable');}
 $lock=@fopen($dir.'/.owner-projects.lock','c');
 if($lock===false||!@flock($lock,LOCK_EX|LOCK_NB)){if(is_resource($lock))fclose($lock);http_response_code(503);exit('Please retry');}
 $items=aq_owner_project_items($owner);
 $repo=aq_project_name($_POST['repo']??null);$action=$_POST['action']??'';$ok=false;
 if($repo!==null){
  $matches=array_map('strtolower',$items);
  $i=array_search(strtolower($repo),$matches,true);
  if($action==='add'&&$i===false&&count($items)<12){$items[]=$repo;$ok=true;}
  elseif($action==='delete'&&$i!==false){array_splice($items,$i,1);$ok=true;}
 }
 $saved=$ok&&stored_write('owner_projects',['owner'=>$owner,'items'=>$items]);
 flock($lock,LOCK_UN);fclose($lock);
 if($saved){header('Location: owner-projects.php',true,303);exit;}
 $items=aq_owner_project_items($owner);$notice='未保存：请检查仓库名称、重复记录或容量。';
}
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>私人项目 · AVENQIR</title><link rel="stylesheet" href="common.css"><link rel="stylesheet" href="theme.css"></head><body><main class="wrap"><h1>私人 GitHub 项目</h1><div class="btnrow"><a class="btn ghost" href="admin.php">返回管理后台</a><a class="btn ghost" href="projects.html">公开本地项目工具</a></div><p>与管理员账号绑定，跨设备登录可读取同一清单。记录不写进本地缓存、公开页面或 Service Worker。仅主动检查公开 Releases，不需要 GitHub Token，也不能读取私有仓库内容。点击检查时仓库名会发给 GitHub。</p>
<?php if($notice!==''):?><p role="status"><?=e($notice)?></p><?php endif;?>
<details class="panel aq-compact-home"><summary>添加私人项目（最多 12 个）</summary><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><input type="hidden" name="action" value="add"><label>GitHub owner/repo<input name="repo" placeholder="owner/repo" maxlength="140" required></label><button class="btn primary">保存到管理员账号</button></form></details>
<section class="panel"><div class="sectionhead"><h2>我的项目</h2><span class="pill" id="ghBadge">未查询</span></div><button id="refreshRepos" class="btn primary" type="button">检查公开版本</button><p id="ghStatus" role="status">仅按需查询，结果只在当前页面内存保存。</p><div class="listing" id="repos" data-scope="owner"><?php if(!$items):?><p>还没有私人项目，请手动添加。</p><?php endif;?><?php foreach($items as $repo):?><article class="record" data-repo="<?=e($repo)?>"><h3><?=e($repo)?></h3><div data-release-result></div><form method="post"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><input type="hidden" name="repo" value="<?=e($repo)?>"><button class="btn ghost" name="action" value="delete">移除账号记录</button></form></article><?php endforeach;?></div></section></main><script src="projects.js?v=98" defer></script></body></html>
