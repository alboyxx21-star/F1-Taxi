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
  $from = $config['mail_from'] ?? 'booking@f1taxi.al';
  $rcpt = ($to !== null && $to !== '') ? $to : ($config['mail_to'] ?? $from);
  $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  $headers  = 'From: F1 Taxi <' . $from . ">\r\n";
  $headers .= 'Reply-To: ' . $from . "\r\n";
  $headers .= "MIME-Version: 1.0\r\n";
  $headers .= 'Content-Type: ' . ($html ? 'text/html' : 'text/plain') . "; charset=UTF-8\r\n";
  try {
    // PHP mail() uses the server's local MTA (Postfix on Plesk) — reliable for
    // both local (booking@f1taxi.al) and external (subscriber) delivery, and it
    // doesn't hinge on SMTP auth to localhost. The -f sets the envelope sender.
    $ok = @mail($rcpt, $encSubject, $body, $headers, '-f' . $from);
    if (!$ok) {
      error_log('[F1] mail() failed for ' . $rcpt . ' — falling back to SMTP');
      if (!smtp_send($config, $subject, $body, $to, $html)) {
        error_log('[F1] SMTP fallback also failed for ' . $rcpt);
      }
    }
  } catch (Throwable $e) {
    error_log('[F1] send_email exception for ' . $rcpt . ': ' . $e->getMessage());
  }
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
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);
    // Log the Meta response on failure so the real reason (expired token,
    // 24-hour window, wrong phone id…) shows up in the server error log.
    if ($code < 200 || $code >= 300) {
      error_log('[F1] WhatsApp failed: HTTP ' . $code . ' resp=' . substr((string) $resp, 0, 600) . ($cerr ? ' curl=' . $cerr : ''));
    }
  } catch (Throwable $e) {
    error_log('[F1] WhatsApp exception: ' . $e->getMessage());
  }
}

function notify_all(array $config, string $subject, string $text): void {
  send_email($config, $subject, $text);
  send_whatsapp($config, $text);
}
