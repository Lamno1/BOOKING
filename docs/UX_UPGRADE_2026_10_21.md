# Nâng cấp UX/UI theo mẫu ứng dụng đặt phòng — 21/10/2026

Học cách tổ chức thông tin từ Airbnb, Booking.com và Agoda; không sao chép giao diện, giữ hướng B (than ấm, xanh sage, chữ không chân). Không dùng thủ thuật ép mua: không “chỉ còn 1 phòng”, không đồng hồ đếm ngược giả, không đánh giá mẫu.

| Mẫu học được | Áp dụng trong STAYOS |
| --- | --- |
| Trang kết quả có bộ lọc dạng chip, đếm kết quả, sắp xếp (Booking.com, Airbnb) | `RoomResults`: cơ sở, có bếp, chỉ phòng còn trống, đã lưu, giá tối đa, tìm theo mã; “N phòng phù hợp · đêm · khách”; xóa bộ lọc; sắp xếp gợi ý/giá/diện tích/sức chứa |
| Hiện tổng tiền theo số đêm, không chỉ giá/đêm (Airbnb) | Thẻ phòng: giá/đêm + “Tổng N đêm · đã gồm thuế” (theo `policy.taxIncluded`) |
| Phòng hết thì gợi ý ngày khác (Booking.com) | “Tìm ngày trống gần nhất” → khoảng cùng số đêm trong 90 ngày → “Chọn ngày này” |
| Lịch trống chọn trực tiếp (Airbnb) | `AvailabilityCalendar`: 2 tháng (1 trên mobile), đêm kín gạch ngang, ngày trả có thể rơi vào đêm kín kế tiếp, khóa ngày không thể tới khi đang chọn ngày trả |
| Lưu yêu thích, xem gần đây, chia sẻ (Airbnb) | Trái tim trên thẻ và chi tiết, lọc “Đã lưu”; dải “Xem gần đây”; nút Chia sẻ (Web Share hoặc sao chép link `?room=&arrival=&departure=&guests=`), link mở đúng phòng |
| Trang chuyến đi (Booking.com “Trips”, Airbnb) | `TripHero`: “Còn N ngày đến kỳ nghỉ”, 4 bước tiến trình, lịch trình theo ngày (nhận phòng, bữa sáng đã gồm, dịch vụ, trả phòng), “Thêm vào lịch” (.ics RFC 5545), sao chép mã đơn |
| Đánh giá chỉ từ khách đã ở (Booking.com) | Khách đã trả phòng đánh giá 1 lần (1–5 sao + nhận xét); hiển thị tên gọi đầu + tháng ở; không có đánh giá thì ghi rõ, không dùng số liệu mẫu; admin ẩn/hiện kèm lý do, không sửa/xóa |
| Thanh tab dưới cùng trên mobile, thông báo toast | Khám phá / Đã lưu / Chuyến đi / Hỗ trợ / Tài khoản; toast tự ẩn 5–12 giây, có nút đóng, `aria-live` |

Sửa thêm: thanh tìm kiếm, nút tài khoản, khối tóm tắt đơn và ô nhập còn màu navy/vàng cũ → biến màu B; ngày ISO → dd/mm/yyyy; tiêu đề tiếng Anh → tiếng Việt; `window.confirm` (chặn trang) → xác nhận ngay trong dòng khi hủy dịch vụ; sơ đồ phòng tràn khung trên thẻ.

## Máy chủ

- `GET /api/rooms/{id}/calendar?from=&days=` (≤120 ngày, từ hôm nay): chỉ trả các đêm đã kín và trạng thái mở; không lộ mã đơn hay email.
- `POST /api/reviews`, `GET /api/rooms/{id}/reviews`, `GET /api/reviews/summary`, `POST /api/admin/reviews/{id}/status`. Bảng mới `stay_reviews` (chỉ thêm, `booking_id` UNIQUE).

## Kiểm thử

