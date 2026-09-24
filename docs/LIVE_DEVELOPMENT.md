# STAYOS Live Development

## Start
From `02_IMPLEMENTATION`, run `.dev.ps1` (PowerShell): this verifies Java/Maven/Node, starts Vite, waits for port 5173, then launches JavaFX with `STAYOS_DEV=true`.

## Browser preview
Run `.dev-web.ps1` and open http://localhost:5173. Vite HMR updates HTML, CSS and JavaScript changes automatically.

## Restart JavaFX
Keep Vite running and run `.restart-desktop.ps1`. JavaFX reconnects to the development server.

## Debug and visual QA
In the browser, `Ctrl+Shift+D` toggles the development overlay. Use the browser DevTools console for JavaScript errors. Visual QA captures belong in `artifacts/visual-qa/`.

## Resolutions
Resize the browser or JavaFX window to 1920x1080, 2560x1440, or 3840x2160 for review.

## Production
Production loads the packaged `/web/index.html`; development loads Vite at `http://localhost:5173`.
