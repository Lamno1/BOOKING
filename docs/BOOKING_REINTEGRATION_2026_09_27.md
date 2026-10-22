# Booking reintegration

Read product, screen, booking, journey, concierge, operator, architecture and asset specifications in V3; inspected existing frontend and Java bridge. The cinematic gallery had displaced the booking shell. Restore property-first navigation and use SpatialJourney as an optional isolated viewer.

Implemented frontend demo: two room options, selection updates imagery, scene gallery, lighting simulation, dates/guests/enhancements quote, capacity/date/date-overlap validation, persistent demo confirmation ID, four journey chapters, check-in/check-out/cancellation actions, services, concierge suggestions, 60-minute itinerary conflict checks, reservation visibility and service confirmation on operator screen.

Validation: production build passes. `verify-booking.cjs` passes creation, selected enhancement, persistence after reload, My Stay, operator confirmation, 390px overflow and browser runtime error checks. Desktop and mobile screenshots inspected.

Assets inspected: five composite sheets in data/video intro plus existing individual representative photos. Sheets include embedded labels and illustrative inventory lists; listed 8K originals and GLB are absent. Existing photos remain explicitly illustrative and not verified property photography.

Remaining master-plan work: Java-owned pricing/availability/lifecycle and transactional SQLite persistence, Java bridge booking commands, genuine map layers and geography, independent original panorama assets, authenticated operator access, full inventory/revenue/refund handling. Demo local storage does not satisfy those production or academic architecture requirements.
