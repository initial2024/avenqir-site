<?php
declare(strict_types=1);
require_once __DIR__.'/feedback-core.php';
require_once __DIR__.'/server-core.php';
require_once __DIR__.'/recommendations-core.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function rec_reply(array $body, int $status=200): void {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}

$method=$_SERVER['REQUEST_METHOD']??'';
try {
    $catalog=rec_catalog();
    if ($method==='GET') {
        if (($_GET['catalog']??null)==='added') {
            $added=array_filter($catalog,static fn(array $row): bool=>str_starts_with($row['id'],'pub-'));
            rec_reply(['ok'=>true,'items'=>array_values($added)]);
            return;
        }
        $window=filter_input(INPUT_GET,'days',FILTER_VALIDATE_INT)??7;
        if (!in_array($window,[7,30,90],true)) {rec_reply(['ok'=>false],400);return;}
        rec_reply(['ok'=>true,'days'=>$window,'items'=>(object)rec_stats(fb_db(),$catalog,time(),$window)]);
        return;
    }
    if ($method!=='POST') {
        header('Allow: GET, POST');
        rec_reply(['ok'=>false],405);
        return;
    }
    $origin=$_SERVER['HTTP_ORIGIN']??'';
    $host=$_SERVER['HTTP_HOST']??'';
    $local=PHP_SAPI==='cli-server' && preg_match('/\A(?:127\.0\.0\.1|localhost):[0-9]{1,5}\z/D',$host);
    if ($origin!=='https://avenqir.bg5.net' && !($local && $origin==='http://'.$host)) {
        rec_reply(['ok'=>false],403);
        return;
    }
    $type=explode(';',strtolower($_SERVER['CONTENT_TYPE']??''))[0];
    $raw=$type==='application/json'?file_get_contents('php://input',false,null,0,1025):false;
    $data=is_string($raw) && strlen($raw)<=1024?json_decode($raw,true):null;
    $action=$data['action']??null;
    $tool=$data['tool_id']??null;
    $stars=$data['stars']??null;
    if (!is_array($data) || !in_array($action,['click','rate','remove','clear'],true) ||
        !rec_token($data['voter_token']??null) ||
        ($action!=='clear' && (!is_string($tool) || !isset($catalog[$tool]))) ||
        ($action==='rate' && (!is_int($stars) || $stars<1 || $stars>5))) {
        rec_reply(['ok'=>false],400);
        return;
    }
    $db=fb_db();
    $key=hash_hmac('sha256','avenqir-recommendations-v1',fb_conf()['ip_hmac_secret'],true);
    try {
        $outcome=rec_write($db,$key,$data,$_SERVER['REMOTE_ADDR']??'',time());
    } catch (PDOException $error) {
        if ($error->getCode()!=='42S02') throw $error;
        rec_schema($db);
        $outcome=rec_write($db,$key,$data,$_SERVER['REMOTE_ADDR']??'',time());
    }
    if ($action==='click') rec_reply(['ok'=>true]);
    elseif ($outcome==='limited') rec_reply(['ok'=>false,'error'=>'rate_limited'],429);
    else rec_reply(['ok'=>true]);
} catch (Throwable $error) {
    error_log('AVENQIR recommendation request could not be completed');
    rec_reply(['ok'=>false,'error'=>'unavailable'],503);
}
