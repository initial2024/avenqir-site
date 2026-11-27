<?php
declare(strict_types=1);
require_once __DIR__.'/server-core.php';
require_once __DIR__.'/admin-security.php';
require_once __DIR__.'/feedback-core.php';
require_once __DIR__.'/traffic-core.php';
if(!fb_https()){http_response_code(403);exit;}
fb_start_session('AVENQIR_ADMIN');fb_headers();
$auth=stored_read('auth');
if(!aq_shared_adm_logged($auth,$_SESSION)){header('Location: admin.php',true,303);exit;}
$csrf=fb_csrf();$notice='';$ready=false;$enabled=false;$hasSchema=false;$data=['daily'=>[],'groups'=>[]];
$days=in_array($_GET['days']??'',['7','30'],true)?(int)$_GET['days']:7;
$today=aq_traffic_day(time());
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'&&!fb_csrf_ok()){http_response_code(403);exit;}
try{
    $db=fb_db();$ready=true;
    if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
        $action=$_POST['action']??'';
        if($action==='enable'){
            aq_traffic_schema($db);$db->exec('UPDATE aq_traffic_config SET enabled=1 WHERE id=1');$notice='统计已启用；仅接收主动同意的访客记录。';
        }elseif($action==='disable'){
            if(aq_traffic_enabled($db))$db->exec('UPDATE aq_traffic_config SET enabled=0 WHERE id=1');
            $notice='已暂停收集。';
        }elseif($action==='erase'&&($_POST['confirm']??'')==='yes'){
            aq_traffic_schema($db);$db->beginTransaction();
            try{$db->exec('UPDATE aq_traffic_config SET enabled=0 WHERE id=1');foreach(['aq_traffic_network','aq_traffic_daily','aq_traffic_total'] as $table)$db->exec("DELETE FROM $table");$db->commit();}
            catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
            $notice='统计已清空并关闭。';
        }
    }
    $enabled=aq_traffic_enabled($db);
    try{aq_traffic_prune($db,$today);$data=aq_traffic_report($db,$today,$days);$hasSchema=true;}
    catch(PDOException $e){if($e->getCode()!=='42S02')throw $e;}
}catch(Throwable $e){$ready=false;$notice='数据库或统计模块暂不可用；未将缺失数据当作零。';}
$hits=array_sum(array_column($data['daily'],'hits'));
$networkDays=array_sum(array_column($data['daily'],'networks'));
$todayRow=array_values(array_filter($data['daily'],static fn($r)=>(int)$r['day_id']===$today))[0]??[];
$names=['home'=>'首页','directory'=>'公开网址','recommendations'=>'推荐评价','bookmarks'=>'书签','notes'=>'笔记','fun'=>'解压','daily'=>'日常','tools'=>'工具箱','check'=>'检测','transfer'=>'迁移','appearance'=>'外观','privacy'=>'隐私','other'=>'其他','direct'=>'直接/来源未提供','internal'=>'站内跳转','xiaohongshu'=>'小红书','search'=>'搜索引擎','social'=>'社交平台','ipv4'=>'IPv4','ipv6'=>'IPv6','unknown'=>'未知/非公网'];
?><!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>访问统计 · AVENQIR</title><link rel="stylesheet" href="common.css?v=103"><link rel="stylesheet" href="traffic.css?v=140"></head><body><main class="wrap traffic-owner">
<a class="btn ghost" href="admin.php">← 返回管理后台</a><h1>访问统计</h1>
<p class="hint">仅管理员可见 · UTC+8 · 自愿参与样本，非全站访问量。IP 只用于临时网段去重，不展示原地址，不推断实际所在地。</p>
<?php if($notice!==''):?><p role="status"><?=e($notice)?></p><?php endif;?>
<section class="panel"><h2><?=!$ready?'统计暂不可用':($enabled?'统计已启用':'统计已暂停')?></h2>
<?php if($ready):?><form method="post" class="btnrow"><input type="hidden" name="csrf" value="<?=e($csrf)?>"><button class="btn primary" name="action" value="<?=$enabled?'disable':'enable'?>"><?=$enabled?'暂停收集':'启用统计'?></button></form><?php endif;?>
<p class="hint">不记录搜索词、私人内容、完整来源网址、Cookie 或访客身份；访客可在隐私页面关闭参与。</p></section>
<?php if($ready&&$hasSchema):?>
<div class="btnrow"><a class="btn ghost" href="?days=7">近7天</a><a class="btn ghost" href="?days=30">近30天</a></div>
<section class="traffic-metrics"><div class="panel"><span>今日参与浏览</span><strong><?=e($todayRow['hits']??0)?></strong></div><div class="panel"><span>今日去重网段</span><strong><?=e($todayRow['networks']??0)?></strong></div><div class="panel"><span><?=$days?>天参与浏览</span><strong><?=e($hits)?></strong></div><div class="panel"><span><?=$days?>天网段·日累计</span><strong><?=e($networkDays)?></strong></div></section>
<section class="panel"><h2>每日趋势</h2><?php if(!$data['daily']):?><p>暂无自愿参与样本。</p><?php else:?><div class="traffic-table"><?php foreach($data['daily'] as $row):?><div><span><?=e(gmdate('m-d',(int)$row['day_id']*86400))?></span><meter min="0" max="<?=max(1,...array_map('intval',array_column($data['daily'],'hits')))?>" value="<?=e($row['hits'])?>"></meter><b><?=e($row['hits'])?></b><small><?=e($row['networks'])?> 网段</small></div><?php endforeach;?></div><?php endif;?></section>
<?php foreach(['source'=>'访问入口来源','page'=>'热门站内页面','family'=>'IP 网络类型'] as $key=>$title):?><section class="panel"><h2><?=e($title)?></h2><?php if(empty($data['groups'][$key])):?><p>暂无样本。</p><?php else:?><div class="traffic-table"><?php foreach($data['groups'][$key] as $row):?><div><span><?=e($names[$row['label']]??$row['label'])?></span><meter min="0" max="<?=max(1,$hits)?>" value="<?=e($row['hits'])?>"></meter><b><?=e($row['hits'])?></b></div><?php endforeach;?></div><?php endif;?></section><?php endforeach;?>
<?php endif;?>
<details class="panel"><summary>统计口径及删除</summary><p>浏览器明确同意后每次公开页面展示发送一次请求。每日 /24 IPv4 或 /48 IPv6 网段经带密钥、按日变化摘要去重；不是独立人数。同网段每天最多120次，全站每天最多50,000次；机器人识别不完备。无法核实代理或 VPN 的真实国家地区。来源分类来自浏览器提供的上一页，直接访问与未提供来源合并。摘要保留当前及前一日，汇总最多30天，下次有效写入或管理员查看时清理；历史访问不补算。托管商日志不受本功能控制。</p>
<?php if($ready):?><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=e($csrf)?>"><label><input type="checkbox" name="confirm" value="yes" required>确认清空全部统计并关闭</label><button class="btn ghost" name="action" value="erase">清空统计</button></form><?php endif;?></details>
</main></body></html>
