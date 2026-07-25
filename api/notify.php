<?php
/* Notifications: email (SMTP) + WhatsApp Cloud API (optional).
   Both are best-effort — a failure here never breaks the API response. */

/* Minimal SMTP client (no external library). Works with SSL (465) or
   STARTTLS (587). Returns true on a best-effort send. */
function smtp_send(array $config, string $subject, string $body, ?string $to = null, bool $html = false): bool {
  $host   = $config['smtp_host']   ?? '';
  $port   = (int)($config['smtp_port'] ?? 465);
  $secure = $config['smtp_secure'] ?? 'ssl';
  $user   = $config['smtp_user']   ?? '';
  $pass   = $config['smtp_pass']   ?? '';
  $from   = $config['mail_from']   ?? $user;
  $to     = ($to !== null && $to !== '') ? $to : ($config['mail_to'] ?? $user);
  if ($host === '' || $user === '' || $pass === '') return false;

  // Don't verify the peer certificate — lets us talk to the local mail
  // server (localhost) whose cert won't match "localhost".
  $ctx = stream_context_create(['ssl' => [
    'verify_peer'      => false,
    'verify_peer_name' => false,
    'allow_self_signed'=> true,
  ]]);
  $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
  $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
  if (!$fp) return false;
  stream_set_timeout($fp, 15);

  $read = function () use ($fp) {
    $data = '';
    while (($line = fgets($fp, 515)) !== false) {
      $data .= $line;
      if (isset($line[3]) && $line[3] === ' ') break;
    }
    return $data;
  };
  $cmd = function ($c) use ($fp, $read) { fputs($fp, $c . "\r\n"); return $read(); };

  $ok = true;
  try {
    $read();                       // server greeting
    $cmd('EHLO f1taxi.al');
    if ($secure === 'tls') {
      $cmd('STARTTLS');
      stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
      $cmd('EHLO f1taxi.al');
    }
    $cmd('AUTH LOGIN');
    $cmd(base64_encode($user));
    $cmd(base64_encode($pass));
    $cmd('MAIL FROM:<' . $from . '>');
    $cmd('RCPT TO:<' . $to . '>');
    $cmd('DATA');
    $headers  = 'From: F1 Taxi <' . $from . ">\r\n";
    $headers .= 'To: <' . $to . ">\r\n";
    $headers .= 'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= 'Content-Type: ' . ($html ? 'text/html' : 'text/plain') . "; charset=UTF-8\r\n";
    fputs($fp, $headers . "\r\n" . $body . "\r\n.\r\n");
    $read();
    $cmd('QUIT');
  } catch (Throwable $e) {
    $ok = false;
  }
  fclose($fp);
  return $ok;
}

function send_email(array $config, string $subject, string $body, ?string $to = null, bool $html = false): void {
  try {
    if (!smtp_send($config, $subject, $body, $to, $html)) {
      // Fallback to the local mailer if SMTP is unavailable.
      $from = $config['mail_from'] ?? 'booking@f1taxi.al';
      $rcpt = ($to !== null && $to !== '') ? $to : ($config['mail_to'] ?? $from);
      $headers  = 'From: F1 Taxi <' . $from . ">\r\n";
      $headers .= 'MIME-Version: 1.0' . "\r\n" . 'Content-Type: ' . ($html ? 'text/html' : 'text/plain') . "; charset=UTF-8\r\n";
      @mail($rcpt, $subject, $body, $headers);
    }
  } catch (Throwable $e) { /* swallow */ }
}

function send_whatsapp(array $config, string $text): void {
  if (empty($config['whatsapp_enabled'])) return;
  if (empty($config['whatsapp_token']) || empty($config['whatsapp_phone_id']) || empty($config['whatsapp_to'])) return;
  try {
    $url = 'https://graph.facebook.com/v20.0/' . $config['whatsapp_phone_id'] . '/messages';
    $payload = json_encode([
      'messaging_product' => 'whatsapp',
      'to'                => $config['whatsapp_to'],
      'type'              => 'text',
      'text'              => ['body' => $text],
    ], JSON_UNESCAPED_UNICODE);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => $payload,
      CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $config['whatsapp_token'], 'Content-Type: application/json'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 15,
    ]);
    curl_exec($ch);
    curl_close($ch);
  } catch (Throwable $e) { /* swallow */ }
}

function notify_all(array $config, string $subject, string $text): void {
  send_email($config, $subject, $text);
  send_whatsapp($config, $text);
}
