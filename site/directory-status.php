<?php
declare(strict_types=1);
require __DIR__.'/server-core.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
if(($_SERVER['REQUEST_METHOD']??'')!=='GET'){
    http_response_code(405);header('Allow: GET');echo '{"ok":false}';exit;
}
require __DIR__.'/status-quota.php';
if(PHP_SAPI!=='cli'){
    $quota=aq_status_quota();
    if($quota!==200){http_response_code($quota);header('Retry-After: 60');echo '{"ok":false}';exit;}
}
echo json_encode(['ok'=>true,'schema'=>'avenqir-directory-status-v1','count'=>count(public_links())],JSON_THROW_ON_ERROR);
