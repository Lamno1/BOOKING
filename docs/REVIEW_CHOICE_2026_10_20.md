# V2 → Xem lại lựa chọn — bản bấm thử

Mở http://127.0.0.1:5174/review/art-direction.html?direction=b, chọn gói rồi bấm **Xem lại lựa chọn**. Trang tiếp theo `/review/choice.html` cần lựa chọn trong cùng tab; mở ở tab mới chưa có lựa chọn sẽ hướng về xem phòng.

V2 được duyệt về mỹ thuật và bố cục, chưa duyệt thông số hay điều kiện mở bán. Màn mới giữ nền than ấm, ảnh định danh phòng, quyền lợi/lịch ở cột chính và tổng tiền bên cạnh; mobile tổng và nút sửa cố định. Có đường sửa ngày/khách, gói hoặc dịch vụ, trả về đúng phần biểu mẫu.

## Hoạt động đã hoàn thành

- Cùng một lựa chọn xuyên B → xem lại → sửa → xem lại → reload. Phòng/cơ sở, ngày, khách, gói, số lượng, lịch dịch vụ và mã chuyến bay được giữ.
- SessionStorage riêng `stayos.review.choice.v1` chỉ chứa đầu vào, không chứa tài khoản/liên hệ, giá, tổng, tầng hoặc dữ liệu booking. Metadata và giá tính lại từ catalog.json/offer-v2.json bằng quoteOffer/serviceProblems hiện có.
- Không tự tăng/giảm số lượng hoặc bỏ dịch vụ khi đổi phòng. Số khách vượt sức chứa cần được khách chỉnh. Mở lại biểu mẫu sẽ mở sẵn dịch vụ đã chọn.
- Lịch trà theo ngày đến; sáng chỉ có ngày sau mỗi đêm ở. Mỗi quyền lợi hiển thị số lượng và đã gồm+0đ. Dịch vụ mua thêm có số lượng, đơn vị, giá, ngày giờ, flight/điểm đón khi có, trạng thái lịch mong muốn chưa được xác nhận.
- Chặn ngày quá khứ, ngày đảo ngược, quá sức chứa, dịch vụ thiếu lịch/không đủ lead time. Mở trực tiếp review với dịch vụ thiếu lịch vẫn hiển thị lỗi cụ thể và nút sửa, giữ đầu vào.
- Không có “Tầng 1” trong luồng B/editor/xem lại. Floor vẫn giữ trong catalog demo nội bộ. Bỏ nhãn Tầng1 khỏi thông tin HTML của bộ thiết kế V2; ảnh concept nguồn lưu nội bộ vẫn là tài liệu cũ, không dùng làm ảnh giao diện mới.
- Trường hợp đang chọn Inn mà mở trang conceptR-101: chỉ xem tham khảo; không ghi đè phòng/dịch vụ đã lưu. Chỉnh phòng qua biểu mẫu giữ đầu vào và kiểm tra lại sức chứa.

## Kết quả kiểm tra

| Kịch bản thao tác thực | Kết quả |
|---|---|
| R-101,14–16/11,2khách,gói sáng |1.940.000;2trà+4sáng; sang editor giữ gói/ngày |
| R-101,20–23/11,2khách,sáng,2set tối21/11 18:30,xe20/11 10:00 VN123 |5.060.000;6sáng+2trà;reload/quay B đúng giá và đầu vào |
| Ngày01–03/01/2026 |Chặn tiếp tục; lỗi ngày quá khứ |
| Thêm spa chưa có ngày/giờ |Chặn; trang xem lại chỉ rõ mục thiếu; flight/dinner vẫn giữ |
| I-103,14–16/11,4khách,sáng,2set tối15/11 18:30 |3.280.000;8sáng+4trà |
| Inn4khách → Studio |Yêu cầu chỉnh về tối đa2;giữ2set tối; sau sửa tổng3.240.000 |
| Tab riêng chưa có lựa chọn |Có trạng thái trống và đường bắt đầu |

Đã kiểm tra1440×900 và390×844, không tràn ngang; nút sửa mobile và điều kiện bằng Enter hoạt động. Bộ bằng chứng `web/review/choice-evidence.json` cùng ảnh `choice-*.png`. Build và23kiểm thử đạt (5bài mới về giữ lựa chọn/tính lại/từ chối dữ liệu hỏng).

Giới hạn: chọn và lưu chỉ trong phiên tab, chưa nối booking/auth/thanh toán/DB/email. Recovery cho network failure/storage-denied có triển khai nhưng chưa ép lỗi trình duyệt để kiểm thử; dữ liệu hỏng/phiên bản sai kiểm tra ở unit test. Không đổi cài đặt OS để chứng nhận reduced-motion; màn mới không có chuyển động tự chạy. Chưa kiểm thử thiết bị iOS/Android thật.

## Tệp triển khai

`review-draft.js`:lưu đầu vào sạch và tính lại. `choice.html/js/css`:màn xem lại. `selection.js/css/html`:khôi phục/chỉnh và chuyển tới xem lại. `b-interactions.js`:truyền và khôi phục lựa chọn, giữ phòng khác đang lưu. Booking chính, DB và lịch sử đơn không thay đổi; dữ liệu chỉ GET từ JSON trong review.
