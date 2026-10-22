# TS-1501 — studio art pass, 2026-10-03

## What changed

TS-1501 now loads an actual Blender-authored glTF scene in the existing tour.
The sofa/cushions, draped bed linen, pleated curtains, joinery, window frames,
balcony furniture and imported detailed props replace its old procedural room
only after the complete asset has loaded. Other rooms remain unchanged.

The source scene has measured 2K PBR textures and Cycles lighting. Its opaque
architecture uses a separate UV2 atlas with baked indirect illumination in the
browser. The atlas is denoised, stored as linear half-float EXR, and correctly
reoriented for glTF UVs. Furniture still uses realtime lighting; this is not the
same renderer as the offline Cycles stills.

The WebP export initially exposed an actual Blender issue with grayscale JPEG
roughness maps. The exporter now expands those images before encoding and
rejects glTF files with missing image references or lightmap UVs.

Asset: **196 meshes, 302,108 triangles, 26 embedded images**, GLB 13,740,452 bytes.
Indirect map: 8,946,002 bytes. Approximately 22.7 MB combined, lazy-loaded only
for TS-1501. This is still a significant mobile download, not a finished budget.
The procedural tour remains available during slow/failed loads.

No manifest, room ID, room position, six camera coordinates, booking state model
or main booking-app implementation was rewritten. No AI image was installed as
evidence of 3D quality. Source, licence records and build instructions live in
[the studio asset folder](../assets/tidal1501/README.md).

## Evidence

- Before, same P02 camera: `src/main/resources/web/qa-tidal-suite-TS-1501-living.png`.
- Browser after: `src/main/resources/web/qa-studio-1440-living.png` and `qa-studio-1440-bedroom.png`.
- Tablet/mobile: corresponding `qa-studio-768-*` and `qa-studio-375-*` files.
- Offline Cycles, **not browser captures**: `assets/tidal1501/renders/P02-cycles.png`, `P04-cycles.png`.
- Actual interaction recording: `src/main/resources/web/qa-studio-tour.webm`.
- Editable packed scene: `assets/tidal1501/TS-1501-studio.blend`.

## Verification

The browser-qa skill informed the three-breakpoint, keyboard/touch, network,
console and fallback checks. Full results: `src/main/resources/web/qa-studio-results.json`.

- Production build passes; Vite still warns about the ~1 MB uncompressed Tidal JS chunk.
- Manifest/geometry checks pass for 112 rooms, 672 world camera nodes and 240 template routes.
- Six studio camera points and 30 directed routes checked against the actual evaluated Blender meshes, at 4 cm sampling. Minimum sampled eye clearance is about 14.2 cm. This is not a full-body collision or building-code check.
- Studio tour passes at 1440, 768 and 375 px; six nodes, keyboard/touch, room switching and date preservation.
- Delayed model load preserves the visible fallback and current camera after replacement.
- Failed model or lightmap requests preserve the procedural tour.
- No console errors or failed responses in normal studio journeys. Deliberately aborted requests are separately tested, not hidden as successes.
- Existing main-app booking demo regression passes: booking, add-ons, persistence, My Stay, operator confirmation and mobile overflow.

## Honest acceptance status

**Suitable for local review; not accepted as reference-level photorealism.**
There is no approved visual baseline, so automated visual regression remains
INCONCLUSIVE. Axe, screen-reader and field Core Web Vitals have not been measured.
Mobile viewport checks are desktop-browser emulation, not testing a physical phone.

The remaining visual gap is concrete: contact/bounced lighting on furniture,
physically convincing glass/reflections, more finished cloth and joinery detail,
and the exterior resort/view. The resort and other 111 suites have not received
this art pass. Tidal booking remains a preserved selection/date draft, not live
availability/pricing/payment. Finishing TS-1501 visually and reducing runtime
cost should precede propagating this asset approach to the other room templates.
