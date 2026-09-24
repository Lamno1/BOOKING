# STAYOS Implementation Readiness Report

**Date:** 2026-09-24  
**Status:** Intake complete — implementation intentionally not started.

## 1. Course requirements summary
The official UEH 2026–2027 final-project brief requires a Java desktop application completed in four weeks by a group of four. Required technology is Java with JavaFX or Swing, plus UML/class diagram, requirements/actors, usable GUI, OOP principles (encapsulation, inheritance, polymorphism, abstraction), testing, report, slides, AI-use log, and installation/use instructions. Persistence may use files or Firebase; SQLite is a stronger local implementation of the same requirement. Assessment weights are report/UML 20%, OOP 30%, functionality/UI 30%, teamwork/presentation 20%.

The supplied BobaPOS sample establishes a JavaFX/Maven/Java 21 baseline and conventional layered Java patterns only. It is not copied and does not define STAYOS product design.

## 2. STAYOS requirements summary
STAYOS is an immersive luxury hospitality experience platform, not a Booking.com clone. It must include a cinematic living Vũng Tàu destination, geographically anchored interactive map (wheel zoom, drag/pan, recenter, POIs, fly-to), independent ocean/wave, boat, cloud/light/reflection and ambient camera movement, spatial hotel/property exploration, immersive room experience, supporting booking, guest journey, itinerary, concierge, dining, tours, spa, transport, and hotel operator portal. Java owns domain/business logic; WebView/Three.js owns advanced presentation/rendering; SQLite is mandatory; real facts require provenance and conceptual content must be labelled.

## 3. Requirements conflicts and resolutions
| Conflict | Resolution |
|---|---|
| Conventional Java GUI vs WebGL cinematic experience | JavaFX desktop shell with controlled WebView; Java remains authority and JavaScript renders. |
| File/Firebase course wording vs SQLite product rule | SQLite via Java repositories and migrations; document as deliberate local persistence extension. |
| Four-week scope vs MAX-PRO scope | Phase delivery around a demonstrable destination vertical slice; difficult features are recorded with blocker, attempt, fallback and quality impact, never silently deleted. |
| Mockup imagery vs factual geography | Mockups are visual targets only; provenance-tagged records and verified coordinates govern factual claims. |
| JavaFX and JS input/camera ownership | Priority is accessibility, user input, functional transition, guided narrative, ambient motion. User input yields scripted motion immediately. |
| 3D cost vs course hardware | ULTRA/BALANCED/SAFE profiles, DPR cap, disposal, throttling and reduced motion preserve a living scene at lower cost. |

## 4. Environment status
All requested tools are present; no system software was installed: OpenJDK 21.0.12.1 LTS, javac 21.0.12.1, Maven 3.9.9, Node.js v24.16.0, npm 11.13.0, Git 2.54.0.windows.1, Windows 11 amd64. No current environment blocker.

## 5. Technical architecture
```text
JavaFX desktop shell
  -> Java application/domain services -> SQLite repositories/migrations
  -> validated versioned JSON bridge -> WebView HTML/CSS/JavaScript
     -> scene state machine, central motion scheduler, map/camera, Three.js/WebGL, overlays
```
Java is authoritative for domain state, validation, provenance, persistence, booking and service rules. JS owns transient presentation state, rendering, animation and camera. JS cannot write SQLite or decide business validity.

## 6. Final directory structure
```text
02_IMPLEMENTATION/
├─ pom.xml, README.md, run.bat
├─ data/stayos.sqlite, migrations/
├─ docs/00_INTAKE_REPORT.md, UML/, AI_USAGE_LOG.md, DATA_PROVENANCE.md, ANIMATION_ENGINE.md, QA_CHECKLIST.md
├─ src/main/java/com/stayos/{App.java,config,domain,application,infrastructure,presentation,shared}
│  ├─ domain/{destination,property,room,booking,journey,concierge,experience,operator}
│  ├─ infrastructure/{database,repository,provenance}
│  └─ presentation/{shell,bridge}
├─ src/main/resources/{web/{index.html,css,js/{bridge,motion,scenes,map,ui},assets},styles}
└─ src/test/{java,resources}
```
Course and plan directories remain read-only.

## 7. Java/OOP architecture
Use immutable value objects (`GeoCoordinate`, `Money`, `DateRange`, `ProvenanceRecord`), abstract `ExperienceItem` with polymorphic dining/tour/spa types, `ServiceRequest` specializations, generic `Repository<T,ID>`, interfaces (`BookingPolicy`, `AvailabilityProvider`, `ProvenanceValidator`, `SceneCommandGateway`), application services and explicit state/transition models. This creates visible evidence of encapsulation, inheritance, polymorphism, abstraction and composition in Java.

## 8. WebView/JavaScript architecture
One JavaFX WebView receives a versioned bridge object. Messages have command/event names, schema-validated payloads, correlation IDs and structured errors. Java-to-browser commands include load destination, focus POI, open property, quality and reduced-motion settings. Browser-to-Java events include map interaction, booking intent, service request, scene ready and performance reports. Durable state and business decisions round-trip through Java.

