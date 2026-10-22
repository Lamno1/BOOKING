# STAYOS Review 01 — visual audit

Scope: approval prototype only, not a redesign deployed to the booking app. The design-system skill informed a shared token set, consistent controls, and an explicit responsive review rather than decorative effects. Scores below are an internal visual assessment, not user-research findings or accessibility certification.

## Direction

Cream paper + deep teal, restrained terracotta labels. Serif headings give a residential tone; plain sans-serif prices, forms and policy text favour scanning. Search precedes the hero; desktop gives the image 56% of the hero. Mobile puts search and image before the headline. Room types are grouped but the physical room number remains explicit through checkout.

No gradient, glass panel, animation or generated schematic stands in for missing hotel evidence. Photos are explicitly moodboard references pending approval. No dark theme is promised. No mockup calls a booking API.

## Ten-dimension audit

| Dimension | Score / 10 | Evidence / remaining action |
| --- | --- | --- |
| Color consistency | 8 | `tokens.css:1` defines ink/paper/muted/border; consolidate secondary surface hex values in `prototype.css:3` before production. |
| Typography hierarchy | 8 | `prototype.css:2` defines h1/h2/h3 and body/captions. Test a licensed Vietnamese serif across devices before release. |
| Spacing rhythm | 8 | 16/20/24/32px groups in `prototype.css:3`; normalize minor exceptions when approved. |
| Component consistency | 8 | Shared search, package, quote and policy renderers in `prototype.js:17`; keep a single implementation when moving to React. |
| Responsive behaviour | 8 | Desktop 1440 and mobile 390 screenshot set; stacking in `prototype.css:5`. Still test real phones and intermediate widths before release. |
| Dark mode | N/A | Deliberately one complete light scheme; no half-implemented toggle. |
| Motion | 9 | No decorative movement; reduced-motion rule in `prototype.css:6`. |
| Accessibility | 7 | Native inputs, labels, focus outlines and ≥44px controls in `prototype.css:2`. Full screen-reader/contrast audit remains a release gate. |
| Information density | 8 | Search up front, grouped room cards, explicit included/extra rows; mobile summary precedes checkout fields. Policy explanations remain intentionally explicit in this review. |
| Polish | 6 | Empty states and simulated confirmation present. Real assets, network error/loading states and production form validation are not implemented in this prototype. |

## Approval boundaries

Approve composition and flow separately from real room photography and business package terms. Missing bath/view photos remain honest placeholders. The prototype should not be used as public commercial content. See the review hub for D1–D9 decisions and release checklist.
