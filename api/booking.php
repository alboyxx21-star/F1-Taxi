<?php
require __DIR__ . '/lib.php';
cors();
require_post();
$config = require __DIR__ . '/config.php';
require __DIR__ . '/db.php';
require __DIR__ . '/notify.php';

$in = read_json();

// Abuse protection: silent bot filter, then per-IP rate limit.
honeypot_ok($in);
enforce_rate_limit('booking', 6, 300);   // max 6 bookings / 5 min / IP

$name    = field($in, 'name', 120);
$phone   = field($in, 'phone', 40);
$from    = field($in, 'from', 200);
$to      = field($in, 'to', 200);
$date    = field($in, 'date', 20);
$time    = field($in, 'time', 20);
$pax     = max(1, min(8, (int)($in['passengers'] ?? 1)));
$service = field($in, 'service', 20);
$price   = field($in, 'price', 20);
$flight  = field($in, 'flight', 40);
$note    = field($in, 'note', 1000);
$source  = field($in, 'source', 30) ?: 'website';

if ($name === '' || $phone === '' || $to === '') {
  json_out(['ok' => false, 'error' => 'Missing required fields'], 422);
}

try {
  $pdo = db($config);
  $stmt = $pdo->prepare(
    'INSERT INTO bookings
       (created_at, source, service, name, phone, from_addr, to_addr, ride_date, ride_time, passengers, price, flight, note)
     VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$source, $service, $name, $phone, $from, $to, $date, $time, $pax, $price, $flight, $note]);
  $id = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'Database error'], 500);
}

$lines = [
  "Rezervim i ri #$id",
  ($service === 'airport' ? 'Transfer aeroporti' : 'Udhëtim në qytet'),
  "Nga: $from",
  "Për: $to",
  "Data: $date $time",
  "Pasagjerë: $pax",
  "Emri: $name",
  "Telefoni: $phone",
];
if ($price  !== '') $lines[] = "Çmimi: €$price";
if ($flight !== '') $lines[] = "Fluturimi: $flight";
if ($note   !== '') $lines[] = "Shënime: $note";
notify_all($config, "Rezervim i ri #$id — F1 Taxi", implode("\n", $lines));

json_out(['ok' => true, 'id' => $id]);
