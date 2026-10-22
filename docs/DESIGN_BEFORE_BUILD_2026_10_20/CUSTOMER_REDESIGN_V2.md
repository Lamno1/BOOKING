# V2 — tự đóng vai khách hàng để làm lại

## Vì sao bản 01 chưa đủ

Bản 01 dồn phần lớn diện tích vào ảnh hero và hai thẻ giá, thiếu góc nhìn phòng tắm, khu bếp và cách các khu vực liên hệ. Hình đồ ăn còn không khớp đề xuất bánh mì trứng. Nó thể hiện phong cách B nhưng chưa giúp khách hình dung sinh hoạt trong phòng.

## Bản làm lại trả lời câu hỏi của khách

| Câu hỏi của khách | Nội dung được thêm |
|---|---|
| Tôi ở phòng nào, rộng bao nhiêu, mấy người? | R-101, 32 m², tầng 1, một giường đôi, tối đa 2 khách |
| Khu ngủ có tách riêng không? | Nói rõ concept studio có giường/bếp/khu sinh hoạt trong cùng không gian; không gọi là phòng ngủ đóng cửa riêng |
| Bếp và phòng tắm trông ra sao? | Tổng thể + ba góc riêng có chú thích; tách thông tin danh mục với đồ thể hiện trong ảnh AI |
| Có gì được xác nhận và có gì chỉ trong ảnh? | Tiện nghi theo inventory riêng; thiết bị, kích thước giường và bố trí đo đạc không suy từ ảnh |
| Tổng tiền là theo đêm hay cả kỳ nghỉ? | 2 đêm × 850.000đ, nâng gói 240.000đ, tổng 1.940.000đ |
| Ăn sáng bao nhiêu suất, dùng lúc nào? | 4 suất, 2 buổi 15–16/11; bánh mì trứng + nước suối, không phải buffet |
| Còn tiền gì, hủy thế nào? | Không tự cộng mua thêm; tách điều kiện đề xuất và lưu ý chưa thay chính sách hiện tại |
| Tôi đến đâu, đỗ xe, view gì? | Nhận diện đúng thông tin đang thiếu, không tự tạo dữ liệu để giả hoàn thiện |

Nguồn số liệu: src/main/resources/web/src/inventory.json và review/offer-v2.json. Định mức gói/chính sách review là đề xuất chờ duyệt. Số đo và cơ sở trong inventory là dữ liệu demo.

## Nội dung cần duyệt

1. Bố cục thông tin: gallery và hiểu phòng trước, chọn gói và tổng tiền sau.
2. Hai ảnh v2 được tạo bằng imagegen tích hợp: bảng giải thích phòng và mockup chi tiết. Chỉ duyệt hướng hình ảnh; không dùng làm bằng chứng phòng thật.
3. Bảng thông tin cần chủ cơ sở bổ sung trước mở bán: địa chỉ/liên hệ/bản đồ, giường/nệm/cách âm, thiết bị bếp/phòng tắm, đỗ xe/hướng nhìn/tiếp cận, lịch phục vụ và chính sách có hiệu lực.

Không tự hứa đầy đủ dữ liệu thực tế khi nguồn chưa có. Trang HTML v2 là tài liệu/bản duyệt có phép tính minh họa, không tạo đơn hoặc kết nối API. Bản cũ được giữ ở index-v1.html và product-preview.png. UML lớp và luồng tích hợp cũ vẫn là mô hình đề xuất; workflow khách mới ở guest-workflow-v2.mmd.

## Kiểm tra trước bàn giao

- Mỗi góc ảnh có chú thích và cùng loại phòng concept.
- Tổng gói = 1.700.000đ + 240.000đ = 1.940.000đ; 2 khách × 2 đêm = 4 suất sáng.
- Không thêm view biển/ban công/hồ bơi/giường thứ hai hoặc buffet.
- Màn hình hẹp có tổng tiền dễ tiếp cận; chữ đầy đủ bằng HTML thay vì chỉ nằm trong ảnh AI.
- Không sửa booking chính hoặc dữ liệu đơn cũ.

Đã kiểm tra cú pháp JavaScript của trang tài liệu và đối chiếu phép tính với inventory/offer. Chưa kiểm tra trực tiếp hiển thị HTML trong browser ở lượt này vì công cụ không cho quan sát URL file://; không coi kiểm tra mã là bằng chứng mobile đã chạy. Ảnh AI được xem và sửa chú thích/tiện nghi trước khi chọn bản cuối.
