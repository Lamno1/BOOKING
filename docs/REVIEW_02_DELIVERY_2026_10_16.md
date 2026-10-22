# Review 02 — bàn giao gallery, gói và định mức

Mở `http://127.0.0.1:5174/review/selection.html`. Bộ duyệt tổng hợp đã có liên kết Review 02. Review 01 giữ để đối chiếu, không phải bảng gói mới nhất.

## Có thể xem và bấm thử

- R-101 Studio 32 m² / 2 khách và I-103 phòng bốn 34 m² / 4 khách. Mỗi loại có bốn góc concept AI riêng: ngủ, khu chức năng, tắm, chi tiết. Không thay ảnh của 13 phòng còn lại; không giả ảnh đã xác minh hoặc mặt bằng chính xác.
- Chọn ngày, số khách, ba gói; bốn dịch vụ có số lượng, đơn vị, định mức, lịch và điều kiện hủy riêng. Không tự cộng dịch vụ trả phí.
- Phiếu mô phỏng giữ bản chụp giá/quyền lợi/chính sách dù đổi phòng hoặc gói sau đó. Không giữ phòng, thu tiền, gửi email hoặc ghi database.
- Bảng cuối trang chỉ rõ D1–D8 cần chủ cơ sở duyệt. Giá và định mức đều là đề xuất, không phải dịch vụ đã vận hành.

## Kiểm tra đã thực hiện

1. Build và 15/15 frontend/domain/SSR tests đạt. `node --check review/selection.js` đạt.
2. UI desktop: I-103, 4 khách, 14–16/11/2026, gói ăn sáng, 2 set tối → 1.500.000 + 480.000 + 1.300.000 = **3.280.000₫**, 8 suất sáng và 4 ly trà. Nút chuột và bàn phím tạo được phiếu.
3. Đổi sang Studio sau tạo phiếu: phiếu cũ giữ tổng 3.280.000₫. Chọn ảnh phòng tắm đổi caption 3/4.
4. UI 390px: R-101, 2 khách, 2 đêm, ăn sáng, 1 set tối → **2.590.000₫**, 4 suất sáng và 2 ly trà. Gallery không tràn ngang (innerWidth 390, document width 375 có scrollbar).
5. Sửa trực tiếp định dạng ngày dd/mm/yyyy, nowrap từng ngày; trạng thái đơn ở trước tổng tiền, đơn hủy ghi “Tổng trước khi hủy”. Kiểm tra component StayOverview thật bằng fixture giả tại review/stay-receipt.html ở 390px; không đăng nhập tài khoản khách để dựng dữ liệu. Mỗi ngày cao 17,6px và white-space nowrap; không tràn ngang.
6. Audit SQLite chỉ đọc: hash lịch sử vẫn khớp mốc trước đợt này. Không tạo hoặc hủy đơn kiểm thử trong DB thật.

## Lịch sử giữ nguyên

| Bảng | Dòng | SHA-256 |
|---|---:|---|
| stay_bookings | 2 | 1494648f2541c8095afa56cbea69267dc6d032e4e638fef459b39c7236585798 |
| stay_requests | 2 | f77270fb9f7f955e4c5e87e7950e5c05ebdcbb009f547865e0b5f79ae87e4d24 |
| stay_history | 5 | e3ef9bb12f9fa591c1c4c278c823e6c9d9b61e0aa24464f1bc170326983fb9c6 |

## Tài nguyên và giới hạn

Trong src/main/resources/web/review/: review02-gallery-desktop.jpg, review02-gallery-mobile.jpg, review02-receipt-desktop.jpg, review02-receipt-mobile.jpg, review02-cancelled-dates-mobile.jpg. Hai contact sheet PNG và prompt/nguồn công cụ ở GALLERY_REVIEW_02.md. Áp dụng skill imagegen cho concept đa góc có nhãn; design-system cho màu, tương phản và luồng lựa chọn/tóm tắt nhất quán.

Chưa triển khai gói vào API/database/web chính. Chưa có nhà cung cấp hoặc thông tin cơ sở xác minh. Cần duyệt ảnh concept và bảng định mức trước, rồi mới làm quyền lợi snapshot trên đơn, lịch phục vụ, hàng đợi nhân viên, thanh toán/xác nhận email và khôi phục mật khẩu. Không đánh đồng phiếu mô phỏng với booking thật.
