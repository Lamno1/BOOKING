# Deploying STAYOS for outside visitors

Updated 2026-10-22.

## Shape

One Java process (`com.stayos.app.ApiMain`) serves both the built web app and `/api/` on the same origin. Put a TLS reverse proxy (Caddy or nginx) in front of it; never expose the Java port directly.

```
visitor --HTTPS--> reverse proxy (443) --HTTP--> ApiMain 127.0.0.1:8080 --> SQLite (WAL) + daily backups
```

## Build and run

```powershell
cd src/main/resources/web; npm ci; npm run build          # produces dist/
cd ../../../..; mvn -o -q compile dependency:build-classpath "-Dmdep.outputFile=target/runtime-classpath.txt"
$env:STAYOS_DATABASE='D:/stayos/data/stayos-web.sqlite'
$env:STAYOS_WEB_ROOT='D:/stayos/web/dist'
$env:STAYOS_ALLOWED_ORIGINS='https://your-domain.vn'
$env:STAYOS_SECURE_COOKIE='true'
$env:STAYOS_TRUST_PROXY='true'
java -cp "target/classes;<runtime-classpath>" com.stayos.app.ApiMain
```

| Variable | Default | Production |
|---|---|---|
| `STAYOS_BIND` | 127.0.0.1 | keep 127.0.0.1 behind the proxy |
| `STAYOS_PORT` | 8080 | any free port |
| `STAYOS_WEB_ROOT` | unset (API only) | path to `dist/` |
| `STAYOS_ALLOWED_ORIGINS` | dev ports only | your https origin(s) |
| `STAYOS_SECURE_COOKIE` | false | **true** (HTTPS only cookie) |
| `STAYOS_TRUST_PROXY` | false | true only behind your own proxy |
| `STAYOS_RATE_LIMIT` | 1200 / min / IP | raise if many guests share one carrier IP |
| `STAYOS_BACKUP_DIR`, `STAYOS_BACKUP_KEEP` | data/backups/auto, 14 | copy backups off the machine too |
| `STAYOS_ADMIN_PASSWORD` | unset | set once to create the admin, then remove |
| `STAYOS_DEMO` | false | **never true** in production |

Example Caddyfile:

```
your-domain.vn {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8080
}
```

## What is protected (and tested in `SecurityTest`)

- Passwords: PBKDF2-SHA256, 600 000 iterations, per-user salt; session tokens stored only as SHA-256; HttpOnly + SameSite=Lax cookie, `Secure` when configured.
- Password guessing: 20 sign-in attempts / min / IP, and 8 wrong passwords lock that account for 15 minutes regardless of IP. Unknown emails cost the same hash time, so timing does not reveal which accounts exist.
- Flooding: every IP is limited per minute (429 + Retry-After); slow clients are cut after 30 s (`sun.net.httpserver.maxReqTime`); at most 2 000 open connections; request bodies over 16 KB rejected.
- Cross-site requests: browser Origin must be allowed or same-origin; JSON content type required for writes.
- Headers: CSP (`script-src 'self'`, no framing), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP. No third-party scripts or fonts are loaded.
- Static files: only files inside `STAYOS_WEB_ROOT`; traversal attempts (`..`, encoded, backslash) return 404.
- Data access: every guest query is filtered by owner; other people's records answer 404; admin routes re-check the role in the service.

## Measured capacity (2026-10-22, one laptop, SQLite)

Closed-loop load, 50 clients sending back-to-back requests (far above normal browsing):

| Endpoint | req/s | p95 |
|---|---|---|
| availability (all rooms) | ~1 060 | 79 ms |
| guest state (signed in) | ~4 460 | 18 ms |
| room calendar | ~4 720 | 18 ms |
| guest state while others sign in | ~4 040 | 22 ms (was 165 ms before the sign-in fix) |

Frontend: 165 fps scrolling on desktop and on a 4× CPU-throttled phone profile, no frame over 7 ms; LCP ≈ 0.85 s; JS ≈ 105 KB gzip.

A homestay or small hotel site is nowhere near these limits. The real ceiling is one machine and one SQLite file: for several properties with heavy traffic, move to PostgreSQL and run more than one instance (sessions and rate limits would then need a shared store).

## Operations

- Health: `GET /api/health` runs a query on the ledger and answers 503 if the database is unavailable; point an uptime monitor at it.
- Access log: one line per API call on stdout (time, method, path, status, ms); no query strings, bodies, cookies or IP addresses. `STAYOS_ACCESS_LOG=off` disables it.
- Password reset without email: the guest calls the hotline; staff verify identity and press "Cấp mã đặt lại" in Tài khoản; the 10-character code is valid 30 minutes, used once, stored only as a hash, and wrong codes count toward the account lockout. Issued codes are written to `account_audit`.
- Startup refuses public mode (`STAYOS_BIND` not loopback, `STAYOS_SECURE_COOKIE` or `STAYOS_TRUST_PROXY` set) while any admin still uses a demo default password.
- Off-site backups: set `STAYOS_BACKUP_DIR` to a folder synced to another machine or cloud drive.

## Not done yet

- Admin password: the main server's admin still uses the published demo password. Change it in Tài khoản before going public (the server refuses to start in public mode until then).
- Address: street and number are not set; city (TP. Hồ Chí Minh) and hotline (0335858424) are.
- Photos: AI illustrations exist for Studio and Phòng bốn only; other room types show the amenity diagram. Real photos should replace all of them.
- The walking tour service is paused (its route was in Vũng Tàu) until a Ho Chi Minh City offer is confirmed; prices of other services are unchanged and still need the owner's confirmation.
- Payments: none; the policy text says no money is collected online.
- Email (confirmations, self-service reset): needs an SMTP or mail API account.
- Legal: the privacy policy page is a draft to be reviewed and completed with the legal entity name, tax code and address.
