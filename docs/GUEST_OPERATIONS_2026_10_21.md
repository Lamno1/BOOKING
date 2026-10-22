# Bàn giao vận hành booking — 21/10/2026

## Tham khảo và áp dụng

Không sao chép giao diện của nền tảng khác. Giữ hai cơ sở, 15 phòng demo và hướng B đã duyệt trong review.

| Quan sát từ nguồn chính thức | Áp dụng trong STAYOS |
| --- | --- |
| [Airbnb: đổi lịch](https://www.airbnb.com/help/article/913): khách đề nghị, bên lưu trú duyệt/từ chối, hiển thị tổng mới trước khi gửi | Báo giá đổi ngày → yêu cầu chờ → admin kiểm tra lại tồn phòng và duyệt. Từ chối không sửa đơn cũ. |
| [Airbnb: phân rã giá](https://www.airbnb.com/help/article/125) | Giữ tiền phòng, dịch vụ và tổng đã lưu trong tóm tắt; báo rõ chênh lệch khi đổi ngày. |
| [Booking.com: chính sách hủy theo vòng đời đơn](https://developers.booking.com/demand/docs/orders-api/cancellation-policies) | Chính sách được lưu cùng đơn; hủy đóng yêu cầu đang mở, giữ lịch sử; không hiển thị hành trình lưu trú cho đơn đã hủy. Không tự áp dụng chính sách của Booking.com cho STAYOS. |

## Đã thực hiện

- Hỗ trợ thật trong ứng dụng: khách gửi yêu cầu, admin nhận hàng đợi, phản hồi hai chiều, trạng thái và lịch sử. Không tự cộng dịch vụ trả phí. Chưa có nhân viên trực thực tế hay thông báo email.
- Đổi ngày: chỉ đơn chưa nhận phòng và chưa qua ngày đến; không nhận ngày quá khứ; 1–90 đêm; một đề nghị đang mở/đơn. Báo giá dùng đơn giá lưu, giữ dịch vụ. Lịch dịch vụ không còn nằm trong ngày ở mới bị chặn, không âm thầm xóa/dời.
- Duyệt đổi ngày kiểm tra lại tồn phòng trong transaction. Có người đặt trước, tổng đã đổi hoặc đơn bị hủy thì không ghi đè. Lưu original stay và audit thay đổi, không thay snapshot phòng/chính sách cũ.
- Quản trị riêng: lịch bảy ngày, lọc cơ sở, tìm và xử lý hỗ trợ. Ngày trả phòng không chiếm đêm; dọn/bảo trì là trạng thái vận hành hiện tại, áp dụng mọi ngày đến khi mở lại.
- Tóm tắt TXT tải về bằng dữ liệu đơn đã lưu, gồm chính sách, dịch vụ và dấu vết đổi lịch; không phải chứng từ thu tiền.
- Bỏ tầng chưa xác minh khỏi thẻ/chi tiết/checkout khách; dữ liệu tầng nội bộ không xóa.
- Sửa lịch admin: chọn ngày bắt đầu sau ngày kết thúc tự đưa ngày kết thúc sang ngày kế tiếp.

## Đã kiểm tra bằng thao tác UI (database riêng)

QA tại5184/API8081, không dùng đơn khách cũ. Ngày giờ theo Việt Nam.

1. Khách gửi “Tôi cần thêm 2 khăn tắm và hỏi mật khẩu Wi-Fi.” → RQ-1AA82226, không thêm bữa tối, không đổi tiền.
2. ST-26BDD06C/R-101: 21–23/10/2026, 1.700.000₫ → xin22–25/10, báo2.550.000₫, chênh850.000₫.
3. Trước duyệt, hồ sơ vẫn21–23/10 và1.700.000₫. Admin nhập phản hồi, duyệt RQ-97C58D3C.
4. Lịch admin có R-101 đặt các đêm22,23,24; ngày21 và25 trống.
5. Admin trả lời/đóng yêu cầu khăn. Khách đăng xuất/đăng nhập lại thấy phản hồi, trạng thái Đã giải quyết/Đã duyệt, lịch mới và tổng2.550.000₫.
6. Mobile390×844: menu, bố cục hỗ trợ, hội thoại và nội dung đổi ngày đọc được, không tràn ngang trang. Desktop1440×900 có ảnh hàng đợi/lịch.
7. Trên5174/API8080, khách chưa đăng nhập chỉ thấy lời mời đăng nhập để gửi/theo dõi; không lộ lịch sử.

Ảnh xem tại [trang bằng chứng](http://127.0.0.1:5174/review/operations.html). Đã sửa font hỗ trợ để tránh bị CSS trang cũ ghi đè, tăng tương phản nhãn chọn cơ sở admin. Chưa có audit screen reader/reduced-motion hệ điều hành đầy đủ; không tuyên bố đạt WCAG toàn bộ.

Đã chạy trình kiểm tra bằng chứng của skill frontend-design-direction: chưa đạt cổng kiểm tra đầy đủ vì accessibility được giữ trạng thái chưa kiểm chứng toàn diện. Không đổi thành pass chỉ để vượt cổng. Hồ sơ chi tiết tại `src/main/resources/web/review/operations-evidence.json`; đây là phần còn phải kiểm tra trước nghiệm thu mở bán, không phải lỗi của 39 bài kiểm thử chức năng.

## Kiểm thử tự động

- Java: 12 tests, 0 failures/errors; gồm phân quyền, idempotency gửi yêu cầu, khôi phục dữ liệu, xung đột phòng khi duyệt, thay đổi tổng, lịch dịch vụ và hủy đóng hỗ trợ.
- Web: build thành công, 27 tests pass; không đóng gói Three.js/kiến trúc. Không thêm thư viện.
- Chưa chạy tải đồng thời quy mô kinh doanh hay test cổng thanh toán/email thật.

## Bảo toàn dữ liệu đang sử dụng

API8080 không chạy ở thời điểm cập nhật; đã khởi động lại đúng database, không bật Demo và không tạo lại admin. Migration chỉ thêm bảng stay_support/index. Có bản sao SQLite nhất quán, bao gồm WAL, tại `data/backups/stayos-before-guest-operations-20261021.sqlite`.

Fingerprint trước/sau khởi động giống nhau:

| Bảng | Số dòng | SHA256 trước = sau |
| --- | ---: | --- |
| stay_bookings | 2 | 1494648f2541c8095afa56cbea69267dc6d032e4e638fef459b39c7236585798 |
| stay_requests | 2 | f77270fb9f7f955e4c5e87e7950e5c05ebdcbb009f547865e0b5f79ae87e4d24 |
| stay_history | 5 | e3ef9bb12f9fa591c1c4c278c823e6c9d9b61e0aa24464f1bc170326983fb9c6 |
| room_operations | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

## Còn phải hoàn thành trước mở bán

| Phần | Trạng thái / điều kiện |
| --- | --- |
| Gallery B/V2, gói và màn hình xem lại | Có bản bấm thử riêng; chưa đưa nguyên trạng vào booking chính, chưa duyệt thông số/điều kiện kinh doanh. |
| Giá, quà tặng, định mức, chính sách cọc/hủy | Cần chủ cơ sở duyệt; dữ liệu hiện tại chỉ mô phỏng, không hứa dịch vụ chưa chốt. |
| Địa chỉ, bản đồ, ảnh và liên hệ | Cần thông tin thật; không tự tạo dữ kiện kinh doanh đã xác minh. |
| Thanh toán/hoàn tiền | Chưa có nhà cung cấp/tài khoản/khóa; cần webhook idempotent, đối soát, hoàn tiền và thử sandbox sau khi chọn cổng. |
| Xác minh email/khôi phục/gửi xác nhận | Cần tên miền và SMTP; không giả lập đã gửi. |
| Triển khai | HTTPS, secret/env, backup định kỳ, rà soát dependency và kiểm thử tải/bảo mật trước công khai. |

Đợt này hoàn thiện phần vận hành có thể làm bằng dữ liệu đã có, không tuyên bố mọi tính năng kinh doanh đã xong.
