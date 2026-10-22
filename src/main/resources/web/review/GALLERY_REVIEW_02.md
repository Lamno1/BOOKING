# Review 02 — gallery and offers

Approval-only prototype: selection.html. Does not call booking APIs or modify existing orders. The earlier four-screen prototype remains Review 01, not the latest offer specification.

Two concept types only: R-101 Studio 32 m² / 2 guests and I-103 quad 34 m² / 4 guests. Four angles each. Images are AI concept proposals, not photographs of actual properties or verified floor plans. Minor viewpoint/layout inconsistencies must be resolved against approved measured plans. Do not reuse these as verified photos for all 15 rooms.

Generated with the built-in image generation tool, copied into this directory as studio-concept-v2.png and inn-quad-concept-v2.png. Four equal quadrants are displayed using CSS; source images are retained intact.

## Prompts used

Use case: photorealistic-natural. Asset type: conceptual hotel room gallery contact sheet for design approval, NOT evidence of a real property. Generate ONE landscape 4:3 image, exactly four equally sized photos in a seamless 2x2 grid, no margins, no text, no borders. All four show the SAME modest premium 32 square metre studio apartment concept for two adults, one double bed, kitchenette, compact sofa and private bathroom. Warm oak, linen, cream walls and restrained deep teal accents. Plausible compact apartment not a huge villa. Top left: wide room view showing one double bed and compact living/kitchen area. Top right: close architectural view of the same kitchenette and small dining table. Bottom left: matching enclosed bathroom, vanity toilet and glass shower, realistic compact scale. Bottom right: same bed and window corner from second angle, daylight through translucent curtain; no exterior sea view, no balcony, no pool. Preserve furniture design and material palette across all views. Natural architectural photography, detailed fabric, soft daylight, accurate verticals, no ultra-wide distortion. No logos, UI, captions or watermarks.

Use case: photorealistic-natural. Asset type: conceptual guesthouse room gallery contact sheet for design approval, NOT evidence of a real property. Generate ONE landscape 4:3 image, exactly four equally sized photos in a seamless 2x2 grid, no margins, no text, no borders. All four show the SAME attractive practical 34 square metre guesthouse quad room concept for four adults. Exactly TWO double beds side by side, terracotta bed runners, pale oak bed frames, cream walls, sage upholstered headboards, compact desk, luggage storage, private bathroom. More affordable and compact than an apartment. NO kitchen, NO living-room sofa, NO balcony, NO pool, NO ocean view. Top left: wide room view showing both matching double beds with walking space. Top right: desk and luggage storage near entrance, visible edge of the same beds. Bottom left: enclosed matching tiled bathroom with vanity toilet and glass shower, realistic compact scale. Bottom right: close second angle of both bed heads and bedside lighting. Preserve furniture design, room layout and material palette across all views. Natural architectural photography, detailed fabric, soft daylight through a curtained window, accurate verticals, no ultra-wide distortion. No logos, UI, captions or watermarks.

## Approval scope

offer-v2.json contains exact proposed quantities, schedules, rates and cancellation terms. D1–D8 in this revision are business decisions, not promises already made to guests. Breakfast is 60,000 VND per registered guest/night; children have the same proposed portion/rate. Welcome tea is property-funded. Paid services are never automatically added.

Example: I-103, four guests, two nights = 1,500,000 room + 480,000 breakfast package + two 650,000 dinner sets = 3,280,000 VND; eight breakfasts and four welcome teas included without a second charge. Each dinner set serves two.

Before release: approve actual rooms/gallery, property addresses/contact, service suppliers/menus/capacity, taxes/deposit/cancellation; implement server-side package pricing, immutable entitlements and fulfillment, staff support queue, payment states/email and password recovery. This prototype deliberately does not simulate successful staff delivery or payment.
