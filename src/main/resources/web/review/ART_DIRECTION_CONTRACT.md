# Review 03 — hai phương án mỹ thuật

## Xem lại lựa chọn — duyệt mỹ thuật V2, chưa duyệt mở bán

Người dùng duyệt V2 về mỹ thuật/bố cục để làm màn hình xem lại trong review. Job: kiểm tra đúng căn, ngày, khách, gói, quyền lợi và lịch mua thêm trước khi quay lại sửa. Giữ B nền than ấm, ảnh nhỏ định danh phòng, thông tin có thứ bậc và tổng tiền rõ; không đòi đăng nhập, không thu tiền/lưu đơn. Chỉ lưu đầu vào lựa chọn trong sessionStorage riêng review, tính lại từ catalog/offer; không lưu dữ liệu cá nhân. Không hiện tầng chưa xác minh. Target1440x900 và390x844; mobile tổng cố định và nút sửa dễ chạm. Các trạng thái: loading có thông báo/khung ổn định; chưa chọn có đường về phòng; dữ liệu lỗi hoặc thiếu lịch có nút sửa, giữ đầu vào; ảnh concept và chính sách đề xuất là partial; thành công thể hiện bản tóm tắt tính lại đúng. Permission không áp dụng vì review công khai. Kiểm tra B→xem lại→sửa→xem lại/reload, nhiều dịch vụ và ngày, giữ giá/quyền lợi/flight, không tự bỏ dịch vụ.

## B + nội dung V2 — 20.10.2026

Giữ mỹ thuật B và gallery03.2; lấy thứ tự khách hiểu phòng trước, chọn gói sau từ bộ DESIGN_BEFORE_BUILD V2. Thêm phần sinh hoạt3khu, mỗi khu mở đúng ảnh nguồn; không dùng mockup imagegen làm ảnh trang web hoặc nâng ảnh concept thành bằng chứng mặt bằng. Nội dung chưa xác nhận được gom trong details thay vì hiển thị dài liên tục. Sau lựa chọn gói có tách tiền phòng/nâng gói/mua thêm/tổng, cùng lịch trà và lịch sáng theo gói. Không phát sinh dịch vụ hoặc cam kết thương mại mới. A và booking chính độc lập.

Kiểm tra1440x900/390x844; mở ảnh khu ngủ/phòng tắm đúng, Escape trả focus; details dùng Enter; đổi gói cập nhật tổng1.700.000/1.940.000, phụ trội0/240.000 và ẩn/hiện lịch sáng. Lưu bv2-room/quote-desktop/mobile và bv2-evidence.json. Các trạng thái gallery loading/error/retry và reduced-motion giữ triển khai đã kiểm tra03.2, không ghi nhận như test mới.

## B / tương tác 03.2 — 20.10.2026

Tiếp tục hướng B đã chọn: nhiệm vụ chính là xem rõ các góc của Studio R-101 và biết gói nào đang được chọn. Primary action: mở ảnh, chuyển góc, đóng về đúng vị trí; chọn gói cập nhật quyền lợi và tổng kỳ nghỉ ngay. Ảnh nền than ấm và nhấn xanh được giữ. Target 1440x900 và390x844.

Gallery native dialog có thumbnail, bàn phím trái/phải/Escape, vuốt, zoom/kéo. Khung cố định; giữ ảnh cũ cho đến khi ảnh mới decode xong, fade160ms; lúc tải hiện trạng thái và vẫn đóng được. Lỗi giữ ảnh sẵn có, cho thử lại/chọn ảnh khác. Không có tìm kiếm nên empty không áp dụng. Partial: ghi rõ concept AI và giới hạn nguồn724x543. Success là lựa chọn cục bộ đồng bộ, không lưu đơn. Permission không áp dụng cho trang công khai.

Ảnh được cắt từ nguồn thành WebP160/400/724px, không upscale. Hero ưu tiên tải; ảnh dưới lazy; thumbnail và ảnh chất lượng cao của các góc khác tải khi mở gallery. Motion ưu tiên opacity/transform, không chiếm cuộn; hỗ trợ prefers-reduced-motion và tùy chọn giảm chuyển động trên trang. Kiểm tra bản chạy, ảnh lỗi/phục hồi, bàn phím/focus, vuốt/zoom/kéo và giá1.700.000/1.940.000. Không đưa thay đổi này vào booking chính. Bằng chứng: b032-evidence.json; số đo cache local có giới hạn được ghi trong b032.html.

## B / tinh chỉnh 03.1 — hướng được chọn

Giữ riêng ngôn ngữ B. Phản hồi duyệt: ảnh bị tối toàn bộ, chữ mảnh và gallery nhỏ xếp bậc thang. Sửa lớp phủ chỉ tập trung phía chữ (desktop bên trái, mobile phía dưới), phần ảnh còn lại không phủ đen. Tăng độ đậm chọn lọc, giữ kích thước chung. Gallery một ảnh bếp lớn, hai ảnh tắm/giường bổ trợ thẳng hàng. Thanh ngày/giá đổi về than ấm, xanh nhạt chỉ nhấn CTA và gói ăn sáng. A, nội dung, giá và luồng nghiệp vụ không thay đổi. Kiểm tra lại 1440x900 và390x844; lưu ảnh B cũ và bộ mới tên b031 để đối chiếu.

Màn hình: chi tiết Studio R-101 / chọn gói cho 2 khách, 14–16/11/2026. Mục tiêu người xem: cảm nhận căn phòng, hiểu tiện nghi, so sánh hai gói. Hành động chính dẫn tới gói trên cùng trang; liên kết riêng mở bản nghiệp vụ 02.1, không giả vờ đặt phòng từ mockup.

Hai hướng có cùng nội dung, ảnh, giá và thứ tự thông tin. A: trang tạp chí sáng, ảnh lệch trục, Cambria + Segoe UI, đất nung; B: ảnh nhập vai, bố cục tràn khung, Segoe UI, than ấm và xanh lá nhạt. Hình nhận diện s/ như khe cửa; không dùng vàng/in nghiêng để giả cảm giác cao cấp. Font hệ thống hỗ trợ tiếng Việt, không phụ thuộc tải font bên ngoài.

Phân cấp: ảnh phòng → tên/diện tích/sức chứa → ngày và giá → các góc gallery → gói và điều kiện. Giảm hộp viền; dùng khoảng cách và đường kẻ phân khu. Đây đáp ứng phản hồi Review 02 về giao diện giống biểu mẫu, thiếu nhịp ảnh và thứ bậc chữ.

Đích kiểm tra: 1440x900 và 390x844 cho cả A/B. Kiểm tra không tràn ngang, ảnh tải đủ, chữ Việt không bị cắt, giá/CTA rõ, tab/focus hoạt động, chạm tối thiểu44px, giảm chuyển động. Không thay đổi selection.html, database hoặc booking chính.

Trạng thái: trang tĩnh không có dữ liệu mạng/API, không có đăng nhập, lưu đơn hoặc tính khả dụng. Loading/empty/error/success/permission của giao dịch không áp dụng; ảnh concept chưa xác minh thể hiện trạng thái partial rõ bằng nhãn và chú thích. Chi tiết điều kiện mở bằng details native. Không bổ sung tính năng nghiệp vụ.
