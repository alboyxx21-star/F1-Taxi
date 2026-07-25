-- ============================================================
--  F1 TAXI — database schema
--  Import once into your MySQL database (Plesk → Databases →
--  phpMyAdmin → Import, or the SQL tab).
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  created_at  DATETIME     NOT NULL,
  source      VARCHAR(30),
  service     VARCHAR(20),
  name        VARCHAR(120),
  phone       VARCHAR(40),
  from_addr   VARCHAR(200),
  to_addr     VARCHAR(200),
  ride_date   VARCHAR(20),
  ride_time   VARCHAR(20),
  passengers  INT,
  price       VARCHAR(20),
  flight      VARCHAR(40),
  note        TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  created_at   DATETIME     NOT NULL,
  name         VARCHAR(120),
  email        VARCHAR(150),
  booking_ref  VARCHAR(60),
  issue_type   VARCHAR(60),
  message      TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscribers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  created_at  DATETIME     NOT NULL,
  email       VARCHAR(150) UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
