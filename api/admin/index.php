<?php
/* ============================================================
   F1 TAXI — admin dashboard  (/api/admin/)
   Simple session login, then tables of bookings / reports /
   subscribers. Read-only.
   ============================================================ */

session_start();
require __DIR__ . '/../lib.php';
$config = require __DIR__ . '/../config.php';

function e($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

/* ---- Logout ---- */
if (isset($_GET['logout'])) {
  $_SESSION = [];
  session_destroy();
  header('Location: index.php');
  exit;
}

/* ---- Login (brute-force throttled: 5 tries, then a 15-min lockout) ---- */
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['user'])) {
  if (login_locked()) {
    $error = 'Shumë përpjekje. Provoni sërish pas 15 minutash.';
  } else {
    $u = (string) ($_POST['user'] ?? '');
    $p = (string) ($_POST['pass'] ?? '');
    $okUser = hash_equals((string) $config['admin_user'], $u);
    $okPass = hash_equals((string) $config['admin_pass'], $p);
    if ($okUser && $okPass) {
      login_reset();
      session_regenerate_id(true);      // fresh session id on privilege change
      $_SESSION['f1_admin'] = true;
      header('Location: index.php');
      exit;
    }
    login_fail();
    $error = 'Kredencialet janë të pasakta.';
  }
}

$authed = !empty($_SESSION['f1_admin']);

/* ---- Shared page shell ---- */
function shell_top(string $title): void { ?>
<!doctype html>
<html lang="sq"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>F1 Taxi — <?= e($title) ?></title>
<style>
  *{box-sizing:border-box} body{margin:0;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0e1510;color:#e9ede9}
  .wrap{max-width:1180px;margin:0 auto;padding:24px}
  h1{font-size:22px;margin:0} .bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
  .tabs{display:flex;gap:8px;margin:18px 0;flex-wrap:wrap}
  .tabs a{padding:8px 14px;border-radius:999px;background:#1a2a1e;color:#cfe;text-decoration:none;font-size:14px}
  .tabs a.on{background:#14e24a;color:#04240f;font-weight:700}
  table{width:100%;border-collapse:collapse;background:#131b15;border-radius:12px;overflow:hidden;font-size:13px}
  th,td{padding:9px 11px;text-align:left;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
  th{background:#18241b;color:#9fb3a5;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
  tr:hover td{background:rgba(255,255,255,.02)}
  a.btn{color:#14e24a;text-decoration:none;font-weight:600;font-size:14px}
  .login{max-width:360px;margin:8vh auto;background:#131b15;padding:28px;border-radius:16px}
  .login h1{margin-bottom:16px} .login input{width:100%;padding:12px;margin:6px 0;border-radius:10px;border:1px solid #2a3a2e;background:#0e1510;color:#fff;font-size:15px}
  .login button{width:100%;padding:12px;margin-top:10px;border:0;border-radius:10px;background:#14e24a;color:#04240f;font-weight:700;font-size:15px;cursor:pointer}
  .err{color:#ff8b7b;font-size:13px;margin:6px 0}
  .muted{color:#7f948a} .count{color:#7f948a;font-size:13px}
</style></head><body><div class="wrap">
<?php }

/* ---- Login screen ---- */
if (!$authed) {
  shell_top('Admin');
  ?>
  <form class="login" method="post">
    <h1>F1 Taxi — Admin</h1>
    <?php if ($error): ?><div class="err"><?= e($error) ?></div><?php endif; ?>
    <input name="user" placeholder="Përdoruesi" autocomplete="username" autofocus>
    <input name="pass" type="password" placeholder="Fjalëkalimi" autocomplete="current-password">
    <button type="submit">Hyr</button>
  </form>
  </div></body></html>
  <?php
  exit;
}

/* ---- Dashboard ---- */
require __DIR__ . '/../db.php';
$pdo = db($config);
$tab = $_GET['tab'] ?? 'bookings';
$valid = ['bookings', 'reports', 'subscribers'];
if (!in_array($tab, $valid, true)) $tab = 'bookings';
$rows = $pdo->query("SELECT * FROM `$tab` ORDER BY id DESC LIMIT 1000")->fetchAll();

shell_top('Admin');
?>
<div class="bar">
  <h1>F1 Taxi — Admin</h1>
  <a class="btn" href="?logout=1">Dil →</a>
</div>
<div class="tabs">
  <a href="?tab=bookings"    class="<?= $tab==='bookings'?'on':'' ?>">Rezervime</a>
  <a href="?tab=reports"     class="<?= $tab==='reports'?'on':'' ?>">Raporte</a>
  <a href="?tab=subscribers" class="<?= $tab==='subscribers'?'on':'' ?>">Abonentë</a>
</div>
<p class="count"><?= count($rows) ?> rreshta</p>
<div style="overflow-x:auto">
<table>
  <?php if ($rows): ?>
    <tr><?php foreach (array_keys($rows[0]) as $col): ?><th><?= e($col) ?></th><?php endforeach; ?></tr>
    <?php foreach ($rows as $r): ?>
      <tr><?php foreach ($r as $v): ?><td><?= nl2br(e($v)) ?></td><?php endforeach; ?></tr>
    <?php endforeach; ?>
  <?php else: ?>
    <tr><td class="muted">Asnjë rresht ende.</td></tr>
  <?php endif; ?>
</table>
</div>
</div></body></html>
