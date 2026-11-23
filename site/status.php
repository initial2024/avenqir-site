<?php
/* Minimal on-demand shared-host PHP self-check. No secrets, no filesystem paths, no internal configuration exposed. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, max-age=0, must-revalidate');
header('X-Content-Type-Options: nosniff');
echo json_encode(array(
  'ok' => true,
  'server_utc' => gmdate('c'),
  'runtime' => 'PHP',
  'version' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION,
), JSON_UNESCAPED_SLASHES);