## 9. Rendering architecture
One central motion engine owns delta/elapsed time, visibility, pointer state, cinematic progress, camera velocity, reduced-motion and quality profile. Explicit modes: `GUIDED_CINEMATIC`, `USER_MAP_CONTROL`, `PROPERTY_WALKTHROUGH`, `ROOM_IMMERSIVE`, `UI_ONLY`, `REDUCED_MOTION`. A layered destination scene combines efficient environment/map rendering, HTML/CSS editorial overlays and Three.js where spatial depth matters. Scripted camera yields to wheel/drag/click/keyboard.

## 10. Database architecture
SQLite migrations create destinations, POIs, properties, rooms, availability, bookings, guests, experiences, service requests, itineraries, operators, provenance and audit tables. Java repositories isolate SQL from domain code; transactions protect bookings and service requests. Demo seeds are labelled and do not imply invented facts are verified.

## 11. Data provenance strategy
Every factual location/property field stores source, verification date, confidence/status and notes. Classifications are `VERIFIED`, `DEMO`, `CONCEPTUAL`, `UNVERIFIED`. UI distinguishes real Vũng Tàu geography from fictional hospitality content. Mockups/generated assets are not geographic evidence; validators block unsupported real-world claims.

## 12. Asset pipeline
Catalogue each asset with source/license, type, dimensions/format, intended scene and provenance classification. Prefer optimized WebP/AVIF, compressed geometry, responsive sizes and lazy loading. 3D scenes own explicit texture/material disposal. Five mockup PNGs in the plan are composition references only.

## 13. Major risks
Hybrid WebView/WebGL platform behavior, four-week scope, insufficient verified property data, camera/input conflicts, asset licensing/optimization, SQLite consistency, weak OOP visibility if logic leaks to JS, and accessibility regressions. For every difficult feature record blocker, attempted solution, fallback and quality impact.

## 14. Performance risks
GPU/CPU load, high DPR, texture memory, DOM overlays, duplicate animation loops, transitions and allocation growth. Mitigate with one scheduler, DPR cap, pools, lazy loading, disposal, visibility throttling, quality profiles and instrumentation. Validate 1920×1080 and higher where available; require five-minute stability, responsive controls and readable overlays.

## 15. Implementation phases
1. Foundation: JavaFX/WebView shell, theme, bridge, SQLite, tests.  
2. First vertical slice: Vũng Tàu living destination, map controls, provenance, POI fly-to and property preview.  
3. Property/room: spatial exploration, immersive modes, hotspots and lifecycle.  
4. Booking/guest journey: availability, booking, itinerary, concierge and services.  
5. Operator portal: metrics, occupancy, revenue, funnel and requests.  
6. Hardening: accessibility, reduced motion, performance, QA, UML, report, AI log and packaging.

## 16. Proposed first vertical slice
Destination → map interaction → POI focus → property preview. The Java desktop opens an editorial Vũng Tàu scene with at least three independent ambient layers (water, boats/wakes, cloud/light), subtle camera drift, map wheel zoom/drag/recenter, one provenance-labelled POI, cancellable fly-to and property preview. Java owns records/navigation; JS owns rendering/camera. Full booking/operator/complete 3D remain later phases, not deleted scope.

## 17. Exact acceptance criteria for first vertical slice
### Functional
- Maven launches a Java desktop app with JavaFX WebView.
- No external network is needed for the demo path.
- Java sends destination/POI/property records through a validated bridge.
- Vũng Tàu context and at least one provenance-labelled POI are visible.
- Wheel zoom, drag/pan, recenter, POI click and cancellable fly-to work.
- Property preview opens and returns to exploration.

### Motion/rendering
- Water, boat/wake and cloud/light layers move independently.
- Ambient motion is subtle but the scene never reads as static.
- Title/POI reveal has no layout shift.
- There is one central animation scheduler.
- Reduced motion replaces ambient/camera motion with restrained transitions.
- Hidden windows pause or heavily throttle decorative rendering.

### Academic/quality
- Domain/navigation rules remain in Java and JS has no persistence authority.
- Interfaces, abstract types, inheritance and polymorphism are demonstrable in Java.
- Bridge is versioned/validated/logged in development.
- SQLite migration/repository tests pass and UML covers the slice.
- Five-minute run has no growing subscribers/resources; quality profiles visibly degrade cost.
- Primary actions are keyboard reachable/readable; unsupported facts are not presented as verified.

## Blockers, dependencies and approval gate
**Blockers:** none for intake; implementation directory was empty.  
**Dependencies:** Maven resolution for JavaFX/WebView and SQLite JDBC, suitable licensed/generated assets, later verification of real-world facts.  
**Decisions:** JavaFX shell, Java-owned logic/database, WebView/Three.js presentation, SQLite, central motion engine, provenance-first data model, phased destination slice.  
**Approval gate:** do not implement application code until this report and the proposed first vertical slice are approved.
