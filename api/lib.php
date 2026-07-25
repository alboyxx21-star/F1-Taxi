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
