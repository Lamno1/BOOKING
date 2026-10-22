# Tidal — render và UI, 01/10/2026

## Thay đổi trong đợt này

- Tách pipeline mỹ thuật vào `web/src/tidal/render-quality.js`: môi trường HDR 1K được lọc PMREM, vật liệu PBR cỏ/cát (diffuse, normal, roughness), phản xạ mặt biển, nước hồ có vật liệu vật lý, SSAO và MSAA 4 mẫu. Biển có mipmap để giảm nhiễu ở xa.
- Canvas desktop dùng mật độ 1.5–2; mobile tối đa 1.5. Ảnh QA desktop 2880×1800 có canvas thực 2160×1580, không nội suy ảnh sau chụp. Không quảng cáo texture 4K/8K: bộ texture nguồn hiện là 1K.
- Lá cọ có nhiều lá nhỏ và độ cong, cụm cây dày hơn; thêm khung cửa, bồn cây ban công, sân/vườn/hồ mái, bề rộng/chiều dày dải champagne; sửa mái bị khối kính tầng trên xuyên qua.
- Sửa đường đi bị dựng mặt ngược, tránh nhấp nháy mặt nước hồ bằng tăng khoảng cách bề mặt và cải thiện khoảng gần camera. Giữ nguyên 18 tầng, catalog 112 suite, footprint tầng và roomId.
- UI theo hướng nghỉ dưỡng nền ngà/xanh, một nút chính rõ; điều khiển góc nhìn gọn; tiêu đề thu khi tương tác; camera tự thích ứng khung dọc. Desktop cuộn riêng panel, không đẩy thanh đầu ra ngoài trang.
- Modal mặt bằng có khóa focus, Escape và trả focus về nút mở. Kéo xoay không còn bị hiểu nhầm thành click. Highlight phòng/tầng không hiện lẫn ở tổng quan. Các chi tiết mặt đứng gây cản trở góc suite được ẩn cùng các phần cắt lớp khác.
- Tải lỗi HDR/texture có thông báo và môi trường dự phòng; vẫn điều hướng/chọn tầng được. Chuyển camera vẫn hủy được bằng thao tác trực tiếp, tôn trọng reduced-motion.

## Kiểm tra và tài nguyên bàn giao

Từ `02_IMPLEMENTATION/src/main/resources/web`:

1. `node src/tidal/validate.mjs`: catalog, diện tích, cửa, polygon, manifest.
2. `npm run build`: production build. Còn cảnh báo kích thước bundle Three.js trên 500 KB, không phải lỗi build.
3. `node verify-booking.cjs`: app booking cũ, add-on, persistence, My Stay, operator và mobile.
4. `node src/tidal/verify-render.mjs`: server 5174; desktop chọn tầng 03/15, TS-1501, tour, giữ ngày; keyboard modal; mobile touch/reduced-motion; chặn toàn bộ tài nguyên để kiểm tra fallback. Kết quả và nhịp khung hình quan sát trên Chrome headless ở `qa-tidal-render-results.json`; không phải cam kết FPS cho mọi thiết bị.
5. `node src/tidal/capture.mjs`: ảnh nhiều hướng, cận cảnh và `qa-tidal-selection-flow.mp4`; kết quả đã qua một lượt sau nâng render. Các test chờ nội dung xuất hiện thay vì giả định React đã cập nhật ngay sau click.

Ảnh: `qa-tidal-render-desktop-2x.png`, `qa-tidal-render-mobile-2x.png`, `qa-tidal-render-facade-2x.png`, `qa-tidal-render-pool-2x.png`, `qa-tidal-render-suite-2x.png` trong thư mục web. `qa-tidal-render-before.png` giữ ảnh trước đợt này; góc mở và bố cục đã đổi nên không coi là cặp so sánh pixel cùng camera.

Texture/HDR CC0 Poly Haven lưu cục bộ tại `web/public/tidal-assets`; đường dẫn nguồn và giấy phép trong `SOURCES.md`. Không dùng ảnh AI làm phông thay thế mô hình 3D. Scene có thể tái tạo từ source, không có phụ thuộc công cụ Blender bên ngoài.

## Chưa đạt và không tuyên bố đã hoàn thành

Cảnh đã có vật liệu nguồn và pipeline render tốt hơn, nhưng kiến trúc/nội thất vẫn là procedural concept, chưa đạt ảnh thực của resort. Công trình phụ, bờ biển, cây và đồ nội thất còn cần hình học/vật liệu giàu chi tiết hơn; chưa có GI bake hoặc mô hình kiến trúc hoàn thiện được duyệt. Suite là dollhouse, không phải hành trình camera 360 thực. Không thay đổi các phần này thành tuyên bố "photoreal" chỉ vì xuất ảnh có nhiều pixel.

Booking Tidal vẫn là draft trong phiên, chưa có tồn phòng/giá/backend. App booking một phòng ở `/` được giữ nguyên. Không viết lại plan sáu bước và không thay manifest.
