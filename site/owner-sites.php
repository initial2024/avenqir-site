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
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
$auth=stored_read('auth');
if(!aq_shared_adm_logged($auth,$_SESSION)){header('Location: admin.php',true,303);exit;}
if(!isset($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(24));
$owner=(string)$auth['username'];
$data=stored_read('owner_sites')??['owner'=>$owner,'items'=>[]];
if(($data['owner']??null)!==$owner || !is_array($data['items']??null)){http_response_code(403);exit;}
$items=$data['items'];$notice='';
function aq_owner_url($raw):?string {
 if(!is_string($raw)||strlen($raw)>500||preg_match('/[\x00-\x20\x7f\\\\]/',$raw)||!filter_var($raw,FILTER_VALIDATE_URL))return null;
 $p=parse_url($raw);if(!$p||strtolower($p['scheme']??'')!=='https'||isset($p['user'])||isset($p['pass'])||isset($p['query'])||isset($p['fragment'])||isset($p['port']))return null;
 $h=strtolower($p['host']??'');
 if(!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D',$h)||preg_match('/\.(?:local|localhost|internal|test|invalid|onion)$/D',$h))return null;
 return $raw;
}
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
 if(!is_string($_POST['csrf']??null)||!hash_equals($_SESSION['csrf'],$_POST['csrf'])){http_response_code(403);exit;}
 $dir=__DIR__.'/_store';
 if(!store_init($dir)){http_response_code(503);exit('Storage unavailable');}
 $lock=@fopen($dir.'/.owner-sites.lock','c');
 if($lock===false||!@flock($lock,LOCK_EX|LOCK_NB)){if(is_resource($lock))fclose($lock);http_response_code(503);exit('Please retry');}
 $data=stored_read('owner_sites')??['owner'=>$owner,'items'=>[]];
 if(($data['owner']??null)!==$owner || !is_array($data['items']??null)){http_response_code(403);exit;}
 $items=$data['items'];
 $action=$_POST['action']??'';$id=is_string($_POST['id']??null)?$_POST['id']:'';
 $ok=false;
 if($action==='add'&&count($items)<12){
  $url=aq_owner_url($_POST['url']??null);$name=text_limit($_POST['name']??'',60);
  if($url!==null&&$name!==''&&!in_array($url,array_column($items,'url'),true)){
   $items[]=['id'=>bin2hex(random_bytes(12)),'name'=>$name,'url'=>$url,'state'=>'unknown','checked'=>null];$ok=true;
  }
 }elseif($action==='delete'||$action==='mark'){
  foreach($items as $k=>$row)if(($row['id']??null)===$id){
   if($action==='delete'){array_splice($items,$k,1);$ok=true;}
   elseif(in_array($_POST['state']??null,['reachable','failed','unknown'],true)){$items[$k]['state']=$_POST['state'];$items[$k]['checked']=gmdate('c');$ok=true;}
   break;
  }
 }
 $saved=$ok&&stored_write('owner_sites',['owner'=>$owner,'items'=>$items]);
 flock($lock,LOCK_UN);fclose($lock);
 if($saved){header('Location: owner-sites.php',true,303);exit;}
 $notice='操作未保存：请检查输入、容量或存储状态。';$items=$data['items'];
}
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>私人站点 · AVENQIR</title><link rel="stylesheet" href="common.css"></head><body><main class="wrap"><h1>私人站点状态</h1><a class="btn ghost" href="admin.php">返回管理后台</a><p>账号绑定 · 仅管理员可见。不会发起服务器代理、自动探测、定时保活或访问第三方 API。状态是管理员手动记录，不是监控结果。</p>
<?php if($notice!==''):?><p role="status"><?=e($notice)?></p><?php endif;?>
<details class="panel aq-compact-home"><summary>添加站点（最多 12 个）</summary><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><input type="hidden" name="action" value="add"><label>站点别名<input name="name" maxlength="60" required></label><label>HTTPS 网址（不要填写 token、查询参数或凭据）<input name="url" type="url" maxlength="500" placeholder="https://example.org/" required></label><button class="btn primary">保存到我的账号</button></form></details>
<details class="panel aq-compact-home" open><summary>我的站点（点击折叠）</summary><?php foreach($items as $row):?><div class="record"><strong><?=e($row['name'])?></strong><p><?=e($row['state'])?> · <?=e($row['checked']??'未确认')?></p><?php if(aq_owner_url($row['url']??null)!==null):?><a class="btn ghost" href="<?=e($row['url'])?>" target="_blank" rel="noopener noreferrer">主动打开站点</a><?php endif;?><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><input type="hidden" name="id" value="<?=e($row['id'])?>"><label>手动状态<select name="state"><option value="unknown">未确认</option><option value="reachable">可访问</option><option value="failed">访问失败</option></select></label><button class="btn ghost" name="action" value="mark">保存状态</button><button class="btn ghost" name="action" value="delete">移除记录</button></form></div><?php endforeach;?></details>
<details class="panel aq-compact-home"><summary>软件完整性验证（本机）</summary><p>选择 APK/ZIP，并填写从可信发布渠道独立获得的 SHA-256。文件不上传。匹配只证明字节一致，不证明安全或签名身份。普通浏览器或第三方内置浏览器可能不支持文件选择或本机加密 API，无法完成验证。Orbit 应用自身的签名检查仅在原生应用界面可用；网页与内置浏览器不能代替该检查。</p><label>软件文件<input id="verifyFile" type="file" accept=".apk,.zip"></label><label>预期 SHA-256<input id="verifyHash" maxlength="64" autocomplete="off" spellcheck="false"></label><button class="btn primary" id="verifyRun" type="button">验证一次</button><p id="verifyResult" role="status"></p></details></main><script src="owner-verify.js" defer></script></body></html>