- Java 21 test, 0 lỗi (mới: lịch trống không lộ dữ liệu khách/đơn hủy không chặn; đánh giá chỉ sau trả phòng, 1 lần, quyền, ẩn).
- Web: build thành công, 42 test (mới: `search-domain` 6, `trip-domain` 3).
- UI trên QA 5184/8081: I-103 kín 22–23 và 25–26 → gợi ý 27–29 (bỏ qua 24 vì chỉ 1 đêm); chọn 24→25 trên lịch hợp lệ, 24→27 bị chặn; R-102 có gói: lịch trình 23–25/10 với 2 bữa sáng và set tối 18:30 chờ xác nhận; đánh giá 4 sao hiện trên thẻ (4,0 · 1 đánh giá) và chi tiết; admin ẩn cần lý do. Mobile 390×844: không tràn ngang, tab bar không che nội dung.
- Lighthouse accessibility 100: trang kết quả, chi tiết phòng có lịch + đánh giá.

Ảnh: `docs/ux-upgrade-2026-10-21/`.

## Đưa lên 8080

Sao lưu `data/backups/stayos-before-ux-reviews-20261021.sqlite`; khởi động lại đúng database, không Demo. Fingerprint 4 bảng sổ đặt phòng trước = sau (trùng mốc trong `PACKAGE_SERVICES_A11Y_2026_10_21.md`). Endpoint lịch và đánh giá phản hồi đúng.

## Đợt 2

| Mẫu học được | Áp dụng |
| --- | --- |
| Chọn khách người lớn/trẻ em bằng nút +/− (Airbnb, Booking.com) | `GuestPicker`: popover, ≥1 người lớn, tổng ≤6, trẻ em tính vào sức chứa; Esc/nhấp ngoài để đóng, trả focus về nút |
| Ngày gợi ý nhanh (Airbnb “flexible”) | Chip: Tối nay, Cuối tuần này (T6→CN; đang T6/T7 thì là cuối tuần hiện tại), Tuần sau · 3 đêm, Thêm 1 đêm |
| Trang xác nhận ngay sau đặt (Booking.com) | Khối “Đã đặt …”: mã đơn, ngày, số khách, ghi rõ chưa thu tiền/chưa gửi email; bước tiếp theo; focus chuyển tới tiêu đề một lần |
| Gỡ kẹt khi vượt sức chứa | Chi tiết phòng: “Đổi thành N khách” thay vì chỉ khóa nút |
| Extranet “hôm nay” (Booking.com) | Tab admin mặc định **Hôm nay**: khách đến/trả phòng với nút thao tác, đang lưu trú, đơn quá ngày đến chưa nhận phòng, dịch vụ chờ 48 giờ, hỗ trợ mở, đánh giá 1–2 sao, biểu đồ công suất 7 đêm |

Kiểm thử: web 47 test (thêm preset ngày/khách 2, `admin-today` 3); Java giữ 21 test. UI QA: 2 người lớn + 1 trẻ em → 3 khách, 8 phòng phù hợp; “Cuối tuần này” = 23→25/10; R-103 từ link 3 khách → “Đổi thành 2 khách” → đặt ST-F4D78D23 → khối xác nhận nhận focus. Lighthouse accessibility 100 cho admin Hôm nay (đã sửa thứ tự heading).

## Đợt 3

| Mẫu học được | Áp dụng |
| --- | --- |
| Thanh lọc dính khi cuộn (Booking.com) | Bộ lọc dính ngay dưới header (đo chiều cao thật bằng `ResizeObserver`), có nút tóm tắt “23/10 → 25/10 · 2 khách · Sửa” đưa về ô ngày |
| “Nơi này có gì cho bạn” (Airbnb) | Lưới tiện nghi có icon SVG (bếp, sinh hoạt, phòng tắm, điều hòa, Wi-Fi, bàn làm việc, sức chứa) |
| Cơ sở phản hồi đánh giá (Booking.com, Airbnb) | `POST /api/admin/reviews/{id}/reply`: một phản hồi công khai/đánh giá, sửa được; nội dung khách không đổi; hiển thị “Phản hồi từ STAYOS” |
| Wishlist theo tài khoản (Airbnb) | Bảng `stay_saved` (tối đa 30); đăng nhập thì gộp danh sách trên máy vào tài khoản một lần; đăng xuất xóa danh sách trên máy để người dùng sau không thừa hưởng |

