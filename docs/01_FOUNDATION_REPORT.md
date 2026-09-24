# STAYOS Foundation Report

**Scope:** Approved Phase 1 and Phase 2 only. Cinematic destination implementation has not started.

## Implemented
- Maven Java 21 project in `02_IMPLEMENTATION`.
- JavaFX desktop shell with JavaFX WebView.
- JavaScript bridge skeleton with Java DTO response (`HealthDto`).
- SQLite connection and schema bootstrap/migration foundation.
- Initial Java domain/service/database architecture.
- TypeScript/Vite experience-ui module with Three.js WebGL bootstrap.
- Design-token CSS foundation.
- Automated Maven and npm build/run scripts.

## Verification results

| Gate | Result | Evidence |
|---|---|---|
| Maven compile/tests | PASS | `mvn clean test`; 1 test, 0 failures, BUILD SUCCESS |
| Vite UI build | PASS | `npm install; npm run build`; Vite production bundle generated |
| SQLite read/write | PASS | `DatabaseTest`; temporary SQLite DB write/read assertion passed |
| WebView resource | IMPLEMENTED | JavaFX loads `/web/index.html` in application startup |
| JavaScript calls Java | IMPLEMENTED, manual UI verification pending | `window.javaBridge.getHealthDto()` is exposed after WebView load |
| Java returns DTO | IMPLEMENTED | Returns JSON `{status:ok,version:0.1.0}` from `HealthService` |
| Desktop launch | NOT VERIFIED in this headless agent session | Requires a graphical Windows session; launch command is `mvn javafx:run` |

## Known limitations
- The current bridge is intentionally a smoke-test skeleton. Production work must replace string concatenation with validated/versioned JSON messages and a real JavaFX `JSObject` bridge.
- The Vite/Three.js module builds independently; integration into the JavaFX WebView asset pipeline is reserved for the next approved implementation step.
- npm reported two audit vulnerabilities in transitive development dependencies. No `npm audit fix --force` was run because it may introduce breaking changes.
- No cinematic destination scene, full product screens, booking flow, operator portal, or MAX-PRO features were implemented.

## Launch commands
From `02_IMPLEMENTATION`:

```powershell
mvn javafx:run
```

For the experience-ui module:

```powershell
cd src/main/resources/web
npm run dev
```

## Foundation gate decision
Automated build and SQLite gates pass. The WebView/bridge implementation is present, but graphical launch and click-level bridge verification must be confirmed in a Windows desktop session before the foundation can be considered fully verified. No cinematic destination work should begin until that final manual gate passes.
