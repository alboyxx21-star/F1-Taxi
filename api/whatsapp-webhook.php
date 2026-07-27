<?php
/* ============================================================
   F1 TAXI — WhatsApp Cloud API webhook
   - GET  : Meta's verification handshake. Echoes hub.challenge back
            when the verify token matches the one in config.local.php.
   - POST : incoming message / status events — logged to the error log,
            answered with 200 so Meta stops retrying.

   NOTE: this webhook is only needed to RECEIVE messages/status. Sending
   booking alerts OUT (send_whatsapp in notify.php) does not require it.
   ============================================================ */

$config = require __DIR__ . '/config.php';
$verifyToken = (string) ($config['whatsapp_verify_token'] ?? '');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  // PHP converts the dots in hub.mode / hub.verify_token / hub.challenge
  // into underscores, so they arrive as hub_mode, hub_verify_token, …
  $mode      = $_GET['hub_mode']         ?? '';
  $token     = $_GET['hub_verify_token'] ?? '';
  $challenge = $_GET['hub_challenge']    ?? '';

  if ($mode === 'subscribe' && $verifyToken !== '' && hash_equals($verifyToken, (string) $token)) {
    header('Content-Type: text/plain');
    echo $challenge;                 // confirm the subscription to Meta
  } else {
    http_response_code(403);
    echo 'Forbidden';
  }
  exit;
}

if ($method === 'POST') {
  // Incoming events (messages, delivery/read status). Log and acknowledge.
  $raw = file_get_contents('php://input');
  error_log('[F1] WhatsApp webhook event: ' . substr((string) $raw, 0, 1500));
  http_response_code(200);
  echo 'OK';
  exit;
}

http_response_code(405);
echo 'Method Not Allowed';
