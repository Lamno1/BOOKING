# STAYOS — kiểm tra độc lập sau sửa, 16/10/2026

Đối chiếu QA_FIXES_2026_10_16.md bằng thao tác trình duyệt trên web localhost:5174, API localhost:8080. Không sửa mã ứng dụng, không tạo booking hoặc dịch vụ mới. Không chạy lại bộ 11 kiểm thử; kết quả dưới đây là kiểm tra UI độc lập.

## Đã xác nhận

- Đăng xuất và đăng nhập lại tài khoản QA cũ thành công.
- Mở Kỳ nghỉ của tôi: đơn ST-FA115019 / I-103 / 16–18/10/2026 / 4 khách vẫn đã hủy. Không còn chương trước–trong–sau lưu trú. Có thông báo không giữ phòng và nút tìm kỳ nghỉ mới.
- Tóm tắt hiện tiền phòng đã lưu 1.500.000đ (750.000đ/đêm), dịch vụ 650.000đ, tổng trước khi hủy 2.150.000đ. Hiện chính sách đã lưu cùng đơn và dịch vụ bữa tối đã hủy. Đã đối chiếu với kết quả thử ngày 15/10; không thay đổi giá danh mục để thử snapshot trong lượt này.
- Hỗ trợ: nhập nguyên câu 'Tôi cần thêm khăn tắm và hỏi mật khẩu Wi-Fi'. Trả lời khăn cần xác nhận, chưa có dữ liệu mật khẩu, chưa chuyển nhân viên; không đề xuất dịch vụ trả phí.
- Dịch vụ có mô tả riêng; bữa tối ghi rõ chưa chốt số suất/thực đơn/cơ sở, 650.000đ không đồng nghĩa đủ cho toàn bộ nhóm.
- Đã xem ảnh viewport điện thoại mô phỏng 390×844: trang chủ và hồ sơ đơn hủy hiển thị, menu hoạt động. Đây chưa phải kiểm thử thiết bị thật hoặc toàn bộ màn hình. Chuỗi mã đơn/ngày dạng ISO bị ngắt dòng khó đọc; thông báo hủy nằm sau khối tóm tắt vẫn nhấn mạnh tổng tiền.

## Đánh giá

Bốn thay đổi được báo cáo có kết quả quan sát phù hợp. Trải nghiệm quản lý đơn hủy đã rõ hơn. Phần hỗ trợ hiện trung thực về giới hạn, nhưng chưa có kênh phục vụ khách thật. Phần dịch vụ hiện mô tả được điều chưa biết, chưa định nghĩa được sản phẩm bán cho khách. Không coi các lời ghi chú là hoàn thành quyền lợi tặng kèm hoặc định mức dịch vụ.

Ảnh/địa chỉ/liên hệ thực tế, gallery, gói quyền lợi và khả năng phục vụ vẫn là các việc chưa hoàn tất theo báo cáo triển khai. Chưa đủ cơ sở mở bán. Ưu tiên tiếp theo: chốt nội dung thực tế và bảng gói/định mức có thể duyệt, sau đó triển khai trải nghiệm chọn phòng/gói hoàn chỉnh; tránh chỉ tiếp tục thêm thông báo 'chưa có'.
