# STAYOS Destination Vertical Slice Report

**Scope:** Vũng Tàu Cinematic Destination → Interactive Map → The Sóng Property Experience  
**Status:** Implemented; stopped for review.

## Delivered
- WebGL/Three.js animated coastal environment.
- Continuously animated water surface.
- Four independently moving boat entities with deterministic phase offsets.
- Slowly translating cloud/atmosphere layer.
- Pulsing sun/light/reflection treatment.
- Ambient camera drift while cinematic idle is active.
- Wheel zoom, +/- controls, drag pan, damped inertia, and recenter.
- POIs for The Sóng, Bãi Trước, and Bãi Sau with destination context labels.
- Smooth The Sóng focus/fly-to behavior.
- Direct input immediately exits cinematic camera ownership.
- Responsive resize handling with DPR capped at 2x for high-resolution displays.
- Reduced-motion toggle.
- Focus loss pauses rendering; focus return resumes rendering.
- Property Experience view with conceptual/representative label and lobby/rooftop/pool hotspots.

## Architecture
One coordinated requestAnimationFrame loop in `app.js` owns animation, FPS reporting, environment motion, camera damping, and rendering. WebGL renders the environment; HTML overlays provide editorial hierarchy and accessible controls. Direct wheel, drag, button, and POI input disables idle cinematic camera ownership. No image pan/zoom substitute is used.

The property view explicitly says **CONCEPTUAL PROPERTY EXPERIENCE** and **Representative spatial preview**; it is not presented as a verified digital twin.

## Performance measurements

| Target | Result |
|---|---|
| Vite build | Passing after Three.js module integration fix |
| DPR | Capped at 2x |
| Focus behavior | Render loop returns early while unfocused |
| Allocation behavior | Static meshes/entities; no per-frame mesh creation |
| Runtime FPS | Live counter appears in the lower-left status bar; hardware measurement requires a graphical session |

This agent session cannot provide honest hardware FPS values because JavaFX/WebView visual interaction is unavailable for capture. Use the visible counter during 1080p, 1440p, and 4K acceptance runs.

## Known limitations
- Geographic labels/coordinates require final provenance records before any claim is considered verified.
- The spatial property experience is representative procedural geometry/overlay treatment; no verified building digital twin or GLB is included.
- Water is a lightweight animated WebGL surface, not a physically based displacement shader.
- Property hotspot actions are presentation controls only; booking and room workflows are out of scope.
- Manual click-level verification requires a graphical Windows session.

## Review gate
No additional product screens or cinematic expansion were implemented. Review this vertical slice before proceeding.
