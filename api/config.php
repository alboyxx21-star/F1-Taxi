<?php
/* Loads the secret config. Copy config.local.example.php -> config.local.php. */
$local = __DIR__ . '/config.local.php';
if (!is_file($local)) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'Server not configured (missing config.local.php).']);
  exit;
}
return require $local;
