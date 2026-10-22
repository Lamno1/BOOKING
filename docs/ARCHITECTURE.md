# STAYOS architecture (for developers)

Updated 2026-10-22. Read this first; it says where each feature lives and where a change goes.

## Layout

```
src/main/java/com/stayos/
  app/        ApiMain (web API entry point), StayosApp (desktop JavaFX shell)
  http/       ServerConfig (env settings), Router (route table), StaticSite (serves the built web app), SecurityHeaders
  auth/       AuthServer (HTTP: routes, CORS, rate limits, cookies), AuthService (accounts, PBKDF2, sessions, lockout)
  booking/    BookingService  facade: the only class the HTTP layer calls; holds the lock
              Ledger          SQLite connection, schema, transactions, history events, shared records
              Feature         base class giving each feature short names for Ledger operations
              Rooms           availability, room calendars, room status board
              Reservations    create, arrival details, status changes, date-change quotes
              ServiceRequests extra services (classic and package catalog)
              SupportDesk     support tickets, date-change approval
              Reviews         verified-stay reviews, replies, moderation
              AccountViews    what an account reads (state), saved rooms, staff notes
              BookingOffer    package offer pricing from review/offer-v2.json
  database/   LedgerBackup (daily snapshots)

src/main/resources/web/src/
  app/              booking.jsx (guest app entry), admin.jsx (staff console entry)
  shared/           api.js (HTTP client), catalog.js, catalog-contract.js, booking-domain.js, icons.jsx, data/inventory.json
  styles/           global guest styles
  features/search/  home, search, results, room detail, calendar, compare, checkout draft
  features/trips/   trip page: hero, cancellation card, trip list, arrival details, overview
  features/services/ extra services for a stay
  features/support/ chat box (SupportChat), automatic assistant (support-assistant.js), date-change panel, receipts
  features/reviews/ public reviews and the review form
  features/admin/   staff console panels: today, bookings, support queue, reviews, staff notes
```

Rule of thumb: UI in `*.jsx`, rules and calculations in a `*-domain.js` / `*-assistant.js` file next to it with no React, so they are unit tested in `tests/`.

## Request path

Browser → `shared/api.js` → `AuthServer` (origin check, rate limit, JSON parse) → `Router` match → `BookingService` (synchronized) → feature class → `Ledger` (SQLite, one transaction, history event).

Every money or availability decision is made on the server. The client shows quotes; the server recomputes and rejects a stale `expectedTotal` with 409.

## Adding an endpoint

1. Put the rule in the feature class (e.g. `SupportDesk`). Use `transaction(...)`, `find(...)`, `access(user,row)` and `event(...)`.
2. Add a one-line delegate in `BookingService`.
3. Register the route in `AuthServer.routes()` under its feature group. Choose `Access.PUBLIC` only on purpose: `RouterTest.onlyCatalogAndSignInRoutesArePublic` lists every public route and fails when a new one appears.
4. Call it from `shared/api.js`. `RouterTest.everyApiPathTheWebAppCallsHasARoute` fails if the web app calls a path the server lacks.
5. Test: Java in `src/test/java/com/stayos/BookingApiTest.java`, domain logic in `src/main/resources/web/tests/*.test.mjs`.

## Data rules that must not be broken

- No invented data: no fake reviews, scarcity, prices or addresses. Fields the business has not confirmed (address, parking, phone, photos) stay `null` with a status text, and the UI and assistant say "chưa xác nhận".
- The automatic assistant (`features/support/support-assistant.js`) answers only from the catalog, policy snapshot and the signed-in guest's own bookings. Anything else goes to staff. It never promises an exception (early check-in, extra bed) or adds a charge.
- Guest data is scoped by owner on the server (`rows(table, user.email())`, `access(user,row)` returns 404 for other people's records).
- Staff notes live in their own table and are only returned in the admin state.

## Tests

- Web: `cd src/main/resources/web && npm run test:booking` (builds, then runs `node --test`; list in package.json).
- Java: `mvn -o test` from `02_IMPLEMENTATION` (API behaviour, security, route contract).
- Load probe used for sizing: `node load.mjs <api> <concurrency> <seconds>` (kept in the session scratchpad; see DEPLOYMENT.md for figures).