Sửa: `admin.css` thiếu `.sr-only` (nhãn ẩn trong bảng đánh giá bị lộ).

Kiểm thử: Java 22 test (thêm wishlist riêng tư/idempotent/giới hạn; phản hồi đánh giá chỉ admin, không đổi nội dung khách); web 47 test. UI QA: lưu I-202 khi chưa đăng nhập → đăng nhập → `GET /api/saved` = `["beach"]`, trái tim vẫn bật.

Đưa lên 8080: sao lưu `data/backups/stayos-before-wishlist-replies-20261021.sqlite`; thêm bảng `stay_saved`; fingerprint sổ đặt phòng trước = sau = mốc ban đầu.

## Đợt 4

| Mẫu học được | Áp dụng |
| --- | --- |
| Thanh bước trong checkout (Booking.com) | “1 Chọn gói & dịch vụ → 2 Xem lại → 3 Xác nhận”, `aria-current="step"` |
| Phân rã giá mở được (Airbnb “Show price breakdown”) | Thanh tổng có “Chi tiết giá · N đêm”: giá × đêm, nâng gói, quyền lợi “Đã gồm”, từng dịch vụ, tổng · đã gồm thuế |
| Lời trấn an cạnh nút đặt (“You won't be charged yet”) | “Chưa thu tiền · hủy miễn phí đến hết ngày đến” lấy từ chính sách cơ sở, không viết cứng |
| Gọn phần đầu | Khối bối cảnh phòng/ngày/khách dạng thẻ một dòng + nút sửa; thẻ gói nhỏ hơn trên mobile |
| Chủ đề hỏi nhanh khi nhắn cơ sở (Booking.com) | Chip Nhận phòng sớm / Thêm khăn / Wi-Fi (khi có đơn đang hoạt động), Đỗ xe / Trẻ em & giường phụ (luôn có); điền sẵn loại và câu mẫu, khách vẫn tự sửa và gửi |

Sửa: thanh tổng checkout nền chưa đặc, lộ nội dung khi cuộn.

Kiểm thử: web 47 test; Lighthouse accessibility 100 checkout; mobile 390×844 không tràn ngang.

## Đợt 5

| Mẫu học được | Áp dụng |
| --- | --- |
| Ô tìm kiếm ngay màn hình đầu (Booking.com, Airbnb) | Desktop/tablet: thẻ tìm kiếm nổi đè mép dưới ảnh hero; nhãn “CONCEPT AI” chuyển lên góc trên để không bị che; mobile giữ bố cục thường |
| Lịch dùng bàn phím (mẫu date picker WAI-ARIA) | Roving tabindex: một ngày nhận Tab; ←→ theo ngày, ↑↓ theo tuần, Home/End đầu/cuối tuần; bỏ qua ngày không chọn được; tự chuyển tháng; luôn có một ngày nhận Tab kể cả khi ngày đang giữ bị khóa |
| Từ lịch sử đến chuyến đi | Mỗi đơn trong Tài khoản có “Xem chuyến đi →” mở đúng đơn |

**Lỗi tìm thấy và đã sửa (do chính tính năng lưu nháp đợt trước):** checkout tự mở đè lên trang khác. Nguyên nhân: cờ “đang mở” trong nháp không giới hạn thời gian, link phòng khác vẫn mở checkout cũ, chuyển trang không đóng checkout. Sửa: chỉ tự mở lại khi nháp ≤30 phút (tải lại/đóng nhầm); không tự mở khi vào bằng link phòng; `navigate()` đóng checkout. Test mới khóa hành vi 29 phút mở / 31 phút đóng nhưng vẫn giữ lựa chọn.

Kiểm thử: web 48 test, Java 22 test; Lighthouse accessibility 100 trang Tài khoản; bàn phím trên lịch I-103: 27/10 → ← 26/10 → ↓ 02/11.

## Giới hạn

- Lịch trống tải 120 ngày; xa hơn cần mở rộng khi có nhu cầu.
- “Xem gần đây” vẫn chỉ nằm trong trình duyệt; “Đã lưu” đã đồng bộ theo tài khoản (đợt 3).
- Chưa thử Web Share trên điện thoại thật; trên desktop dùng sao chép link.

## Round 6 (2026-10-22): compare, review breakdown, printable trip

Frontend only. No Java or database change, so the main API (8080) was not restarted.

- **Compare rooms (pattern from Booking.com / Agoda).**
  - "So sánh" button on every result card; up to 3 rooms. A 4th is refused with a message instead of silently replacing one.
  - Floating tray (desktop: room chips; phone: one row "2/3 phòng · Xóa · So sánh", above the tab bar).
  - Side-by-side table: price per night, room total for the chosen nights, area, max guests, beds, availability for the chosen dates, and every amenity. Leading cells are tinted; full ties are not marked. Criteria column stays pinned when the table scrolls on a phone.
  - Only catalog facts and the live availability check. Kept for this visit only (no storage).
  - `search-domain.js`: `toggleCompare`, `compareRows`, `COMPARE_MAX`; `CompareRooms.jsx`.
- **Review section (pattern from Airbnb / Booking.com).**
  - Star breakdown bars (5→1) that double as a filter; sort by newest / highest / lowest; "Xem thêm" in pages of 4.
  - `reviews-domain.js`: `ratingBreakdown`, `sortReviews` (stable, newest first among equal scores).
- **Printable trip page.** "In / lưu PDF" on the trip card (any status). The print stylesheet hides header, tab bar, buttons, forms, the date-change panel and the review prompt, and prints the trip card, itinerary, booking summary and stay details in black on white.
- **Bug fixed (from round 3).** On the stay page `TripHero` and `DateChangePanel` used the same React key, so the trip card was duplicated each time the page re-rendered (seen as 2–3 copies after switching pages). Keys are now `trip-…` and `change-…`.

Checks: 52 web tests and 22 Java tests pass. Lighthouse accessibility 100 on results with the tray, the open compare table, and room detail with 6 reviews. QA on 5184/8081 with 6 reviews seeded through the real booking → check-in → check-out → review flow on the temporary QA database. 390px phone: no horizontal scroll, tray does not overlap the tab bar.

Screenshots: `r6-compare-dialog.png`, `r6-reviews-breakdown.png`, `r6-print-preview.png`, `r6-compare-tray-mobile.png`.

## Round 7 (2026-10-22): expected arrival time and special requests

Pattern from Booking.com / Agoda ("Your arrival time", "Special requests").

- **Checkout (review step):** optional "Giờ đến dự kiến" (14–16, 16–18, 18–20, 20–22, 22–24, after midnight, or "Chưa rõ") and "Yêu cầu đặc biệt" (≤300 characters, live counter). The copy says requests depend on availability, are free, and must not contain payment or ID details.
- **Trip page:** a "Giờ đến và yêu cầu" card. The guest can add or edit until check-in. Focus moves into the form on open and back to "Sửa" after saving or cancelling. The itinerary's check-in line adds "bạn dự kiến đến …".
- **Admin:**
  - "Hôm nay" arrivals are sorted by expected arrival, with no-window guests last and marked "Chưa báo giờ đến".
  - Requests are shown in italics on the arrivals list and the bookings table.
- **Server (`BookingService`):**
  - `applyArrivalDetails` validates the window against `ARRIVAL_WINDOWS` and the text at ≤300 characters.
  - `POST /api/bookings/{id}/arrival` lets the owner or staff update the details while the booking is CONFIRMED; any other status returns 409. It logs an `ARRIVAL_DETAILS` event and never changes price or dates. Other guests get 404.
  - The fields are not exposed on public endpoints.
- Test: `arrivalWindowAndSpecialRequestsAreValidatedEditableUntilCheckInAndPrivate`. Web tests also cover arrival ordering and the itinerary text.

Deploy:
- Backup `data/backups/stayos-before-arrival-details-20261022.sqlite`.
- The 4-table fingerprint was identical before and after restarting 8080.
- Existing bookings simply have no window yet.

Checks:
- 54 web and 23 Java tests pass.
- Lighthouse accessibility 100 on admin Today and on the trip page with the editor open.
- Full checkout in QA saved `20-22` plus the request, at total 1.200.000 ₫ unchanged.

Screenshot: `r7-admin-today-eta.png`.

## Round 8 (2026-10-22): reservation search and CSV export (admin)

Pattern from the Booking.com / Agoda extranet reservation list. Frontend only; no Java or database change.

- **Search** by booking id, guest name, email, room or special request. Vietnamese accents are ignored ("nguyen dat" finds "Nguyễn Văn Đạt"); every word must match.
- **Status chips** (Tất cả, Đã xác nhận, Đang lưu trú, Đã trả phòng, Đã hủy) with counts that follow the search.
- **Sort:** newest booking first (default), nearest arrival, latest arrival.
- **Xuất CSV (N):** exports exactly the rows on screen. UTF-8 with BOM so Excel shows Vietnamese; money as plain đồng integers; cells starting with `= + - @` are prefixed with `'` so guest-typed text can never run as a spreadsheet formula. The panel notes that the file holds guest emails and requests.
- Empty result offers "Bỏ lọc". `AdminBookings.jsx`, `admin-bookings-domain.js`.

Checks:
- 58 web tests pass, 4 of them new (`admin-bookings.test.mjs`).
- QA on 5184/8081: "khach kiem thu I-103" → 1 booking. Sorting by latest arrival works, and the empty filter disables export. The CSV header and rows are correct, including the arrival window and quoted request.
- Lighthouse accessibility 100.

Screenshot: `r8-admin-bookings.png`.

Also fixed in round 8 (found while taking the missing round 7 screenshot):
- The guest header on secondary pages was 96% opaque, so text scrolled beneath it showed through. It is now solid.
- The trip-page arrival form repeated its heading as the fieldset legend. The legend is now screen-reader only there; checkout keeps it visible.

Screenshot added: `r7-arrival-editor.png`.

## Round 9 (2026-10-22): cancellation deadline on the trip page

Pattern from Booking.com / Agoda ("Free cancellation until …" with a timeline). Frontend only.

- The bare "Hủy đặt phòng" button at the bottom of the trip page is now a card.
  - **Heading:** "Hủy miễn phí đến 23:59 ngày dd/mm/yyyy".
  - **Countdown:** "Còn N ngày để hủy trực tuyến (giờ Việt Nam)", or "Hôm nay là ngày cuối…" on the arrival day.
  - **Timeline:** Đã đặt → Hạn hủy · ngày đến → "Sau đó: liên hệ hỗ trợ".
  - It also says the simulated booking took no money, so there is nothing to refund.
- "Miễn phí" is shown only when the booking's own policy snapshot says so. Older bookings without a snapshot read "Hủy trực tuyến đến …".
- After the deadline (no check-in yet), the card says online cancellation has closed and offers "Nhắn hỗ trợ". Before, the button stayed and the server answered 409.
- The rule mirrors `BookingService`: cancellation is allowed while CONFIRMED and today (Vietnam time) ≤ arrival. Computed in `cancellationWindow` (`trip-domain.js`).
- The card is hidden in print.

Checks:
- 59 web tests pass. The new test covers the deadline, the last-day case, closing at 00:10 the next day, "free" only with a policy, and no card after check-in.
- QA: today's booking shows "Hôm nay là ngày cuối"; the 23/10 booking shows "Còn 1 ngày"; the cancel dialog still opens and "Giữ đặt phòng" keeps the booking.
- Lighthouse accessibility 100.

Screenshot: `r9-cancel-deadline.png`.

## Round 10 (2026-10-22): recent searches

Pattern from Booking.com / Agoda ("Your recent searches"). Frontend only.

- Each "Tìm phòng" saves the search: property, dates, adults and children. Under the date presets, a "Gần đây" row shows up to 3 earlier searches, for example "Cả hai cơ sở · 26/10 → 29/10 · 2 khách".
- One click fills every field and goes straight to the results.
- The search that matches the current form is not shown. Searches with past arrival dates and malformed stored data are dropped.
- Stored only in this browser (`stayos-recent-searches-v1`). Nothing goes to the server.
- `search-domain.js`: `readSearches`, `pushSearch`. Phones show a single scrollable row.

Checks:
- 60 web tests pass. The new test covers order, dedupe, the cap of 3, dropping past arrivals, rejecting departure ≤ arrival, and corrupt storage.
- QA: searched "Cuối tuần này" and then "Tuần sau". The row showed 23→25/10; clicking it restored those dates, and the results header read "23/10 → 25/10 · 2 khách".
- Lighthouse accessibility 100. No horizontal scroll at the narrowest window.

Screenshot: `r10-recent-searches.png`.

## Round 11 (2026-10-22): trips list with tabs

Pattern from the Booking.com / Airbnb "Trips" page. Frontend only.

- The "Chọn kỳ nghỉ" dropdown on the stay page is replaced by tabs plus cards:
  - **Tabs:** Sắp tới / Đã qua / Đã hủy, each with a count.
  - **Each card:** property, room, dates, guests and status.
  - The selected trip has a sage border and `aria-current`. The page below shows that trip.
- **Default trip:** the stay in progress, else the nearest upcoming arrival, else the most recent booking. It used to be the last booking created, even when that one was cancelled. Right after booking, the new booking stays selected so the confirmation shows.
- Order:
  - Upcoming: in-house first, then by arrival.
  - Past: latest departure first.
- On a phone the cards scroll in one row. The list is hidden in print.
- `trip-domain.js`: `tripGroups`, `defaultTrip`. `TripList` lives in `TripHero.jsx`.

Checks:
- 61 web tests pass.
- QA with 4 upcoming bookings: the default is I-103 (arrives today). Clicking R-101 switches the trip card to "Ngày mai nhận phòng". The empty "Đã qua" tab says so.
- Lighthouse accessibility 100.

Screenshot: `r11-trip-list.png`.

## Round 12 (2026-10-22): book again

Pattern from Booking.com / Airbnb "Book again". Frontend only.

- A cancelled or completed trip shows "Đặt lại phòng này" next to "In / lưu PDF" on the trip card.
  - It opens that room's detail with the same party size, capped at the room's current capacity. The guest picks new dates on the room calendar.
  - The shareable room link is set as usual.
- The detail opens once. After it is closed, going back to the home page does not reopen it.
- The button is hidden if the room is no longer in the catalog.

Checks:
- 61 web tests pass.
- QA: the R-101 booking was cancelled through the real API on the temporary QA database. The "Đã hủy" tab then counted 1. On that trip, "Đặt lại phòng này" opened "R-101 · Studio" with `?room=ocean…&guests=2`. Closing it and returning home kept it closed.

## Round 13 (2026-10-22): returning-guest badge (admin)

Pattern from extranet reservation lists ("Repeat guest"). Frontend only.

- "Khách quay lại · đã ở N lần" appears under the guest name in the bookings table and in the Today arrivals list.
- N counts completed stays (CHECKED_OUT) with the same email, case and spaces ignored, at any property, that ended on or before this booking's arrival.
  - The booking itself is never counted.
  - A guest's first completed stay, or an overlapping booking, gets no badge.
  - Counted from all bookings, not only the property selected in the sidebar.
- `completedStays` in `admin-bookings-domain.js`.

Fixed during this round:
- A shell edit had turned the CSV byte-order mark from round 8 into the text "FEFF". The test had been rewritten the same way, so it still passed.
- Restored `'﻿'` in both files and checked that `bookingsCsv([])` starts with U+FEFF.

Checks:
- 62 web tests pass.
- QA: I-104 was checked in and out through the API on the temporary QA database.
  - Bookings arriving 23/10 show "đã ở 1 lần".
  - I-104 itself and I-103 (same day) do not.
- Lighthouse accessibility 100.

Screenshot: `r13-returning-guest.png`.

## Round 14 (2026-10-22): internal staff notes (admin)

Pattern from the extranet reservation "notes" field.

- **Bookings table:** "+ Ghi chú nội bộ" under each guest opens a small form (≤500 characters, live counter). Saving shows the note with author and time. "Sửa ghi chú" edits it; saving it blank removes it.
- **Focus:** moves into the textarea when the form opens and back to the button after save or cancel.
- **Today arrivals:** the note is shown read-only, so the front desk sees it at check-in.
- **Server:**
  - New table `stay_staff_notes(booking_id PK, note, updated_by, updated_at)`. It is separate from the booking payload, so no guest response (state, cancel, arrival update…) can carry a note.
  - `POST /api/admin/bookings/{id}/note`: admin only (403 otherwise), 404 for an unknown booking, 400 over 500 characters, blank deletes.
  - Notes are returned only inside `admin/state` as `notes`.
  - Not written to the guest-visible history.
- Test: `staffNotesAreAdminOnlyAndNeverReachTheGuest`. It covers 403, 404 and 400; trimming; the author; the guest state and a status response not containing the note; and blank deleting it.

Deploy:
- Backup `data/backups/stayos-before-staff-notes-20261022.sqlite`.
- Restarted 8080 on the same database, not in Demo mode. The new table is additive.
- The 4-table fingerprint was identical before and after, matching the original baseline.
- The new route returns 401 when signed out.

Checks:
- 24 Java tests and 62 web tests pass.
- QA (8081 restarted with a fresh temporary database and reseeded): the note was saved and shown with author and time, and focus returned to the button. The note also appears on the Today arrival.
- Lighthouse accessibility 100.

Screenshot: `r14-staff-note-today.png`.

## Round 15 (2026-10-22): support as a chat box (guest)

Requested by the user ("phần hỗ trợ thành chatbox"). Pattern from in-app messaging on booking apps: a floating chat with conversation list, bubbles and an unread badge.

- **Entry points:**
  - Desktop: a floating "Nhắn STAYOS" button bottom-right (moves up when the compare tray is open).
  - Phone: the "Hỗ trợ" tab opens the chat full screen.
  - Header "Hỗ trợ", "Hỏi STAYOS" after booking, and the trip page support buttons all open the chat; from a trip it starts a new conversation already pointed at that booking.
- **Same backend, no bot:** each conversation is an existing support ticket (`/api/support…`). Nothing in the chat answers on behalf of staff; the header says "Nhân viên đọc và trả lời từng tin · không có trả lời tự động".
- **Conversation list:** newest activity first, last message preview ("Nhân viên: …" / "Bạn: …"), status, and an "N tin mới" pill.
- **Thread:** guest bubbles right (sage), staff bubbles left, "Hôm nay / Hôm qua / dd/mm/yyyy" day separators in Vietnam time, an "Đang gửi…" bubble while sending, the text kept if sending fails, "Rút yêu cầu" with an inline confirm, and a closed note plus "Bắt đầu cuộc trò chuyện mới" once a ticket is closed or reaches 50 messages.
- **Composer:** Enter sends, Shift+Enter adds a line, and Enter while a Vietnamese IME (Telex/VNI) is composing never sends.
- **New conversation:** about a booking or "chưa đặt phòng · cần tư vấn" (with property); topic chips prefill the text, which the guest still edits.
- **New replies:** polled every 15 s while the chat is open and every 60 s (plus on window focus) while any conversation is still open. Unread = staff messages newer than the last one shown in this browser (`stayos-chat-seen-v1`, localStorage only; a blocked store just means nothing is marked read). Badge on the launcher and on the phone tab.
- **Accessibility:** non-modal dialog labelled by its title; `role="log"` for messages; Escape closes; focus moves into the composer on open and back to whatever opened the chat on close (the launcher is hidden on phones).
- The old `GuestSupport` page component was removed; the admin queue (`SupportThread`) is unchanged.
- Domain: `support-chat-domain.js`; tests `tests/support-chat.test.mjs` (ordering, unread, Vietnam day grouping, broken storage).

Found and fixed while testing:
- The global `.booking-app button` rule boxed the icon buttons and recoloured the bubble times (low contrast on sage). Chat rules are now scoped under `.booking-app`.
- On phones focus was lost on close because the launcher is hidden.

Checks:
- 66 web tests pass; frontend only, no Java change, no 8080 restart.
- QA: guest sent a question and a booking-linked check-in question; staff replies sent through the admin API appeared within one poll; the badge showed 1 after a reply while closed; Shift+Enter kept a newline.
- Lighthouse accessibility 100 with the chat open. No console errors.

Screenshots: `r15-support-chat.png` (desktop thread), `r15-support-chat-mobile.png` (phone list with an unread conversation).

## Round 16 (2026-10-22): 24/7 assistant, security, speed, restructure

Requested by the user: the chat must answer at any hour, check speed and load, split the code by feature for developers, and harden it for visitors from outside.

- **Assistant:** the chat now opens on "Trợ lý STAYOS", which answers instantly from the catalog, policy snapshot and the signed-in guest's own bookings (check-in times, cancellation deadline per booking, prices by property, rooms for N guests, fees, payment, services, how to change dates, account). Facts the system does not hold (address, parking, Wi-Fi password, pets, extra beds) are stated as unconfirmed with a "Gửi cho nhân viên" button that opens a staff conversation pre-filled with the question and attached to the current booking. It never promises exceptions or adds charges. Transcript is per account in sessionStorage and is cleared on sign-out (found during QA: the previous guest's booking list stayed visible after signing out).
- Keyword matching was checked against Vietnamese words that collide once accents are removed (thuê/thuế, nơi/nôi, biên nhận/biển, cho/chó); "Hồ bơi mở cửa mấy giờ?" initially got the check-in answer and now goes to staff.
- **Speed:** see `docs/DEPLOYMENT.md`. Sign-in hashing no longer blocks other requests (p95 165 ms → 22 ms under load); owner indexes added.
- **Security:** see `docs/DEPLOYMENT.md` (per-account lockout, per-IP limits, timeouts, CSP and headers, same-origin static serving, Secure cookie option, Google Fonts removed).
- **Structure:** see `docs/ARCHITECTURE.md` (web `src/` in feature folders, `BookingService` split into feature classes behind a facade, route table with contract tests). Legacy landing files moved to `archive/web-legacy-20261022`; full source snapshot in `archive/source-before-restructure-20261022`.

