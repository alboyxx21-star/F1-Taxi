# F1 Taxi — Backend API (PHP + MySQL)

Small PHP backend that runs on the **same f1taxi.al hosting** as the website.
It stores bookings, problem reports and newsletter signups in MySQL, emails an
alert to `booking@f1taxi.al`, and (optionally) sends a WhatsApp message.

There is **no build step and no SSH needed** — just upload the files.

## Endpoints
| Method | Path                     | From                          |
|--------|--------------------------|-------------------------------|
| POST   | `/api/booking.php`       | Book-a-Taxi form + booking modal |
| POST   | `/api/report.php`        | Contact "report a problem" form  |
| POST   | `/api/newsletter.php`    | Newsletter band               |
| GET    | `/api/admin/`            | Password-protected dashboard  |

All POST endpoints accept JSON and return `{ "ok": true, ... }`.

## One-time setup

1. **Create the database** — Plesk → *Databases* → *Add Database*. Note the DB
   name, user and password.
2. **Import the tables** — open that database's *phpMyAdmin* → *Import* →
   choose `schema.sql` (or paste it into the *SQL* tab) → run.
3. **Create the secret config** — copy `config.local.example.php` to
   **`config.local.php`** and fill in:
   - the MySQL name / user / password from step 1,
   - the mailbox password for `booking@f1taxi.al`,
   - a strong `admin_pass` for the dashboard,
   - (optional) the WhatsApp token / phone-id when ready.
   `config.local.php` is **git-ignored** — it must never be committed.
4. **Upload** the whole `api/` folder to `httpdocs/api/` via FTP or Plesk File
   Manager. Make sure `config.local.php` is uploaded too (it won't be in git).
5. **Test:** open `https://f1taxi.al/api/admin/` and log in with `admin_user` /
   `admin_pass`. Submit a booking on the site and confirm it appears.

## Notifications
- **Email** is sent over SMTP (`f1taxi.al:465`, SSL, `booking@f1taxi.al`). If SMTP
  fails it falls back to PHP `mail()`.
- **WhatsApp** uses the Meta Cloud API and is only attempted when
  `whatsapp_enabled` is `true` and the token/phone-id/recipient are set.
  ⚠️ The Cloud API can only send **free-form** text to a number that messaged
  your business number within the last 24h; outside that window Meta requires an
  **approved message template**. Also, temporary tokens expire — use a
  **permanent** System-User token for production.

## Security notes
- `config.local.php` holds all secrets and is git-ignored + blocked by
  `.htaccess`. Never put real secrets in `config.local.example.php`.
- Because the WhatsApp token / passwords were shared in plain text during setup,
  it's wise to **rotate them** once everything works (regenerate the WhatsApp
  token, change the DB/admin passwords).
- Requests are same-origin; CORS is limited to `https://f1taxi.al` /
  `https://www.f1taxi.al`.
