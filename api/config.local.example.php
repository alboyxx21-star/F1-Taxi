<?php
/* ============================================================
   F1 TAXI — api/config.local.example.php
   Copy this file to  config.local.php  and fill in your values.
   config.local.php holds all secrets and is NOT committed to git.
   ============================================================ */

return [

  // ---- MySQL (Plesk → Databases → your database) ----
  'db_host' => 'localhost:3306',
  'db_name' => 'REPLACE_WITH_DB_NAME',
  'db_user' => 'REPLACE_WITH_DB_USER',
  'db_pass' => 'REPLACE_WITH_DB_PASSWORD',

  // ---- Notification email (sent via your hosting's SMTP) ----
  // Use 'localhost' — the mail server on the same hosting box. This works
  // even before DNS points the domain here, and has no external dependency.
  'smtp_host'   => 'localhost',
  'smtp_port'   => 465,
  'smtp_secure' => 'ssl',              // 'ssl' for 465, 'tls' for 587
  'smtp_user'   => 'booking@f1taxi.al',
  'smtp_pass'   => 'REPLACE_WITH_MAILBOX_PASSWORD',
  'mail_from'   => 'booking@f1taxi.al',
  'mail_to'     => 'booking@f1taxi.al', // where booking/report alerts land

  // ---- Admin panel login  (/api/admin/) ----
  'admin_user'  => 'admin',
  'admin_pass'  => 'REPLACE_WITH_A_STRONG_PASSWORD',

  // ---- WhatsApp Cloud API  (leave disabled until you have Meta access) ----
  'whatsapp_enabled'  => false,        // set to true once the token below is filled
  'whatsapp_token'    => '',
  'whatsapp_phone_id' => '',
  'whatsapp_to'       => '',           // e.g. 355682550000
];
