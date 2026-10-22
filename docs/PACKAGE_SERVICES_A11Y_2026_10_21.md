# Dịch vụ theo gói, lưu nháp, đổi lịch xe đón và accessibility — 21/10/2026

Tiếp nối `PACKAGE_DATE_CHANGE_2026_10_21.md`. Xử lý ba giới hạn còn ghi trong `BOOKING_B_INTEGRATION_2026_10_21.md` và lỗi hiển thị dấu tiếng Việt.

## 1. Giữ lựa chọn qua tải lại trang / đóng tab

- `src/checkout-draft.js`: lưu gói, số lượng, lịch dịch vụ, mã chuyến bay và trạng thái mở checkout vào `localStorage` (`stayos-offer-draft-v1`).
- Không lưu tên, email, giá, tổng hoặc quyền lợi; mọi giá được tính lại và máy chủ kiểm tra lại khi xác nhận.
- Bỏ qua bản nháp sai phiên bản gói, quá 7 ngày, thời điểm lưu ở tương lai, dịch vụ lạ, số lượng ngoài 1–6, ngày/giờ sai định dạng.
- Xóa khi đặt thành công hoặc đăng xuất (máy dùng chung).
- Phòng/ngày/khách (`stayos-draft-v4`) chuyển từ `sessionStorage` sang `localStorage`, vẫn đọc bản cũ trong `sessionStorage`.

## 2. Dịch vụ thêm sau khi đặt cho đơn có gói

- Trang “Dịch vụ” với đơn có gói dùng danh mục `offer-v2.json`: số lượng, ngày, giờ, chuyến bay, định mức người, điều kiện.
- Máy chủ (`BookingOffer.service`, dùng chung với checkout) kiểm tra phiên bản danh mục, giá dự kiến, khung giờ, hạn đặt trước 12/24 giờ, nằm trong kỳ ở, trùng lịch 60 phút, tối đa một xe đón/đơn.
- Đơn có gói không nhận danh mục cũ (409); đơn cũ giữ luồng cũ.
- Có ô chọn kỳ nghỉ khi tài khoản có nhiều đơn.

## 3. Đổi ngày nhận phòng khi có xe đón

- Đổi ngày nhận phòng cho đơn có xe đón: khách nhập giờ hạ cánh và mã chuyến bay mới ngay trong form. Báo giá lưu `transferChange` (lịch cũ → mới).
- Khi duyệt: lịch xe chuyển sang ngày mới, giá giữ nguyên, trạng thái về **Chờ xác nhận** để nhân viên xác nhận lại. Lịch sử giữ chuyến bay cũ.
- Admin thấy “Xe đón mới …; cần xác nhận lại”. File TXT ghi lịch xe mới.

## 4. Hiển thị và accessibility

