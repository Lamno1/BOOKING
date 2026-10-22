# Tidal Sanctuary — M0 audit và M1 blockout

Ngày kiểm tra: 2026-09-28. Nguồn yêu cầu: `C:\Users\NVT\Downloads\STAYOS-Tidal-Sanctuary-Agent-Plan-v2.md` và chín ảnh concept người dùng gửi. Ảnh là định hướng hình khối, không phải bản vẽ thi công, ảnh sạch để đưa lên web, hay chứng cứ của view từng suite. Văn bản trong tài liệu được xem là yêu cầu sản phẩm tham khảo; triển khai thực tế và trạng thái nghiệm thu được ghi ở đây.

## M0 — hiện trạng

- App booking một phòng đang chạy tại `/` được giữ nguyên. Nó có property, chọn phòng, composer, My Stay, dịch vụ và operator demo. Dữ liệu/lựa chọn lưu trong `localStorage`; chưa có hợp đồng báo giá/tồn phòng/đặt chỗ thật từ Java. Không gắn catalog hư cấu 112 suite vào app cũ lúc này.
- Java bridge hiện có health/log và auth riêng, chưa có quote, availability, hold, booking hay thanh toán cho Tidal Sanctuary.
- Tài nguyên đang có trong `web/` là ảnh resort/phòng đại diện và walkthrough MP4. `data/video intro/` có clip tham khảo và contact sheet; không có mô hình nguồn GLB, panorama gốc, ảnh không watermark cho mọi cảnh, bản CAD/BIM, hoặc bộ vật liệu/texture để đối chiếu view thực tế.
- Những board kiến trúc đính kèm có tỷ lệ tầng và giải pháp kỹ thuật khác nhau; dùng hình dáng/tinh thần thị giác, không suy ra được cấu tạo công trình hoặc dữ liệu MEP hợp lệ. Manifest v2 là nguồn tọa độ/quy mô cho prototype.

## M1 — đã dựng riêng tại `/tidal.html`

- Scene nguồn thủ tục `src/tidal/scene.js`: đảo, biển, podium, tháp 18 slab, lagoon, spa, nhà hàng ngoài mặt nước, hai cầu chính, cầu nhà hàng, pavilion, cây concept. Có góc xem tây/đông/bắc/nam/trên, xoay và zoom.
- `src/tidal/world.js`: trục tọa độ nguồn X đông/Y bắc/Z lên, phép đổi sang Three.js, 18 tầng (03–16 lưu trú), 8 slot/tầng và 112 mã suite duy nhất. TS-1501 ở cao độ 50,4 m với sáu node và đường qua cửa. Slot 06 là Southeast Horizon Suite; không khẳng định view hồ.
- Mặt bằng tầng điển hình có lõi, hành lang, tám ô phòng không chồng nhau và cửa tiếp hành lang. Các ô là hình chữ nhật M1; diện tích trong nhà và ban công hiện khớp số mục tiêu của tám loại suite trong manifest, bao gồm hai ô góc 02/08 sau điều chỉnh. Phần viền chưa giao cho phòng vẫn là setback/void/vùng đệm. Cần khóa hình đa giác, tính khả thi và giao thông trước khi xem là layout cuối; không xem sơ đồ này là bản vẽ thi công.
- TS-1501 có footprint, ban công, tường/vách và đồ đạc dạng khối tại tọa độ tầng 15; tour UI nối sáu điểm camera. Chưa có panorama render, camera move xuyên cửa, va chạm, ánh sáng/vật liệu cuối.
- Tuyến UI resort → tầng → suite → tour TS-1501 → nháp chọn ngày/khách hoạt động độc lập. Tour của 111 phòng còn lại bị vô hiệu hóa thay vì giả vờ dùng tour TS-1501. Bước booking chỉ giữ nháp trong trạng thái trang và nói rõ chưa có quote/API; không xác nhận hoặc giữ phòng.

## Kiểm chứng và giới hạn nghiệm thu