Checks: 71 web tests, 34 Java tests; Lighthouse accessibility 100 with the assistant open; main 8080 restarted after backup `data/backups/stayos-before-security-refactor-20261022.sqlite`, fingerprint identical before and after.

Screenshot: `r16-assistant.png`.

## Round 17 (2026-10-22): real business data, AI photos, password reset, privacy page

Requested by the user: GitHub repo, city TP. Hồ Chí Minh, hotline 0335858424, AI photos, "do the rest".

- **Business data:** both properties now show TP. Hồ Chí Minh and the hotline (footer, assistant, reset form, privacy page). Street address stays "chưa cập nhật". The beach-distance line is gone. The Vũng Tàu walking tour is paused in both service catalogs (server answers 409 with the reason; old bookings keep it), and the airport transfer text now says Ho Chi Minh City.
- **AI photos:** Phòng bốn now has a four-view AI illustration set cut from the existing concept sheet (scripts/prepare-review-images.py), shown for every room of that type with "Ảnh minh họa do AI tạo theo loại phòng" on each image, in the gallery and in the footer. Canva generation produced four more images, but only 199 px previews are downloadable without a Canva login and the credit quota then ran out, so they are not used.
- **Bug found:** the earlier restructure broke the Studio photo glob path (0 images in the build). Fixed, with a build test that fails if room photos disappear again.
- **Password reset:** "Quên mật khẩu?" opens a form for email + one-time code + new password; staff issue the code in the console after a phone check.
- **Privacy page:** footer link "Chính sách dữ liệu cá nhân", describing exactly what is stored, marked as a draft for legal review.
- **Security:** the web README published the real admin e-mail with the demo password `change-me-now`, and that password still works on the main server. The README and source no longer contain the e-mail; the server now refuses public mode while an admin keeps a demo password.
- **Repository:** `.gitignore` keeps data/, backups, tools, raw assets and archive out of the public repo (an unanchored `data/` pattern initially excluded the room catalog; fixed).

Checks: 73 web tests, 37 Java tests; main 8080 restarted twice after backups, fingerprint identical each time.
