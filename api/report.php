<?php
require __DIR__ . '/lib.php';
cors();
require_post();
$config = require __DIR__ . '/config.php';
require __DIR__ . '/db.php';
require __DIR__ . '/notify.php';

$in = read_json();

$name    = field($in, 'name', 120);
$email   = field($in, 'email', 150);
$booking = field($in, 'booking_id', 60);
$type    = field($in, 'issue_type', 60);
$message = field($in, 'message', 2000);

if ($name === '' || !valid_email($email) || $message === '') {
  json_out(['ok' => false, 'error' => 'Missing or invalid fields'], 422);
}

try {
  $pdo = db($config);
  $stmt = $pdo->prepare(
    'INSERT INTO reports (created_at, name, email, booking_ref, issue_type, message)
     VALUES (NOW(), ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$name, $email, $booking, $type, $message]);
  $id = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'Database error'], 500);
}

$lines = [
  "Raport i ri #$id",
  "Emri: $name",
  "Email: $email",
];
if ($booking !== '') $lines[] = "ID: $booking";
if ($type    !== '') $lines[] = "Lloji: $type";
$lines[] = "Përshkrimi: $message";
notify_all($config, "Raport i ri #$id — F1 Taxi", implode("\n", $lines));

json_out(['ok' => true, 'id' => $id]);
