<?php
require __DIR__.'/server-core.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
if($_SERVER['REQUEST_METHOD']!=='GET'){http_response_code(405);echo json_encode(['error'=>'method_not_allowed']);exit;}
$links=public_links();
echo json_encode(['ok'=>true,'items'=>$links,'updated'=>@filemtime(store_path('links'))?:null], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
