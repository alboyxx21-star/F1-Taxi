<?php
/* Small shared helpers for the JSON API endpoints. */

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

/* Same-origin is the norm (site + api on f1taxi.al), but allow the site
   origins explicitly so www/non-www and preflight both work. */
function cors(): void {
  $allowed = ['https://f1taxi.al', 'https://www.f1taxi.al'];
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function read_json(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function field(array $data, string $key, int $max = 500): string {
  $v = isset($data[$key]) ? trim((string) $data[$key]) : '';
  return mb_substr($v, 0, $max);
}

function require_post(): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
  }
}

function valid_email(string $e): bool {
  return filter_var($e, FILTER_VALIDATE_EMAIL) !== false;
}

/* ============================================================
   Abuse protection: honeypot, rate limiting, login throttle.
   Storage is a set of small JSON files in the system temp dir,
   so nothing extra needs to be provisioned on the host.
   ============================================================ */

/* Best guess at the real client IP. On Plesk the site sits behind an
   nginx reverse proxy, so when the direct peer is loopback/private we
   trust the forwarded header; otherwise we use the direct address. */
function client_ip(): string {
  $remote = $_SERVER['REMOTE_ADDR'] ?? '';
  $isLocal = $remote === '' || $remote === '127.0.0.1' || $remote === '::1'
    || strncmp($remote, '10.', 3) === 0 || strncmp($remote, '192.168.', 8) === 0
    || strncmp($remote, '172.16.', 7) === 0;
  if ($isLocal && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $fwd = trim($parts[0]);
    if (filter_var($fwd, FILTER_VALIDATE_IP) !== false) return $fwd;
  }
  return filter_var($remote, FILTER_VALIDATE_IP) !== false ? $remote : 'unknown';
}

/* Directory for the abuse-protection counters. */
function _abuse_dir(): string {
  $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'f1taxi_guard';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  return $dir;
}

/* Sliding-window rate limiter. Returns true if the hit is allowed.
   Fails OPEN (allows) if the storage can't be used — we never want a
   disk hiccup to lock real customers out of booking. */
function rate_ok(string $bucket, int $max, int $windowSec): bool {
  $file = _abuse_dir() . DIRECTORY_SEPARATOR . sha1($bucket . '|' . client_ip()) . '.json';
  $fp = @fopen($file, 'c+');
  if (!$fp) return true;
  $allowed = true;
  if (@flock($fp, LOCK_EX)) {
    $now = time();
    $raw = stream_get_contents($fp);
    $hits = $raw ? json_decode($raw, true) : [];
    if (!is_array($hits)) $hits = [];
    $kept = [];
    foreach ($hits as $t) { if ((int)$t > $now - $windowSec) $kept[] = (int)$t; }
    $allowed = count($kept) < $max;
    if ($allowed) $kept[] = $now;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($kept));
    fflush($fp);
    @flock($fp, LOCK_UN);
  }
  fclose($fp);
  return $allowed;
}

/* Enforce a rate limit on a public endpoint: 429 + stop on breach. */
function enforce_rate_limit(string $bucket, int $max, int $windowSec): void {
  if (!rate_ok($bucket, $max, $windowSec)) {
    header('Retry-After: ' . $windowSec);
    json_out(['ok' => false, 'error' => 'Too many requests. Please wait a moment and try again.'], 429);
  }
}

/* Honeypot + time-trap. Bots fill every field and submit instantly.
   If tripped we respond with a fake success so the bot never learns it
   was filtered. $data is the decoded JSON body. */
function honeypot_ok(array $data): void {
  // 1. Hidden field that real users never see or fill.
  if (isset($data['hp_url']) && trim((string) $data['hp_url']) !== '') {
    json_out(['ok' => true]);            // pretend it worked
  }
  // 2. Form filled impossibly fast (< 1.2s on screen) → almost certainly a bot.
  if (isset($data['elapsed_ms'])) {
    $ms = (int) $data['elapsed_ms'];
    if ($ms >= 0 && $ms < 1200) {
      json_out(['ok' => true]);
    }
  }
}

/* --- Admin login throttle (per IP) ---------------------------------- */

function _login_file(): string {
  return _abuse_dir() . DIRECTORY_SEPARATOR . 'login_' . sha1(client_ip()) . '.json';
}

/* True while this IP is locked out after too many failed logins. */
function login_locked(int $maxFails = 5, int $lockSec = 900): bool {
  $file = _login_file();
  if (!is_file($file)) return false;
  $st = json_decode((string) @file_get_contents($file), true);
  if (!is_array($st)) return false;
  $fails = (int) ($st['fails'] ?? 0);
  $until = (int) ($st['until'] ?? 0);
  return $fails >= $maxFails && time() < $until;
}

/* Record one failed attempt; arms the lock once the cap is reached. */
function login_fail(int $maxFails = 5, int $lockSec = 900): void {
  $file = _login_file();
  $st = json_decode((string) @file_get_contents($file), true);
  if (!is_array($st)) $st = [];
  $st['fails'] = (int) ($st['fails'] ?? 0) + 1;
  $st['until'] = time() + $lockSec;    // rolling window from the latest failure
  @file_put_contents($file, json_encode($st), LOCK_EX);
}

/* Clear the counter on a successful login. */
function login_reset(): void {
  @unlink(_login_file());
}
