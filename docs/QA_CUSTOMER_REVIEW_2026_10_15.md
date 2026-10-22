# STAYOS — kiểm tra với vai trò khách hàng, 15/10/2026

## Phạm vi

Thao tác trực tiếp trên http://127.0.0.1:5174 với API localhost:8080. Khách mới, tạo tài khoản QA riêng; không thanh toán. Đã xem desktop và thử menu, lịch sử, hủy đơn trong viewport điện thoại 390×844. Công cụ chụp màn hình bị treo sau chuyển viewport, nên chưa xác nhận chất lượng hình ảnh mobile hoặc hiệu năng trên thiết bị thật. Không sửa mã ứng dụng trong lượt đánh giá.

## Kịch bản và kết quả

1. Chọn STAYOS Inn và 4 khách: danh sách còn I-103 (4 khách) và I-201 (6 khách).
2. Xem I-103: 34 m², 2 giường đôi, tối đa 4 khách, 750.000đ/đêm. Tab ảnh báo chưa có ảnh xác thực. Địa chỉ, khoảng cách đến biển, đỗ xe và liên hệ chưa có dữ liệu xác minh.
3. Checkout I-103, 16–18/10/2026, 4 khách: tiền phòng 1.500.000đ. Tạo tài khoản từ checkout thành công; phòng, ngày và số khách được giữ; tên/email được điền theo tài khoản.
4. Chọn bữa tối hải sản 650.000đ: tổng 2.150.000đ. Xác nhận lưu đơn ST-FA115019 thành công, đúng phòng/ngày/số khách/tổng. Đơn hiện 'Đã xác nhận', bữa tối 'Chờ xác nhận'; chưa thu tiền.
5. Tải lại ứng dụng sau thay đổi viewport: phiên còn đăng nhập; xem lại đơn vẫn đúng. I-103 chuyển sang đã có khách, nút chọn phòng bị vô hiệu cho ngày vừa đặt.
6. Concierge: nhập 'Tôi cần thêm khăn tắm và hỏi mật khẩu Wi-Fi' → đề xuất 'Bữa tối hải sản', giá 650.000đ. Sai nhu cầu.
7. Trên viewport điện thoại: mở Menu → Kỳ nghỉ của tôi → Hủy đặt phòng → Xác nhận hủy. Đơn và dịch vụ đều chuyển 'Đã hủy'. Không giữ phòng bằng đơn QA sau thử nghiệm. Tài khoản và lịch sử QA được giữ làm bằng chứng.

## Điểm đã cải thiện so với lần xem trước

- R-101 hiện đúng tên Studio, giá 850.000đ; không còn hiện Ocean View Apartment giá 2.490.000đ trong lần mở này.
- Tìm theo cơ sở và sức chứa hoạt động trong kịch bản đã thử.
- Tính tiền, đăng ký nối tiếp checkout, lưu và hủy đơn hoạt động trong kịch bản đã thử.
- Hiển thị giờ nhận/trả phòng, phí/cọc và chính sách mô phỏng trước xác nhận.

## Các vấn đề cần sửa

- **Cao — nội dung để quyết định đặt:** chưa có gallery thật, địa chỉ/bản đồ/liên hệ xác minh. Khách chưa đủ thông tin để quyết định trả tiền. Không tự tạo dữ liệu thực tế để lấp chỗ trống.
- **Cao — quyền lợi tặng kèm:** luồng đã thử chỉ có dịch vụ trả thêm; không có lựa chọn gói với quyền lợi bao gồm, định mức người/lần hoặc điều kiện hưởng.
- **Cao — concierge sai nhu cầu:** khăn/Wi-Fi bị dẫn sang bán bữa tối. Cần trả lời không hỗ trợ hoặc chuyển yêu cầu cho nhân viên khi không hiểu.
- **Vừa — mô tả dịch vụ:** checkbox checkout không cho biết bữa tối cho mấy người, thực đơn, lịch dùng hoặc đơn vị tính; nhóm thử có 4 người nhưng không thể biết giá 650.000đ phục vụ bao nhiêu người.
- **Vừa — trạng thái sau hủy:** vẫn hiện toàn bộ chương trước/đang/sau kỳ nghỉ và nút concierge. Cần hiển thị rõ đơn đã kết thúc và hành động phù hợp.
- **Vừa — thông tin sau đặt:** trang kỳ nghỉ có tổng tiền và yêu cầu dịch vụ nhưng thiếu tóm tắt chi phí, điều kiện đã chấp nhận và hướng dẫn đến nơi có thể sử dụng thực tế.
- **Vừa — sức hút giao diện:** trang đầu vẫn là khối chữ giới thiệu hai cơ sở; danh sách/chi tiết dựa trên sơ đồ minh họa chung. Có cấu trúc nhưng chưa diễn tả trải nghiệm lưu trú.

## Kết luận

Đã có tiến bộ thực chất ở luồng nghiệp vụ và dữ liệu hiển thị. Chưa đạt để mở bán: thông tin phòng, quyền lợi gói và hỗ trợ khách vẫn thiếu. Điểm cảm nhận trải nghiệm khách hiện tại: khoảng 4/10; đây là đánh giá định tính, không phải số đo chuyển đổi hay chứng nhận kỹ thuật. Chưa kiểm thử thanh toán, email, quản trị, cạnh tranh đặt phòng đồng thời hoặc toàn bộ 15 phòng.