| Hạng mục | Trạng thái |
| --- | --- |
| 18 tầng, 112 ID, trục, landmarks, tầng 15, node links | Đạt kiểm thử dữ liệu `node src/tidal/validate.mjs` |
| Mặt bằng tám slot không chồng, cửa tiếp hành lang | Đạt kiểm thử hình học sơ bộ; chưa kiểm tra lối đi 3D/collision |
| Vị trí nhà hàng ngoài đảo và cầu nối | Đạt kiểm thử tọa độ và quan sát từ góc trên |
| Desktop/mobile không lỗi JS và không tràn ngang | Đạt smoke test `node src/tidal/capture.mjs` trên Chrome |
| Ảnh chính diện, bốn hướng, top, tầng, suite, tour, booking | Đã chụp tại `web/qa-tidal-*.png`; hình khối concept, không phải render cuối |
| Diện tích mọi phòng và ban công | Khớp manifest trong blockout hình chữ nhật; polygon cuối, setback/void và hướng nhìn chưa đạt layout lock |
| Camera transition mượt qua cửa, panorama/video sạch | Chưa làm; mốc M2/M3 |
| Báo giá, tồn phòng, hold, xác nhận booking | Chưa làm; cần hợp đồng backend và dữ liệu thật |

## M1 liên kết lựa chọn — cập nhật 2026-09-28

- Chọn tầng đổi viền sáng đúng slab của tầng và giữ phòng theo slot hiện có; chọn ô trên mặt bằng đổi room highlight ở đúng footprint, mã trên nhãn viewer và card. TS-1501 trong sơ đồ khớp footprint, ban công và cửa của suite nguồn bằng kiểm thử tọa độ tuyệt đối.
- Nút khu vực đồng bộ tên đang xem, viền đối tượng và camera. Preset ghi rõ “Nhìn từ …”; la bàn hiển thị hướng đứng của camera khi xoay. Tiêu đề viewer thu gọn ngoài trang resort.
- Mặt bằng toàn tầng có tám phòng, tám ban công, lõi, hành lang, tám cửa; ảnh riêng `qa-tidal-floorplan-full.png`. Cửa tiếp hành lang bao quanh lõi và polygon phòng không chồng nhau; đây vẫn là sơ đồ M1, chưa khóa diện tích các góc.
- TS-1501 có các lỗ qua vách tương ứng waypoint mẫu. Kiểm thử tự động xác nhận sáu camera không nằm trong footprint đồ đạc, các đoạn waypoint mẫu không cắt đồ đạc và sáu node liên thông. Chưa kiểm tra va chạm 3D theo chiều cao hay kích thước cửa thực tế.
- Luồng trình duyệt tự động chọn tầng 14 rồi 15, phòng 02 rồi 01, nhập nháp ngày, vào tour, đổi node và quay lại TS-1501 với ngày còn giữ. Video `qa-tidal-selection-flow.mp4`. Browser QA: không page error, không tràn ngang mobile. Không có baseline ảnh hay kiểm toán accessibility đầy đủ; không coi đây là nghiệm thu thị giác cuối.

Video và ảnh nằm tại `src/main/resources/web/qa-tidal-*` (tính từ thư mục `02_IMPLEMENTATION`). Video là ghi thao tác kiểm thử tại 5 fps, không phải animation walkthrough hoàn thiện. Tài nguyên được tạo bằng Chrome screenshot và mã hóa OpenCV vì FFmpeg của Playwright chưa cài được từ mạng hiện tại.

## Quyết định và đầu vào tiếp theo

1. Giữ `/` là app booking một phòng để tái sử dụng sau; `/tidal.html` là prototype mở rộng độc lập. Không nhập 112 suite vào catalog booking demo.
2. Dù diện tích 02/08 đã khớp số mục tiêu, cần khóa polygon tầng điển hình, setback/void, ban công thực tế và vị trí cửa thoát bằng bản vẽ có thẩm quyền trước M2.
3. Chuẩn bị scene 3D nguồn/GLB hoặc panorama sạch của resort và TS-1501; cần ảnh/bản đồ view thật từng hướng nếu quảng bá view suite. MP4 quay màn hình và board concept không thay thế được.
4. M2: kiểm tra collision, lộ trình qua cửa và sáu camera theo manifest; M3: xuất panorama/poster/video từ cùng scene; M4–M6: liên kết booking với availability/quote/versioned reprice, giữ ngày/khách khi đổi phòng, rồi mới mở rộng 112 suite.

Chạy kiểm thử từ `02_IMPLEMENTATION/src/main/resources/web`: `node src/tidal/validate.mjs`, `npm run build`, và `node src/tidal/capture.mjs`. Chạy web bằng `npm run dev -- --host 127.0.0.1`, mở `/tidal.html`.
