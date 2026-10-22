# STAYOS — bàn giao để duyệt

Bộ thiết kế ngày 14/10/2026; kiểm tra bổ sung ngày 15/10/2026. Đây là sản phẩm xem duyệt, không phải kế hoạch triển khai hay thông báo sẵn sàng mở bán.

## Xem sản phẩm

- Bộ duyệt gồm bằng chứng, 8 màn hình, bảng gói và checklist: http://127.0.0.1:5174/review/index.html
- Bấm thử hành trình: http://127.0.0.1:5174/review/prototype.html?screen=home
- Nguồn: `src/main/resources/web/review/`. Ảnh chụp nằm trong `review/screenshots/`.
- Chạy riêng bản duyệt: tại `src/main/resources/web`, chạy `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`. Không cần backend cho mockup. Không mở HTML bằng file:// vì dữ liệu được tải bằng fetch.
- Build phát hành vẫn chỉ có index/admin; không đưa review hoặc gói chưa duyệt vào web chính.

## 1. Lỗi dữ liệu đã sửa

Trước: API đang chạy trả `ocean / Ocean View Apartment / 2.490.000₫`; frontend trộn thêm diện tích 32 m², mã R-101 và loại Studio từ danh mục mới. Sau: cùng một bản ghi đầy đủ `R-101 · Studio / STAYOS Residence / 32 m² / 1 giường đôi / 2 khách / 850.000₫`.

- Frontend kiểm tra phiên bản, ngày và toàn bộ trường danh mục, không spread bản ghi thiếu vào bản ghi mới. Sai dữ liệu thì chặn xác nhận và báo lỗi đồng bộ.
- Server kiểm tra phiên bản, cơ sở, phòng, sức chứa, ngày và tình trạng; tự tính tiền. JSON giữ cả các trường null thay vì lược bỏ.
- Đơn mới lưu snapshot phòng, cơ sở, đơn giá và chính sách. Không tra tên hoặc giá hiện tại để viết lại đơn cũ.
- Quy tắc lịch sử: giữ nguyên payload và số tiền cũ; không tự đoán cơ sở. ID nội bộ được giữ để bảo toàn kiểm tra trùng lịch. Việc xác nhận ánh xạ phòng cũ sang phòng kinh doanh thật vẫn là điều kiện trước mở bán.

### Bằng chứng

- `data-proof.json`: trước/sau, số kiểm thử và SHA-256 từng bảng lịch sử.
- JUnit: 6 BookingApiTest + 1 DatabaseTest đạt; một test tạo booking đủ 15 phòng trên database tạm, kiểm tra snapshot và mở lại DB; bản ghi cũ không đổi.
- Frontend: 6 test đạt, gồm từ chối bản ghi thiếu/lệch/trùng và tách kiến trúc khỏi build. Build lại ngày 15/10 thành công.
- Kiểm tra trực tiếp UI: R-101 trên danh sách và chi tiết 850.000₫; checkout 15–17/10, 2 khách, không dịch vụ = 1.700.000₫. Không xác nhận đơn trong DB đang dùng. Ảnh `live-r101-checkout.jpg`.
- Read-only API smoke trước đó đạt: mọi trường của 15 phòng, 2 cơ sở, 4 dịch vụ khớp. Lần chạy lại bằng terminal trong sandbox mới bị `EACCES 127.0.0.1:8080`; không coi lần bị chặn là test đạt. UI trình duyệt vẫn đã hiển thị dữ liệu đúng.
- Hash DB thật trước/sau không đổi: 1 booking, 1 service request, 3 history entries; không thêm đơn kiểm thử vào đó.

## 2. Thiết kế và luồng đã trình diễn

Home → danh sách theo cơ sở/loại → chọn mã phòng → chi tiết → gói → mua thêm → xác nhận mô phỏng → xem lại quyền lợi. Đã chụp 4 màn hình desktop và 4 mobile; thêm màn xác nhận ở cả hai kích thước.

- R-101, 2 đêm, gói sáng + xe: 1.700.000 + 240.000 + 850.000 = 2.790.000₫; bữa sáng đã gồm +0₫.
- Kiểm tra bổ sung R-201: thẻ cập nhật giá 900.000₫ khi đổi mã; chi tiết đúng R-201; 2 đêm + gói sáng = 2.040.000₫.
- Sau khi lưu mô phỏng R-201, tìm kiếm chuyển sang Inn vẫn xem lại đúng Residence/R-201/gói sáng/2.040.000₫. Đơn mô phỏng dùng bản chụp lựa chọn, không dùng lựa chọn đang sửa.
- Đăng nhập trong mockup là mô phỏng giữ lựa chọn; không gửi thông tin tài khoản. Xác nhận chỉ ở bộ nhớ tab, không gọi API hoặc gửi email.
- Ảnh phòng ngủ/sinh hoạt là moodboard sẵn có trong workspace, chưa duyệt quyền sử dụng và không chứng minh thuộc STAYOS. Không bịa ảnh phòng tắm, địa chỉ hay hướng nhìn.

## 3. Bảng gói và quyết định

Bảng tương tác ở mục “03 Gói & giá”; nguồn `review/packages.json`. Gồm Chỉ lưu trú, Chào STAYOS, Buổi sáng thong thả; tách tiện nghi, quyền lợi và 4 dịch vụ trả phí theo đơn vị tính/cơ sở/đặt lịch. Mọi quyền lợi mới chỉ là đề xuất.

D1 giá/thuế/phí/cọc/hủy; D2–D3 trà/bữa sáng và định mức; D4–D7 dịch vụ/đối tác; D8 thông tin/ảnh thực tế; D9 phương thức thanh toán/xác nhận và lựa chọn đặt không cần tài khoản. Chưa tự hứa những quyền lợi này với khách.

## 4. Trạng thái mở bán

Danh sách chi tiết ở mục “04 Mở bán” của bộ duyệt. Nền tảng hiện có: danh mục, phòng trống, auth, lịch sử, quản trị và chống trùng lịch. Chưa hoàn tất để mở bán: ảnh/địa chỉ/chính sách thật, backend gói/quyền lợi, khôi phục mật khẩu, xác nhận email, thanh toán và tách trạng thái, hàng đợi hỗ trợ, kiểm thử vận hành/bảo mật/sao lưu.

Không coi các mockup là chức năng backend đã triển khai. Chờ duyệt thiết kế và quyết định kinh doanh trước khi thay giao diện chính.
