# Booking backend handoff — 03/10/2026

## Result

The 15-room booking page now uses Java + SQLite for accounts, booking inventory,
service requests and an append-only event history. Client storage contains only
the room/date draft. Existing localStorage demos are preserved but not imported:
their ownership and quoted prices were not server-verified.

## Source

- API: src/main/java/com/stayos/auth/AuthServer.java
- Accounts: src/main/java/com/stayos/auth/AuthService.java
- Booking transactions: src/main/java/com/stayos/booking/BookingService.java
- Headless entry: src/main/java/com/stayos/app/ApiMain.java
- Start: scripts/start-api.ps1
- Catalog authority: src/main/resources/web/src/inventory.json
- Frontend: src/main/resources/web/src/booking.jsx, auth.js, booking.css
- Integration tests: src/test/java/com/stayos/BookingApiTest.java

Gson 2.13.2 parses/serializes JSON instead of the previous regex parser.
Dependency source: https://github.com/google/gson/releases/tag/gson-parent-2.13.2

## Verified

- Guest cannot read another guest's records or access the admin endpoint.
- Server computes room/service amounts and validates capacity and dates.
- Two simultaneous attempts for the same room/dates produce one success and
  one conflict. Repeating a successful request ID returns the original booking.
- Booking, service updates and their history are committed together.
- Passwords containing quotes, slashes and whitespace round-trip correctly.
- Password change revokes all sessions. Logout revokes the current session.
- Legacy plaintext password column is migrated and removed, including its
  original NOT NULL constraint. Registration works after migration.
- Local browser flow: guest login, six-person filter, Panorama booking with
  airport transfer, reload, admin login, service confirmation.
- Responsive checks at 390, 768 and 1440 px: no document horizontal overflow.
- Evidence: `booking-admin-desktop.jpg` and `booking-admin-mobile.jpg`.
- Read-only live API smoke: `node verify-booking.cjs` from the web directory.
- Demo booking `ST-B0EC1463` was cancelled after UI verification to release
  Panorama availability. Its booking/service history remains available for review;
  the desktop evidence was captured before cancellation.

## Remaining boundaries

The API uses a local SQLite file, not a hosted service. Payments, email verification,
email-based recovery and public HTTPS deployment remain unconnected. Demo account
creation is opt-in. The startup password only seeds a previously absent admin;
it does not reset an existing account. The 112-suite Tidal tour remains separate
from this 15-room catalog. Photographs and prices are illustrative.

Do not treat client-side visibility as authorization; all private reads and
mutations are checked by the API. Do not auto-promote existing guest accounts
based on an environment email.
