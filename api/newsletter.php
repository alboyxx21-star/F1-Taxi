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
enforce_rate_limit('newsletter', 5, 600);   // max 5 signups / 10 min / IP

$email = field($in, 'email', 150);

if (!valid_email($email)) {
  json_out(['ok' => false, 'error' => 'Invalid email'], 422);
}

$isNew = false;
try {
  $pdo = db($config);
  // INSERT IGNORE so duplicate signups don't error out.
  $stmt = $pdo->prepare('INSERT IGNORE INTO subscribers (created_at, email) VALUES (NOW(), ?)');
  $stmt->execute([$email]);
  $isNew = $stmt->rowCount() > 0;   // 0 = already subscribed
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'Database error'], 500);
}

// Only greet genuinely-new subscribers (so re-submits don't re-send).
if ($isNew) {
  send_email($config, 'Mirë se erdhe në F1 Taxi 🚕', welcome_email_html($email), $email, true);
  // Let the business know someone subscribed.
  send_email($config, 'Abonent i ri — F1 Taxi', "Email: $email");
}

json_out(['ok' => true]);

/* Branded HTML welcome message sent to a new subscriber. */
function welcome_email_html(string $email): string {
  $wa = 'https://wa.me/355682550000';
  return '<!doctype html>
<html lang="sq"><body style="margin:0;padding:0;background:#0e1510;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1510;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="background:#181f0d;padding:26px;text-align:center;">
          <span style="color:#fefae0;font-size:26px;font-weight:800;letter-spacing:1px;">F1 <span style="color:#00FF39;">TAXI</span></span>
        </td></tr>
        <tr><td style="padding:34px 30px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#0f3d2a;">Mirë se erdhe në F1 Taxi! 🚕</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#33463c;">
            Faleminderit që u abonove. Do të jesh i pari që merr ofertat, çmimet dhe lajmet tona për taksi <strong>24/7</strong> në Tiranë dhe në gjithë Shqipërinë.
          </p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#33463c;">
            Kur të kesh nevojë për një udhëtim të shpejtë, të sigurt e profesional, na gjen me një klik:
          </p>
          <a href="' . $wa . '" style="display:inline-block;background:#283618;color:#fefae0;text-decoration:none;padding:14px 30px;border-radius:999px;font-weight:700;font-size:15px;">Rezervo në WhatsApp</a>
          <p style="margin:26px 0 0;font-size:13px;color:#8aa397;">+355 68 255 0000 · f1taxi.al</p>
        </td></tr>
        <tr><td style="background:#f2f4f0;padding:16px;text-align:center;font-size:11px;line-height:1.5;color:#8aa397;">
          © 2026 F1 Taxi · Tiranë, Shqipëri<br>
          E more këtë email sepse u abonove në f1taxi.al me adresën ' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';
}
