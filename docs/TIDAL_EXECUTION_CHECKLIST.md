# STAYOS Tidal Sanctuary — checklist triển khai sáu bước

Nguồn ưu tiên: `STAYOS-Tidal-Sanctuary-Agent-Plan-v2 (1).md` (bản chốt người dùng cung cấp ngày 28/09/2026) → manifest v2 trong file đó → mô hình đã kiểm tra → ảnh concept. Checklist này ghi trạng thái triển khai; không thay thế bản plan và không thêm yêu cầu sản phẩm.

| Bước | Trạng thái | Bằng chứng / phần còn thiếu |
| --- | --- | --- |
| 1. Khối, sơ đồ, chọn phòng | **Đạt ở mức mô hình số M1** | `src/tidal/world.js`, `typical-floor-layout.json`, `validate.mjs`: 18 tầng, 112 ID, tám footprint + ban công/diện tích, lõi/hành lang/cửa, TS-1501 tây. Scene có 112 mesh mang roomId, viền tầng và lựa chọn phòng. `qa-tidal-floorplan-full.png`, `qa-tidal-selection-flow.mp4` ghi thao tác 14→15, 02→01. Không phải bản vẽ xây dựng. |
| 2. Kiến trúc, nội thất | **Đang làm, chưa đạt cổng** | Visual pass 30/09 tách nguồn art sang `resort-art.js`, có lan can/fins, dải champagne dày, hồ nhiều lớp, công trình phụ mái mở và cụm cảnh quan; ảnh cùng pose và ảnh cận trong báo cáo `TIDAL_STEP2_ART_PASS_2026_09_30.md`. TS-1501 và slot02–08 vẫn ở mức concept. Thiếu mesh kiến trúc/landscape nguồn, PBR maps, HDRI, đối chiếu view tầng15 và kiểm tra chất lượng trên máy thật. |
| 3. Tour và view | **Chưa đạt** | Sáu node và hotspot dạng sơ đồ; `doorPaths` giữ nguyên waypoint manifest, `walkRoutes` tách riêng để tránh tường/đồ. Chưa có tour 3D runtime/panorama, guided mode, ba ánh sáng và view report 112 suite. Mọi `viewVerified` vẫn false. |
| 4. UX/UI, mobile, animation | **Một phần** | Giao diện khách bớt thông số kỹ thuật, một CTA chính mỗi bước, menu góc nhìn gọn, la bàn, tiêu đề thu khi khám phá, camera tween có thể hủy và hỗ trợ reduced-motion. Chrome emulation không tràn ngang; keyboard mặt bằng đã có. Chưa có bottom sheet, loading/error/fallback, audit accessibility và kiểm tra máy thật. |
| 5. Booking và giữ trạng thái | **Demo một phần** | Trang Tidal giữ tầng/phòng/ngày/khách trong phiên khám phá và nói rõ chưa báo giá. Java bridge chưa có availability/quote/hold/booking cho resort; không thể khẳng định đặt thật hoặc giá thật. App booking một phòng `/` giữ nguyên để tái sử dụng. |
| 6. Kiểm thử, bàn giao | **Một phần** | `node src/tidal/validate.mjs`, `npm run build`, `node src/tidal/capture.mjs` đã qua; video thao tác và ảnh trước/sau cùng pose, ảnh suite, concept slot02 có trong thư mục web. Chưa đo Web Vitals/FPS trên profile chuẩn, chưa thử Safari iOS/Chrome Android máy thật hoặc accessibility audit đầy đủ. |

## Quyết định và lỗi cần theo dõi

- `doorPaths` đã được khôi phục đúng manifest; đường tránh đồ đạc nằm riêng ở `walkRoutes`. Kiểm thử kiểm tra các đoạn đi không xuyên footprint tường hoặc đồ ở cao độ camera. Đây là kiểm tra 2D trên mô hình số, chưa thay collision 3D thực.
- Phần không phân bổ ở mặt bằng vẫn là setback/void/reserve theo M1. Diện tích hình chữ nhật khớp manifest nhưng polygon kiến trúc cuối cần thiết kế/duyệt trước khi gọi là layout xây dựng.
- Ảnh concept và ảnh phòng đại diện không phải panorama hoặc bằng chứng view từng suite. Không nhân bản view TS-1501 cho 111 phòng còn lại.
- Mọi thay đổi sau Bước 1 chỉ sửa dữ liệu đã chốt khi có lỗi kiểm chứng hoặc yêu cầu mới; không thêm VR/AI concierge/tính năng bán hàng ngoài plan.
