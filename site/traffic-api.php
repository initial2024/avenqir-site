<?php
declare(strict_types=1);
require_once __DIR__.'/feedback-core.php';
require_once __DIR__.'/traffic-core.php';
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');
header('Content-Type: application/json; charset=utf-8');
if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);header('Allow: POST');exit;}
if(!fb_https()||($_SERVER['HTTP_ORIGIN']??'')!=='https://avenqir.bg5.net'){http_response_code(403);exit;}
if(($_SERVER['HTTP_SEC_GPC']??'')==='1'||($_SERVER['HTTP_DNT']??'')==='1'){http_response_code(204);exit;}
if(preg_match('/bot|crawler|spider|headless|preview/i',(string)($_SERVER['HTTP_USER_AGENT']??''))){http_response_code(204);exit;}
$type=explode(';',strtolower($_SERVER['CONTENT_TYPE']??''))[0];
$raw=$type==='application/json'?file_get_contents('php://input',false,null,0,257):false;
$data=is_string($raw)&&strlen($raw)<=256?json_decode($raw,true):null;
if(!aq_traffic_input($data)){http_response_code(400);exit;}
try{
    if(fb_ready())aq_traffic_record(fb_db(),$data,(string)($_SERVER['REMOTE_ADDR']??''),(string)fb_conf()['ip_hmac_secret'],time());
    http_response_code(204);
}catch(Throwable $e){error_log('AVENQIR traffic aggregate unavailable');http_response_code(503);}