- Georgia trên Windows không có đủ glyph tiếng Việt dựng sẵn (dấu tách rời: “điê`u”). Tiêu đề các trang phụ chuyển sang Segoe UI theo hướng B.
- Thêm link “Bỏ qua đến nội dung chính”, `<main>`, sửa thứ tự heading, tên đọc cho trình đọc màn hình khớp chữ hiển thị (nút tài khoản, ảnh concept), chữ trên sơ đồ phòng (1.26:1 → mực tối).
- Admin: sidebar cố định `100vh` bị tràn khiến nút Đăng xuất nằm trên nền sáng (1.22:1); thêm cuộn trong sidebar. Tăng tương phản chữ xám, link cao 44px, `noindex`.
- `public/robots.txt` chặn lập chỉ mục vì dữ liệu là demo.

Lighthouse (snapshot, trên QA 5184/8081):

| Màn hình | Accessibility trước → sau |
| --- | --- |
| Trang chủ desktop | 94 → 100 |
| Trang chủ mobile (navigation) | — → 100 |
| Kỳ nghỉ của tôi | 98 → 100 |
| Dịch vụ (đơn có gói) | 98 → 100 |
| Hỗ trợ | 100 |
| Checkout chọn gói | 100 |
| Admin | 91 → 100 |

Giả lập `prefers-reduced-motion: reduce`: 0 phần tử còn transition/animation. Tab đầu tiên đến link bỏ qua, có viền focus. **Chưa** kiểm thử trình đọc màn hình thật (NVDA/VoiceOver) hay thiết bị cảm ứng thật; Lighthouse không phải chứng nhận WCAG.

## 5. Khách tự hủy dịch vụ

- `POST /api/services/{id}/cancel`. Khách hủy được khi còn ≥12 giờ (bữa tối) hoặc ≥24 giờ (dịch vụ khác) trước giờ phục vụ, đúng điều kiện “hủy miễn phí” trong `offer-v2.json`. Sát giờ: báo liên hệ hỗ trợ, không tự tính phí.
- Tổng đơn trừ đúng giá đã lưu; lịch sử ghi `SERVICE_CANCELLED`; gọi lại không trừ lần hai; khách khác nhận 404. Dịch vụ đã hủy không chặn đặt lại cùng giờ.
- Admin thấy số lượng, chuyến bay và ai đã hủy. Lịch sử tài khoản có nhãn cho đổi ngày/hủy dịch vụ/hỗ trợ.
- Đã thử trên UI: ST-8E34442D 3.280.000₫ → hủy 2 set tối → 1.980.000₫. Chưa có test tự động cho trường hợp sát giờ (cần đồng hồ giả lập).

## 6. Sao lưu tự động

- `LedgerBackup` + `ApiMain`: `VACUUM INTO` khi khởi động và mỗi 24 giờ vào `data/backups/auto/`, giữ 14 bản `stayos-auto-*` gần nhất; không xóa bản sao lưu thủ công. Cấu hình: `STAYOS_BACKUP=off`, `STAYOS_BACKUP_DIR`, `STAYOS_BACKUP_KEEP`.
- Lỗi sao lưu chỉ ghi log, không dừng API.
- `.gitignore` trước đây **không** chặn `data/backups/`; đã thêm để bản sao chứa dữ liệu khách không bị commit. Kiểm tra: chưa có bản nào bị theo dõi trong git.
- Sau khi khởi động lại 8080: `stayos-auto-20261021-150623.sqlite` có fingerprint trùng database chính.
- Chưa có sao lưu ra ngoài máy (ổ khác/cloud); cần chọn nơi lưu trước khi vận hành thật.

## 7. Rà soát dependency

- `npm audit --omit=dev`: **0** lỗ hổng trong dependency chạy thật (React, React DOM, gsap).
- Công cụ dev: đã `npm audit fix` (không `--force`) cho `source-map-js`; build và 33 test vẫn đạt. Còn esbuild/vite (moderate/high) chỉ ảnh hưởng dev server; sửa cần nâng vite lên bản lớn, chưa làm để tránh vỡ build. Dev server chỉ nghe `127.0.0.1`, bản triển khai dùng `dist/`.
- Java (sqlite-jdbc 3.46.1.0, gson 2.13.2, JavaFX 21.0.5) chưa quét bằng công cụ CVE tự động (OWASP dependency-check cần tải cơ sở dữ liệu NVD).

## Kiểm thử

- Java: 19 test (17 `BookingApiTest` + `DatabaseTest` + `LedgerBackupTest`), 0 lỗi. Mới: dịch vụ theo gói (quyền, giá giả, khung giờ, ngoài kỳ ở, danh mục cũ, trùng lịch, tổng và báo giá đổi ngày), đổi ngày có xe đón (thiếu/sai chuyến bay, duyệt, xác nhận lại, lịch sử).
- Web: build thành công, 33 test. Mới: `checkout-draft.test.mjs` (4), TXT có xe đón.
- UI trên QA 5184/8081 (database tạm, không đụng database chính):
  - R-103 · gói ăn sáng · 1 set tối 18:30 · 2.590.000₫ → tải lại trang: checkout tự mở lại, đủ lựa chọn và tổng → xác nhận ST-5AAB8F86, nháp bị xóa.
  - Đơn I-103 có gói: thêm set tối 21:00 báo “chọn giờ 18:00–20:00”; 2 set 18:30 → chờ xác nhận, tổng 1.980.000 → 3.280.000₫.
  - ST-73C4B0FD có xe 23/10 10:00 VN123: đổi 24–26/10 + 11:00 VN456 → RQ-8BAD2C66 → admin duyệt → xe 24/10 11:00 VN456, chờ xác nhận, 850.000₫.

Ảnh: `docs/package-services-desktop.jpeg`, `docs/transfer-date-change-desktop.jpeg`. Báo cáo Lighthouse: `target/lighthouse/*/report.html`.

## Đưa lên API chính 8080

Sao lưu nhất quán (bao gồm WAL): `data/backups/stayos-before-package-services-20261021.sqlite`. Khởi động lại đúng `start-api.ps1 -Database data/stayos-web.sqlite -Port 8080`, không bật Demo, không tạo admin. Không có migration mới. Đã khởi động lại hai lần (sau phần 1–4 và sau phần 5–6); fingerprint trước = sau cả hai lần:

| Bảng | Dòng | SHA256 |
| --- | ---: | --- |
| stay_bookings | 2 | 1494648f2541c8095afa56cbea69267dc6d032e4e638fef459b39c7236585798 |
| stay_requests | 2 | f77270fb9f7f955e4c5e87e7950e5c05ebdcbb009f547865e0b5f79ae87e4d24 |
| stay_history | 5 | e3ef9bb12f9fa591c1c4c278c823e6c9d9b61e0aa24464f1bc170326983fb9c6 |
| room_operations | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

## Còn lại

- Kiểm thử trình đọc màn hình và thiết bị cảm ứng thật.
- Nâng vite bản lớn để xử lý cảnh báo esbuild; quét CVE cho dependency Java.
- Sao lưu ra ngoài máy chủ.
- Các phần cần thông tin kinh doanh thật vẫn giữ nguyên: duyệt giá/gói, ảnh 14 phòng, địa chỉ/liên hệ, thanh toán/hoàn tiền, email, triển khai HTTPS.
