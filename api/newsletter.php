<?php
require __DIR__ . '/lib.php';
cors();
require_post();
$config = require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

$in = read_json();
$email = field($in, 'email', 150);

if (!valid_email($email)) {
  json_out(['ok' => false, 'error' => 'Invalid email'], 422);
}

try {
  $pdo = db($config);
  // INSERT IGNORE so duplicate signups don't error out.
  $stmt = $pdo->prepare('INSERT IGNORE INTO subscribers (created_at, email) VALUES (NOW(), ?)');
  $stmt->execute([$email]);
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'Database error'], 500);
}

json_out(['ok' => true]);
