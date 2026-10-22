# Booking tách khỏi kiến trúc — 13/10/2026

## Đã thực hiện

- Dừng công việc kiến trúc. Di chuyển viewer và public assets sang `D:/STAYOS_WORKSPACE/03_ARCHITECTURE/web`, có package/build riêng, port 5187. Không xóa scene Blender, các bản A/B hoặc dữ liệu phòng cũ.
- Booking chỉ build `index.html` và `admin.html`, bỏ dependency Three.js. Kiểm tra đầu ra không chứa kiến trúc/GLB/HDR.
- Trang chủ booking mới: nội dung giới thiệu ngắn → danh sách 15 phòng → popup chi tiết → ngày/khách/dịch vụ → đăng nhập và đặt phòng. Không bắt đi qua intro 3D.
- Trang khách không gọi endpoint admin. Trang quản trị vẫn riêng, backend vẫn kiểm tra vai trò.
- Checkout chặn ngày sai, quá sức chứa, chưa lấy được tồn phòng hoặc phòng không còn trống. Ngày theo múi giờ Việt Nam; đổi ngày đến qua ngày đi sẽ đưa ngày đi sang hôm sau.
- Bảo toàn session draft, tài khoản, database và lịch sử. Thêm xác nhận hủy đơn, hướng dẫn đăng nhập khi khách xem kỳ nghỉ.
- Áp dụng frontend-patterns để tách component giới thiệu/chi tiết khỏi state và tách hàm kiểm tra booking thành module có unit test.

## Kiểm tra đã chạy

- `mvn test`: 6 test đạt (5 BookingApiTest, 1 DatabaseTest). Dữ liệu test cách ly, không tạo đơn vào database hiện có.
- `npm run test:booking`: build + 4 test đạt (múi giờ/ngày, điều kiện đặt phòng, ranh giới tài nguyên).
- `node verify-booking.cjs`: API health, 15 ID phòng duy nhất, trạng thái trống, private endpoints từ chối anonymous đều đạt.
- Build riêng của architecture đạt. Chỉ kiểm tra khả năng tách build; không nâng chất lượng kiến trúc.
- Trình duyệt: desktop 1440×900; mobile 390×844; mở chi tiết → checkout → đăng nhập; nhập 3 khách vào phòng 2 người bị chặn; ngày đến 20/10 tự đẩy ngày đi 21/10 và cập nhật giá 1 đêm.

## Giới hạn trước khi công khai

- 15 phòng/ảnh/giá là mẫu, không phải 112 suite Logan đã được duyệt.
- Chưa thanh toán, xác minh email, khôi phục mật khẩu qua email hoặc HTTPS public.
- `npm audit` báo 3 vấn đề của toolchain hiện tại (Vite/esbuild/source-map-js). Chưa tự nâng major trong đợt tách dự án. Dev server chỉ bind loopback; cần xử lý trước triển khai công khai.
- Chưa thực hiện đăng nhập bằng tài khoản thật hay tạo/hủy booking trên database người dùng để kiểm thử UI; các thao tác ghi dữ liệu được kiểm tra qua integration test cách ly.
- Nguồn Blender và script sản xuất vẫn ở đường dẫn cũ dưới `02_IMPLEMENTATION/assets` và `scripts` để tránh phá liên kết. Chúng không nằm trong bản build web; chỉ viewer/package đã chuyển hẳn sang dự án độc lập.
