# Đổi ngày cho đơn có gói — 21/10/2026

Mở lại chức năng đã ghi là giới hạn trong `BOOKING_B_INTEGRATION_2026_10_21.md`: đơn tạo từ checkout B (có `offerSnapshot`) trước đây bị chặn đổi ngày và chỉ được hướng sang hỗ trợ.

## Quy tắc báo giá lại

- Tiền phòng = đơn giá phòng đã lưu × số đêm mới (như đơn cũ).
- Nâng gói = `perGuestNight` **trong snapshot của đơn** × số khách × số đêm mới. Không đọc lại `offer-v2.json`, nên đổi giá gói sau này không ảnh hưởng đơn đã đặt.
- Dịch vụ đã đặt giữ nguyên giá, số lượng và lịch: tổng dịch vụ = tổng cũ − tiền phòng cũ − nâng gói cũ.
- Định mức bữa sáng tính lại = số khách × số đêm mới; trà chào đón giữ theo kỳ ở.
- Không tự dời/xóa lịch dịch vụ. Báo giá bị chặn (409) khi:
  - lịch dịch vụ nằm ngoài 14:00 ngày nhận → 12:00 ngày trả mới;
  - spa (60 phút) hoặc tour (3 giờ) kết thúc sau 12:00 ngày trả mới;
  - xe đón đã đặt theo ngày nhận cũ mà ngày nhận thay đổi;
  - đơn có gói thiếu dữ liệu định mức (`perGuestNight`/`packageSupplement`).
- Khi admin duyệt: kiểm tra lại tồn phòng, tổng và lịch trong transaction (như trước); cập nhật `packageSupplement`, `offerSnapshot.supplement/roomTotal/total/benefits`. `initialStay` lưu thêm nâng gói và định mức gốc; `changes[]` lưu báo giá đã duyệt.

## Giao diện

- Khách: bảng kiểm tra hiển thị tiền phòng, nâng gói, dịch vụ, tổng hiện tại/mới, chênh lệch và định mức mới.
- Admin: tóm tắt yêu cầu có dòng “Gói …: cũ → mới · định mức”.
- TXT: dòng đổi ngày ghi thêm “nâng gói cũ → mới”.

## Đã kiểm tra

- Java: 16 test, 0 lỗi (thêm `packageDateChangeReratesFromSavedPlanAndKeepsServices`, `packageServiceDurationMustFitTheNewCheckout`).
- Web: build thành công, 29 test đạt (thêm test TXT cho đơn gói đã đổi ngày).
- UI trên 5184 / API QA 8081 (database tạm trong `target/`, không đụng database chính 8080):
  1. ST-E710745C · I-103 · 4 khách · ăn sáng · 2 set tối 23/10 18:30 · 22–24/10 · 3.280.000₫.
  2. Xin 22–25/10: 2.250.000 + 720.000 + 1.300.000 = **4.270.000₫**, chênh +990.000₫, 12 suất sáng.
  3. Xin 24–26/10: bị chặn “Lịch Bữa tối hải sản nằm ngoài ngày ở mới”.
  4. Gửi RQ-7B5826B0 → admin thấy dòng gói 480.000₫ → 720.000₫ → duyệt. Đơn lưu 22–25/10, 4.270.000₫, 12 suất; `initialStay` giữ 8 suất/480.000₫; dịch vụ tối giữ 1.300.000₫, chờ xác nhận.
  5. Khung hẹp nhất cửa sổ Chrome cho phép (~500px): bảng báo giá không tràn ngang. Chưa thử trên thiết bị 390px thật.

Ảnh: `package-date-change-quote-desktop.png`, `package-date-change-admin-desktop.png`, `package-date-change-quote-mobile.png`.

## Còn lại

- ~~Đơn có xe đón phải qua hỗ trợ khi đổi ngày nhận~~ → đã làm trong `PACKAGE_SERVICES_A11Y_2026_10_21.md` (nhập chuyến bay mới trong yêu cầu). Lịch các dịch vụ khác vẫn chưa sửa được trong cùng yêu cầu.
- Gói/giá vẫn là dữ liệu mô phỏng chưa được chủ cơ sở duyệt. Các giới hạn thanh toán, email, ảnh thật, accessibility đầy đủ trong tài liệu trước vẫn giữ nguyên.
