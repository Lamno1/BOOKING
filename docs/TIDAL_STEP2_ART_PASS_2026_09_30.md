# Tidal Sanctuary — visual pass Bước 2 (30/09/2026)

Đây là báo cáo trạng thái triển khai, không thay thế plan sáu bước hoặc manifest v2. Góc đối chiếu cố định là camera tây nam mặc định trong `src/tidal/scene.js` (`[-165,-185,145]`, nhìn tới `[-24,-18,19]`). Ánh sáng cùng cấu hình sun/hemisphere của scene; ảnh trước được lưu trước khi chỉnh hình học đợt này.

## Cảnh nguồn và bằng chứng

- `src/tidal/resort-art.js`: nguồn procedural có seed cố định cho mái oculus, hồ, lan can, dải champagne, công trình phụ, sàn/cầu và cụm cây; không chứa logic chọn tầng/phòng.
- `src/tidal/scene.js`: môi trường biển/trời, ánh sáng, các khối manifest và liên kết scene với logic lựa chọn.
- `qa-tidal-step2-before-southwest.png` ↔ `qa-tidal-step2-after-southwest.png`: cùng pose tây nam và cấu hình ánh sáng; mặt nước có chuyển động nhẹ nên từng pixel không thể trùng tuyệt đối.
- `qa-tidal-step2-facade-close.png`, `qa-tidal-step2-pool-close.png`, `qa-tidal-step2-spa-close.png`, `qa-tidal-step2-dining-close.png`, `qa-tidal-step2-pavilion-close.png`: kiểm tra cận từ browser thật.
- `qa-tidal-step2-floor03-after-pavilion.png`: kiểm tra trường hợp chọn pavilion rồi vào tầng 03. Ảnh cho thấy viền ở tầng 03, không còn viền pavilion. `qa-tidal-selection-flow.mp4` ghi thêm luồng chọn phòng/tour/booking.

## Thay đổi đã kiểm tra

- Biển: bỏ sóng giao nhau dạng ô, dùng nhiều hướng sóng không đồng chu kỳ, nhiễu biến thiên, lớp nước nông và haze theo khoảng cách.
- Tháp: ban công có soffit và lan can kính/kim loại, mặt kính có mullion/fins, podium có lớp kính và cột, hai dải champagne là mesh dày có bracket chứ không phải đường tube đơn.
- Hồ: tạo mặt bằng hơi bất đối xứng với deck, thành, coping và mặt nước riêng; có ghế, dù và bóng tiếp xúc ở mức concept.
- Đảo/công trình phụ: cụm dừa không đều, cây bụi/đá, cầu có ván và cọc; spa, nhà hàng, pavilion có mái mở, nan che, cột và vài chi tiết nội thất.
- Highlight: khi chuyển từ pavilion sang tầng, trạng thái đối tượng về tháp; đường viền landmark theo cạnh mesh thay vì hộp bao chữ nhật.

## Cổng chất lượng chưa đạt

Ảnh cận vẫn chưa ở mức ảnh concept/kiến trúc hoàn thiện. Tháp còn là hình học tham số với panel kính lặp; địa hình, cây và nội thất công trình phụ chưa đủ chi tiết, vật liệu chưa có phản xạ/micro-surface đúng như ảnh tham chiếu. Tìm trong `02_IMPLEMENTATION` không thấy `.glb`, `.gltf`, `.blend`, texture normal/roughness/metallic hay `.hdr/.exr`. Ảnh AI và JPG phòng hiện có là tham chiếu, không thay thế được mesh hoặc bộ vật liệu đó.

Để qua cổng Bước 2 cần tối thiểu: mô hình facade/podium/roof có profile được duyệt; mesh cảnh quan/cây/đồ ngoài trời đúng tỷ lệ; bộ texture PBR có bản quyền và môi trường HDRI/ánh sáng tham chiếu. Sau khi nhập phải kiểm tra lại góc tây nam và cận trên máy thật, đặc biệt bóng tiếp xúc, kính và hiệu năng. Không dùng ảnh AI phủ nền để tuyên bố cảnh 3D đã đạt.

## Kiểm thử

`node src/tidal/validate.mjs`, `npm run build`, `node src/tidal/capture.mjs` và `node verify-booking.cjs` cần được chạy lại khi bàn giao cuối đợt. Browser QA chụp và kiểm tra luồng ở Chrome desktop/mobile emulation, không ghi nhận lỗi trang hoặc tràn ngang. Chưa có baseline pixel-regression được phê duyệt, kết quả visual regression tự động là **inconclusive**; chưa đo Web Vitals/FPS chuẩn hoặc kiểm tra iOS/Android máy thật.
