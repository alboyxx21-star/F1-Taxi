<?php
/* Single shared PDO (MySQL) connection. */
function db(array $config): PDO {
  static $pdo = null;
  if ($pdo === null) {
    // Accept "localhost", "localhost:3306" or "127.0.0.1:3306".
    $host = $config['db_host'];
    $port = '';
    if (strpos($host, ':') !== false) {
      list($host, $port) = explode(':', $host, 2);
    }
    $dsn = "mysql:host={$host};" . ($port !== '' ? "port={$port};" : '')
         . "dbname={$config['db_name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
  }
  return $pdo;
}
