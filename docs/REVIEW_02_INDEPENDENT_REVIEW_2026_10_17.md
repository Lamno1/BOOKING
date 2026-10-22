# Review 02 — đánh giá độc lập ngày 17/10/2026

## Kết quả xác nhận

- Trên trình duyệt: I-103, 4 khách, 14–16/11/2026; chọn gói ăn sáng và 2 set tối. Tổng đúng 3.280.000đ, gồm phòng 1.500.000đ, nâng gói 480.000đ, hai set tối 1.300.000đ. Phiếu mô phỏng hiện 8 suất sáng, 4 ly trà và tổng này.
- Gói trà không tăng tiền phòng; ăn sáng được diễn đạt là nâng gói có phụ trội. Dịch vụ trả thêm ban đầu không chọn.
- Gallery có nhãn AI/concept và các góc phòng riêng; bảng điều kiện đã có đơn vị, định mức và phạm vi cụ thể. Đã xem nguồn contact sheet phòng bốn và ảnh mobile bàn giao; không coi ảnh bàn giao là ảnh tự chụp kiểm tra mới.
- Mã tạo phiếu lưu HTML riêng trong state.receipt và không tính lại phiếu cũ khi đổi lựa chọn. Chưa xác nhận lại thao tác đổi phòng sau tạo phiếu bằng UI vì công cụ trình duyệt treo trong lúc chụp màn hình.

## Cần chỉnh trước khi duyệt tích hợp

1. **Chặn ngày quá khứ.** Input ngày không có min và logic chỉ nhận số đêm; không kiểm tra ngày đến với ngày hiện tại. Chạy trực tiếp quoteOffer với I-103, 4 khách, 01–03/01/2026 vẫn nhận báo giá gói ăn sáng 1.980.000đ. Đây là kiểm tra logic/mã nguồn, chưa phải tái hiện UI ngày quá khứ. Bổ sung kiểm tra cùng điều kiện ở client và server khi tích hợp.
2. **Chưa chọn lịch dịch vụ.** Form có số lượng nhưng không có ngày dùng bữa tối, giờ massage, ngày tour, giờ/chuyến bay xe đón. Phiếu chỉ chép khung giờ chung. Không thể kiểm tra hạn đặt trước 12/24 giờ hoặc biết hai set được phục vụ ngày nào. Cần trường lịch theo dịch vụ, kiểm tra lịch và thể hiện lịch đã chọn trong phiếu; trường hợp chờ xác nhận phải có trạng thái rõ.
3. **Hai gói giá giống nhau nhưng một gói ít quyền lợi hơn.** Chỉ lưu trú và Chào STAYOS cùng giá, trong khi gói sau thêm trà mà không có điều kiện bất lợi. Cần chốt trà là quyền lợi mặc định hoặc biến hai lựa chọn thành khác biệt có ý nghĩa; không tăng số lựa chọn không cần thiết.
4. **Mobile phải tiếp cận tổng tiền dễ hơn.** Trong CSS mobile, summary bị đưa xuống sau cả bốn mục mua thêm dài, không sticky. Cần tổng tiền/nút xem phiếu luôn dễ tìm và dịch vụ mở rộng theo nhu cầu. Chưa kết luận có tràn màn hình trong bản hiện tại.
5. **Đừng mất dịch vụ đã chọn một cách im lặng.** Handler đổi phòng reset quantities về rỗng. Cần giữ các dịch vụ dùng được ở cơ sở mới hoặc báo rõ lựa chọn nào bị bỏ và lý do.

## Đánh giá

Đây là tiến bộ thực chất về bản mẫu chọn gói, định mức và trình bày quyền lợi; có thể tiếp tục phát triển theo hướng này. Chưa nên duyệt toàn bộ để tích hợp nguyên trạng, chưa phải booking thật. Việc duyệt concept mỹ thuật không đồng nghĩa duyệt tính chính xác phòng thực tế hoặc giá/đối tác kinh doanh. Không sửa ứng dụng, không tạo booking hoặc ghi lịch sử cơ sở dữ liệu trong lượt này.
