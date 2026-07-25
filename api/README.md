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

## Abuse protection
Built into `lib.php` and applied to every public endpoint — no setup needed.
Counters are tiny JSON files in the system temp dir (`sys_get_temp_dir()`), so
nothing extra is provisioned. All checks **fail open**: if the temp dir can't be
written, protection quietly no-ops rather than blocking real customers.

- **Honeypot** — each form has a hidden `hp_url` field. Real users never see it;
  bots fill every field. Any submission with `hp_url` set gets a *fake* success
  so the bot can't tell it was filtered.
- **Time-trap** — the frontend sends `elapsed_ms` (time on page before submit).
  Anything under 1.2s is treated as a bot (same silent fake-success).
- **Rate limiting** (per IP, sliding window): booking 6 / 5 min, report 5 / 5 min,
  newsletter 5 / 10 min. Over the limit → HTTP 429 + `Retry-After`.
- **Admin brute-force throttle** — 5 failed logins from an IP → 15-minute lockout.
  A successful login clears the counter and rotates the session id.
- **Real (volumetric) DDoS** can only be absorbed at the network edge, not in PHP.
  Put the site behind **Cloudflare** (free tier: proxy the domain, enable
  "Under Attack" mode when needed) for that — the app-level limits above only
  stop application/spam floods.

## Security notes
- `config.local.php` holds all secrets and is git-ignored + blocked by
  `.htaccess`. Never put real secrets in `config.local.example.php`.
- Because the WhatsApp token / passwords were shared in plain text during setup,
  it's wise to **rotate them** once everything works (regenerate the WhatsApp
  token, change the DB/admin passwords).
- Requests are same-origin; CORS is limited to `https://f1taxi.al` /
  `https://www.f1taxi.al`.
