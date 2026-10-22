# Guest operations / 20.10.2026

User-approved B overrides the old generated navy/gold visual suggestions for the guest review. Keep existing booking app styling where integration is not approved; this change supplies working guest operations, not an unapproved migration of B or commercial proposals.

Purpose: guest sends a concrete free support request tied to one booking, tracks staff response, or previews an exact price/date change before asking staff to approve. Admin operates a separate light, compact console with property filter, request queue and7day occupancy grid.

Hierarchy: selected booking identity → request type/form → confirmation ID/status → staff thread. Date change: current dates and saved total → new dates and recalculated total/difference → explicit request (current stay stays reserved until accepted). No AI guesses or auto-paid extras. No promises about payment/email delivery.

Targets1440x900 and390x844. Input16px on mobile,44px controls, visible focus and labels; status distinguishes received/in progress/resolved/approved/declined/cancelled in text, not color alone. Async loading, near-form errors and retry, empty queue and signed-out boundaries. Messages preserved after cancellation, no new requests to closed stays. Reduced-motion and printable receipt have no forced animation. Source guidance: UI/UX Pro Max request-status Submit Feedback and React async-error handling; React19-only Actions result intentionally not applied to this React18 project.

Evidence contract: exercise guest→staff→guest support; change quote/request/conflict/approval or decline, room availability and service dates rechecked; no other guest visibility; browser desktop/mobile captures. All tests write temporary SQLite, production booking history preserved. Existing catalog floor remains internal; guest-facing components omit floor until verified.
