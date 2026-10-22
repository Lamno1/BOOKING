# Tidal — tích hợp nội thất 112 suite, 02/10/2026

## Phạm vi đã triển khai

Tiếp tục trên dự án hiện có, không viết lại booking và không đổi tọa độ/diện tích/hướng manifest v2. Tầng 03–16 × tám slot = 112 mã phòng có thể mở nội thất. Tám layout là tám template tái sử dụng theo tầng, **không phải 112 thiết kế nội thất riêng**.

- `src/tidal/suite-layouts.js`: bố trí nội thất, tọa độ local → world, sáu camera/phòng, footprint va chạm và đường đi A*. TS-1501 giữ vị trí cửa/camera/fixture đã khóa. Slot 02–08 bố trí mới trong bounds đã khóa; cặp phòng hướng đông có mặt bằng riêng theo chiều ngang dài.
- `src/tidal/suite-model.js`: geometry giường/chăn/gối, sofa/đệm, bàn ghế, pantry/tủ/bồn rửa, lavabo/gương, vòi sen/vách kính, WC, TV, rèm gấp, sàn ghép, cây, bàn ghế và lan can ban công. Vật liệu gỗ/đá/vải sinh ở runtime; không dùng ảnh AI che mô hình.
- `scene.js`: mặt cắt tám phòng của tầng đang chọn, tổng thể một suite, tour tầm mắt đúng cao độ tầng; thu vùng shadow map khi vào phòng. Tám model tái sử dụng để tránh nạp đồng thời 112 nội thất.
- `tidal.jsx`: sáu node có chuột/bàn phím/cảm ứng; sơ đồ ứng với roomId; giữ node khi quay lại cùng phòng, reset về lối vào khi đổi phòng/tầng; giữ nháp ngày ở. Bộ góc nhìn resort không còn xuất hiện trong tour làm nhảy nhầm ra ngoài.
- Cửa ra ban công để mở theo manifest, không đặt một tấm kính liên tục chắn đường đi. Bổ sung vùng va chạm cho ghế ăn, tủ đầu giường, bàn ban công và cây.

Tour là di chuyển theo điểm trong mô hình 3D, có thể kéo nhìn quanh. Chưa có điều khiển đi tự do WASD. Chuyển động có thể ngắt; reduced-motion chuyển thẳng tới node. Mọi đường giữa node được tìm lại từ vị trí camera thực nếu người dùng ngắt giữa chừng.

## Kiểm thử và bằng chứng

Kết quả chạy cuối: geometry PASS; mở 112/112 phòng PASS; keyboard, ngắt/reset, giữ nháp và ba breakpoint PASS; console errors 0, HTTP lỗi 0. Render/fallback PASS; booking regression PASS; video capture PASS (79 frame); production build PASS với cảnh báo kích thước bundle bên dưới.

Chạy tại `02_IMPLEMENTATION/src/main/resources/web`:

```text
npm run dev -- --host 127.0.0.1 --port 5174
node src/tidal/validate.mjs
node src/tidal/validate-suites.mjs
node src/tidal/verify-suites.mjs
node src/tidal/verify-render.mjs
node verify-booking.cjs
node src/tidal/capture.mjs
npm run build
```

`validate-suites.mjs` kiểm tra 112 phép đặt bounds/ban công/cửa/cao độ, 672 tọa độ camera world, diện tích tám template, footprint đồ đạc không vượt bounds/chồng nhau/cắt tường, và **240 tuyến có hướng** giữa mọi cặp node khác nhau của tám template. Footprint là kiểm tra hình học 2D, không phải chứng nhận thiết kế/thi công hay kiểm tra mọi tam giác mesh.

`verify-suites.mjs` mở thật 112 phòng qua UI, kiểm tra roomId, model hiển thị, camera cao độ và ra ban công ở mọi phòng; đi sáu node của cả tám template tại tầng 15; kiểm tra quay lại/nháp ngày ở, bàn phím, ngắt/reset, cảm ứng, reduced-motion và overflow ở 375/768/1440 px. Kết quả máy đọc nằm trong `qa-tidal-suite-browser.json`; không diễn giải 672 node hình học thành 672 lần kiểm thử UI.

`verify-render.mjs` kiểm tra buffer render mật độ cao, giữ nháp booking, dialog focus trap, mobile touch/reduced-motion, vẫn dùng được khi toàn bộ HDR/PBR tải lỗi. `verify-booking.cjs` kiểm tra hồi quy app booking cũ tại `/`.

Đầu ra trong thư mục web:

- `qa-tidal-suite-geometry.json`: coverage hình học 112 phòng / 672 node.
- `qa-tidal-suite-browser.json`: coverage UI, console/network, ba breakpoint.
- `qa-tidal-render-results.json`: render/fallback/state; số đo frame headless chỉ là smoke test, không chứng minh FPS trên điện thoại thật.
- `qa-tidal-all-eight-floor15.png`: tám phòng có nội thất trên cùng tầng.
- `qa-tidal-suite-TS-1501-living.png`, `qa-tidal-suite-TS-1501-bedroom.png`; tương tự mã TS-1502 đến TS-1508 cho từng layout và góc overview.
- `qa-tidal-rooms-375.png`, `qa-tidal-rooms-768.png`, `qa-tidal-rooms-1440.png`.
- `qa-tidal-selection-flow.mp4`: ghi thao tác thật qua tầng/phòng/tour/booking; ghép screenshot ở 5 fps để xem luồng, **không dùng để đánh giá độ mượt/FPS runtime**.

## Giới hạn chất lượng / nghiệm thu

Đây đã là nội thất có geometry và camera bên trong cho đủ danh mục, nhưng **chưa đạt photoreal**: chất liệu vải/đá/gỗ còn procedural, chưa có bộ furniture scan cao cấp, GI/light bake và texture độ phân giải cao được duyệt. Mirror là vật liệu kim loại phản chiếu môi trường, chưa phản chiếu toàn phòng chính xác. Ngoại cảnh là resort concept dựng bằng code, không phải ảnh view thực của khách sạn. Phần diện tích dự trữ/void của mặt bằng gốc chưa được thiết kế kiến trúc chi tiết; không tự lấp hoặc đổi manifest.

TS-1501 giữ sáu điểm nhìn đã khóa nên góc camera không tùy ý dời chỉ để chụp đẹp. Cao độ/hướng đúng mô hình không chứng minh view thực địa đã được kiểm chứng.

Booking Tidal chỉ giữ nháp trong phiên; chưa có giá/tồn phòng/backend thật. Booking app `/` giữ nguyên. Không tạo đơn hoặc thanh toán thực trong QA.

Theo quy trình `browser-qa`, kiểm tra keyboard/touch và ảnh ba breakpoint tách khỏi kiểm tra thẩm mỹ: **visual regression INCONCLUSIVE** vì chưa có baseline nội thất được duyệt. Chưa chạy axe/screen reader, chưa đo đầy đủ Core Web Vitals hay kiểm tra thiết bị mobile vật lý. Build còn cảnh báo bundle Tidal >500 kB (Three.js và renderer), không phải lỗi build.

Nghiệm thu phạm vi tích hợp phòng dựa trên JSON QA; chưa nghiệm thu mục tiêu “giống ảnh chụp thực”, toàn bộ accessibility, hoặc vận hành booking production.
