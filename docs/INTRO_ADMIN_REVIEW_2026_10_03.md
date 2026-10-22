# Review và demo intro → booking / admin riêng

## Đối chiếu antigravity.mp4

Đã trích và xem các khung có timestamp từ file gốc: 576×1024,
29.97 fps, 19.65 giây. Đây là video quay màn hình máy tính, có watermark;
không đưa các khung này vào website. Script tái tạo: scripts/inspect-reference-video.py.

- 0–1.8s: cảnh biệt thự sát nước, tiêu đề serif đặt bên trái, cảnh chiếm màn hình.
- 3.5–7.1s: góc tổng thể trên cao; các nhãn không gian hiện ngay trên cảnh.
- 8.8–12.4s: sân vườn và cửa vào; chữ đổi theo chương, ảnh vẫn là trọng tâm.
- 14.1s: nội thất nhìn ra biển. 15.9s trở đi là phần kết TikTok.

Khung hình liên tiếp gợi chuyển động camera / nối cảnh, không đủ để kết luận
thư viện, geometry realtime hay video dựng sẵn. Clip không chứng minh có booking.

## Logic cũ chưa hợp lý ở đâu

1. Intro là modal phụ: người xem phải thoát khỏi trải nghiệm để quay lại đặt phòng.
2. Admin dùng cùng menu, bố cục và ưu tiên với khách, nên không thành công cụ vận hành.
3. 15 mã phòng dùng lại một số ảnh minh họa; không thể xem đó là 15 bộ ảnh / tour xác thực.
4. Tour Tidal 112 suite và inventory 15 phòng chưa có ánh xạ định danh; không được tự
   coi TS-1501 là một phòng trong catalog bằng tên hoặc bằng ảnh tương tự.

## Đã triển khai trong demo này

- `/`: intro bốn chương trên trang, cuộn tự nhiên, nút chọn chương và bàn phím
  trái/phải; không bắt cuộn toàn cửa sổ hay thay đổi GSAP global timeline.
- Chương cuối dùng cùng `roomId`, ảnh, sức chứa và giá với form booking.
  Nhấn ảnh phòng trong danh sách quay lại chương suite; nút đặt ngày mở form tại chỗ.
- Chọn lại ngày/phòng dùng API hiện có; đăng nhập vẫn giữ nháp. Có skip intro,
  giảm chuyển động và demo 18 giây do người dùng chủ động bật/dừng.
- `/admin.html`: giao diện quản trị độc lập, không có intro hay nút đặt kỳ nghỉ.
  Danh bạ tài khoản, khóa/mở khóa guest, phòng theo ngày, dọn/bảo trì/mở lại,
  booking, nhận/trả phòng và xác nhận dịch vụ.
- Khóa tài khoản thu hồi phiên, không xóa booking. Admin không khóa admin khác
  hoặc tự nâng guest lên admin. Danh bạ không trả hash mật khẩu / token.
- Phòng đã đặt tính từ đơn; vận hành dọn/bảo trì là trạng thái riêng và ngăn đơn mới
  trong giao dịch server, không hủy đơn hiện hữu. Lệnh mở lại không thể ghi đè tồn
  phòng đã được đặt. Ghi chú bắt buộc, lưu lịch sử thay đổi.

## Chất lượng hình ảnh: đạt / chưa đạt

Demo mới là mô phỏng UX với ảnh/video sạch có sẵn; chuyển ảnh nhẹ và dissolve,
không phải camera 3D xuyên cùng một công trình. Không dùng ảnh AI làm bằng chứng
model đã hoàn thiện. Không sửa hoặc nâng cấp geometry Tidal trong đợt này.

Scene Tidal hiện có PBR, HDR/PMREM, water reflection và geometry ban công nhưng
vẫn nhiều hình khối procedural, cây đơn giản, vật liệu/chi tiết lặp. Tăng DPR
hay thêm blur không bổ sung chi tiết hình học, ánh sáng gián tiếp hoặc sự nhất quán
của một bộ cảnh kiến trúc. TS-1501 có asset studio riêng, không có nghĩa 112 phòng
đã cùng chất lượng. Cần render từ cùng scene nguồn: tổng thể → lối vào → phòng,
giữ đúng hướng/cao độ/camera, vật liệu có tỷ lệ thật, nội thất/vegetation đủ chi tiết.

## Cách đánh giá

1. Mở `/`, nhấn Chạy demo 18s hoặc cuộn qua bốn chương.
2. Nhấn So sánh 15 phòng, chọn ảnh một suite, kiểm tra tên ở chương cuối.
3. Chọn ngày cho phòng này, đóng form rồi mở lại: phòng/ngày còn nguyên.
4. Mở `/admin.html`; xem Tài khoản và Tình trạng phòng theo ngày.
5. Dùng DB thử riêng khi thử khóa tài khoản / bảo trì; thay đổi có hiệu lực thật
   trong SQLite local, không chỉ mô phỏng màu sắc.

Kiểm thử: Maven 6 tests (5 API + 1 database), build cả main/admin/tidal, API smoke.
Đã kiểm tra trực tiếp menu mobile, reduced-motion bằng nút, form giữ phòng,
admin danh bạ/phòng; desktop 1440 và mobile 390 không tràn document.
Chưa có kiểm định WCAG đầy đủ, thử mạng chậm toàn tuyến, thanh toán hoặc email recovery.

Skill UI/UX Pro Max được dùng để rà focus, mobile, reduced-motion và hierarchy;
Frontend Design Direction tách ngôn ngữ hình ảnh kể chuyện khỏi bảng quản trị.
