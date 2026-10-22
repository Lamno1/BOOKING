# STAYOS Booking Web

## Kiểm tra tiếp — 22/10/2026

B/V2 hiện ở trang chính. Đã kiểm chứng tải lại vẫn giữ gói/số lượng/lịch dịch vụ và xem lại tổng đúng trên mobile. Lần chạy kiểm thử gần nhất:54 tests web +23 tests Java đạt. Xem `docs/BOOKING_B_RECHECK_2026_10_22.md` tại gốc dự án để biết bằng chứng và giới hạn; báo cáo ngày21/10 bên dưới là lịch sử, mục giữ nháp qua tải lại đã được cập nhật trong mã hiện tại.

## Tích hợp luồng khách B/V2 — 21/10/2026 (bản mới hơn phần vận hành bên dưới)

Trang `/` dùng hướng B: ảnh concept lớn → tìm phòng hai cơ sở → chi tiết → chọn gói/số lượng/lịch → xem lại → đăng nhập giữ lựa chọn → xác nhận đơn demo. Không còn yêu cầu sang review để chọn gói. API tính lại giá và lưu `offerSnapshot`, quyền lợi và các yêu cầu dịch vụ có lịch/định mức; không ghi đè đơn cũ.

Chỉ R-101 có gallery concept riêng bốn góc; phòng khác ghi rõ chưa có ảnh riêng, không gán ảnh R-101 sang căn khác. Tư vấn trước đặt không cần đơn (vẫn đăng nhập để bảo vệ trao đổi); đơn đã hủy gửi được hỗ trợ sau hủy. TXT dùng nhãn tiếng Việt và chính sách lưu cùng đơn. Hoàn tất hỗ trợ cần nhân viên xác nhận đã xử lý xong, không chỉ ghi nhận.

Gói/định mức là demo chưa duyệt kinh doanh; giữ chính sách demo hiện hành, không áp chính sách hủy đề xuất trong review. Đổi ngày tự phục vụ cho đơn có gói chưa hỗ trợ: hướng khách sang kiểm tra với nhân viên, không âm thầm đổi số suất/lịch. Chưa mở bán, chưa thanh toán/email/địa chỉ xác minh. Báo cáo: `docs/BOOKING_B_INTEGRATION_2026_10_21.md` tại gốc dự án Java.

## Bổ sung vận hành — 21/10/2026

- Khách → Hỗ trợ: gửi yêu cầu theo booking, nhận mã theo dõi, bổ sung tin, xem phản hồi và rút yêu cầu. Dữ liệu lưu ở API/SQLite, không còn giả lập trả lời bằng từ khóa.
- Kỳ nghỉ → đổi ngày: báo giá mới dựa trên đơn giá đã lưu; đơn cũ giữ nguyên đến khi admin duyệt. Kiểm tra lại tồn phòng và lịch dịch vụ ở server khi duyệt. Chênh lệch tiền là mô phỏng, không thu/hoàn tiền.
- Quản trị → Hỗ trợ & đổi ngày: lọc theo cơ sở, tìm yêu cầu, phản hồi, đóng hoặc xét duyệt; Tình trạng phòng có lịch bảy ngày.
- Tải tóm tắt đơn dạng TXT từ thông tin đã lưu; không phải hóa đơn thuế.
- API mặc định8080; `scripts/start-api.ps1 -Port 8081 -Database <file-test>` chạy cách ly. Cookie phiên của cổng thử không ghi đè phiên8080.
- Báo cáo và ảnh: `/review/operations.html`. Bản QA5184/API8081 dùng database riêng, không trộn vào lịch sử đang sử dụng.
- Chưa kết nối thanh toán/email, chưa xác minh địa chỉ và ảnh; các gói quyền lợi và hướng B vẫn ở khu review chờ tích hợp có kiểm soát. Không xem là đã đủ điều kiện mở bán.

## Phạm vi hiện tại — 13/10/2026

Web này chỉ phụ trách tìm phòng → chi tiết → chọn ngày/khách/dịch vụ → đăng nhập → đặt phòng → lịch sử kỳ nghỉ. Có 15 phòng demo; không dùng inventory 112 suite Logan.

- Khách: `http://127.0.0.1:5174/`.
- Quản trị: `http://127.0.0.1:5174/admin.html` (quyền kiểm tra tại API).
- Chạy API từ `02_IMPLEMENTATION`: `powershell -File scripts/start-api.ps1`. Không thêm `-Demo` trên dữ liệu đang sử dụng.
- Trong thư mục web: `npm ci`, `npm run dev`; `npm run test:booking` kiểm tra build, điều kiện checkout và tách kiến trúc; `node verify-booking.cjs` kiểm tra API đang chạy.
- `mvn test` tại `02_IMPLEMENTATION` kiểm tra API/SQLite bằng dữ liệu test cách ly.

### Kiến trúc được tách riêng, tạm dừng

Viewer, `src/tidal`, tài nguyên GLB/HDR/PBR và `tidal.html` đã chuyển vào `D:/STAYOS_WORKSPACE/03_ARCHITECTURE/web`. Có package/build riêng; không đóng gói vào web booking và không tải Three.js. Xem `D:/STAYOS_WORKSPACE/03_ARCHITECTURE/README.md` để mở lại sau này. Blender và báo cáo đã có vẫn giữ nguyên vị trí để bảo toàn đường dẫn.

### Chưa phải bản kinh doanh công khai

Giá/ảnh/phòng vẫn là mẫu. Chưa kết nối thanh toán, email xác minh hoặc email khôi phục mật khẩu; chưa triển khai HTTPS công khai. Không biến mô hình kiến trúc chưa duyệt thành phòng bán được. Bộ công cụ Vite hiện còn cảnh báo npm audit; chỉ chạy loopback, cần nâng phiên bản và kiểm thử trước triển khai.

---

## Nhật ký trước khi tách — chỉ để tham khảo

Các đường dẫn kiến trúc và intro bên dưới mô tả phiên bản cũ, không còn là luồng của bản booking hiện tại.

## Demo liền mạch và quản trị riêng — 03/10/2026

- `/`: intro bốn chương → suite đang chọn → chọn ngày / booking, cùng một trang.
  Có nút **Chạy demo 18s**, bỏ qua intro và giảm chuyển động.
- `/admin.html`: danh bạ tài khoản, khóa/mở khóa khách, tình trạng phòng theo ngày,
  dọn/bảo trì/mở bán lại, booking và dịch vụ. Đăng nhập admin từ trang khách sẽ
  chuyển sang đây; link xem giao diện khách chỉ để preview.
- API mới: GET admin/users, POST admin/users/status, GET admin/rooms theo ngày,
  POST admin/rooms/status. Tất cả yêu cầu quyền admin ở server.
- Intro sử dụng ảnh/video minh họa có sẵn, chưa phải render liên tục của Tidal.
  Phân tích clip và giới hạn: `../../../../docs/INTRO_ADMIN_REVIEW_2026_10_03.md`.

## Tidal Sanctuary v2 — trang riêng, concept 3D tương tác

Mở `/tidal.html` để xem tuyến resort → tầng → suite → tour bên trong cả 112 phòng → nháp booking. Trang `/` hiện là app booking 15 phòng với backend SQLite, chưa nối inventory với tour Tidal. Manifest ở `src/tidal/world.js`; tám layout và đường đi camera ở `src/tidal/suite-layouts.js`; hình học/vật liệu nội thất ở `src/tidal/suite-model.js`; mỹ thuật resort ở `src/tidal/resort-art.js`; liên kết scene ở `src/tidal/scene.js`; giao diện ở `src/tidal/tidal.jsx`. Thêm `?debug=1` để hiện thông báo kỹ thuật; `?view=comparison` dùng riêng cho ảnh QA cùng góc máy cũ.

Cảnh dùng hình học, vật liệu và ánh sáng procedural; không phải ảnh phòng thật. Có mặt cắt đầy đủ tám phòng/tầng, góc nhìn tổng thể từng suite và camera tầm mắt di chuyển giữa sáu node trong phòng. Giá và tồn phòng Tidal chưa kết nối; “Chọn ngày ở” giữ nháp trong phiên, không tạo booking thật. Chưa đạt chất lượng photoreal của ảnh concept; vẫn cần bộ mesh/texture kiến trúc được duyệt, chiếu sáng hoàn thiện và đối chiếu view thực từng suite.

Chạy `node src/tidal/validate.mjs`, `npm run build`, `node src/tidal/capture.mjs` để kiểm tra dữ liệu, build và chụp QA. Ảnh trước/sau cùng pose: `qa-tidal-before-southwest.png` và `qa-tidal-after-comparison-pose.png`; ảnh góc chính mới `qa-tidal-after-southwest.png`; suite `qa-tidal-after-suite.png`; video thao tác thật `qa-tidal-selection-flow.mp4`. Báo cáo M0/M1 và checklist nằm ở `../../../../docs/` (từ thư mục web).

Đợt nâng Bước 2 ngày 30/09/2026 có cặp ảnh `qa-tidal-step2-before-southwest.png` / `qa-tidal-step2-after-southwest.png` và ảnh cận facade, hồ, spa, nhà hàng, pavilion. Mức đạt/chưa đạt và tài nguyên còn thiếu nằm trong `../../../../docs/TIDAL_STEP2_ART_PASS_2026_09_30.md`.

## Tidal render/UI — 01/10/2026

Renderer bổ sung HDR/PMREM, texture PBR cỏ/cát, phản xạ mặt biển, bóng tiếp xúc SSAO và khử răng cưa MSAA. Mật độ điểm ảnh desktop 1.5–2, mobile tối đa 1.5 để giữ tải GPU hợp lý. `src/tidal/render-quality.js` quản lý tài nguyên; `src/tidal/guest-ui.css` là giao diện khách hiện tại (không còn import `views.css`). Nguồn/giấy phép CC0 ở `public/tidal-assets/SOURCES.md`.

Khi server đang chạy ở 5174, chạy `node src/tidal/verify-render.mjs` để chụp ảnh desktop 2880×1800, mobile và kiểm tra bàn phím/cảm ứng/reduced-motion/tải lỗi/state booking. Kết quả ở `qa-tidal-render-results.json`. Nguồn texture resort là 1K, không phải 4K/8K. Đây vẫn là kiến trúc procedural, chưa phải photoreal hay panorama thực; booking Tidal chưa nối backend.

## Nội thất đủ 112 phòng — 02/10/2026

- Tầng 03–16 × tám slot: tất cả mở được nội thất 3D, không chỉ TS-1501. Tám template được đặt đúng bounds, hướng, cửa, ban công và cao độ; không phải 112 thiết kế riêng biệt.
- Giường, sofa, bàn ghế, pantry, lavabo, vòi sen, WC, TV, rèm, sàn gỗ, đèn và nội thất ban công là geometry. Vật liệu gỗ/đá/vải sinh tại runtime, không dùng ảnh concept làm nền giả phòng.
- Sáu điểm mỗi phòng; A* tránh vùng chiếm chỗ của tường/đồ đạc. Kéo để nhìn quanh; chọn node để đi lại, không phải điều khiển tự do WASD. Có ngắt chuyển động và reduced-motion.
- Chỉ tạo tám model tái sử dụng, không nạp 112 bản nội thất đồng thời. Khi chọn tầng hiện mặt cắt tám phòng; khi vào suite chỉ hiện phòng đã chọn.
- Manifest TS-1501 và diện tích/hướng của slot 02–08 giữ nguyên. Layout nội thất 02–08 là thiết kế concept tự dựng, không phải bản vẽ thi công.

Kiểm tra: `node src/tidal/validate-suites.mjs` (hình học, vật dụng, toàn bộ tuyến giữa node, 112 phép đặt phòng), `node src/tidal/verify-suites.mjs` (server 5174, mở 112 phòng, tour, keyboard, mobile, giữ nháp). Đầu ra: `qa-tidal-suite-geometry.json`, `qa-tidal-suite-browser.json`, `qa-tidal-suite-TS-1501-living.png` và ảnh tám layout/ba kích thước màn hình. Chi tiết bàn giao: `../../../../docs/TIDAL_112_SUITE_INTEGRATION_2026_10_02.md`.

## Booking app — backend SQLite, 03/10/2026

Trang `/` có 15 phòng, tìm tên/tiện nghi, lọc số khách và phòng trống, sắp xếp giá, lịch sử theo tài khoản, dịch vụ và bảng vận hành admin. `src/catalog.js` chứa nội dung/ảnh. `src/inventory.json` là danh mục giá và sức chứa dùng chung với Java.

Chạy từ thư mục `02_IMPLEMENTATION`:

```powershell
# Terminal 1: API localhost 8080, có tài khoản demo
.\scripts\start-api.ps1 -Demo
# Terminal 2: frontend
cd src/main/resources/web
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Admin demo (chỉ trên database demo mới tạo): `admin@stayos.demo` / `change-me-now`.
Khách demo: `guest@stayos.demo` / `stayos-demo`.
Máy chủ từ chối chạy ở chế độ công khai nếu tài khoản admin còn dùng một trong các mật khẩu demo này.
Chế độ demo chỉ bật bằng `-Demo` hoặc `STAYOS_DEMO=true`. Để khởi tạo database riêng không dùng tài khoản demo, đặt `STAYOS_ADMIN_EMAIL` và `STAYOS_ADMIN_PASSWORD` (ít nhất 12 ký tự) trước khi chạy. Biến mật khẩu chỉ dùng khi tạo tài khoản mới; đổi mật khẩu của tài khoản có sẵn qua trang Tài khoản. Không đặt mật khẩu trong mã nguồn hoặc commit.

API chạy độc lập, không cần mở JavaFX. Java 21 và Maven cần có trong PATH; script có fallback đến Maven hiện cài trên máy này. Có thể dùng `-Database <absolute-path>` cho database khác. Database mặc định `data/stayos-web.sqlite`, không sửa `data/stayos.sqlite` cũ. Dữ liệu được giữ khi tắt/mở API.

Luồng dữ liệu:

- Đăng ký/đăng nhập/đăng xuất/đổi mật khẩu qua API. Mật khẩu PBKDF2, token phiên chỉ trong cookie HttpOnly; server lưu hash token có hạn dùng. Đổi mật khẩu vô hiệu hóa toàn bộ phiên của tài khoản.
- Booking, dịch vụ và lịch sử lưu SQLite. API xác thực chủ đơn; admin xem toàn bộ qua endpoint riêng. My Stay của admin vẫn là đơn riêng của admin.
- Server tính giá theo inventory, kiểm tra số khách và ngày. Giao dịch SQLite khóa kiểm tra phòng trống và lưu đơn cùng lúc; cùng phòng/cùng ngày chỉ được một đơn. Request ID tránh tạo lại đơn khi gửi lặp.
- Khách hủy đơn đã xác nhận; nhận/trả phòng do admin cập nhật. Nhận phòng chỉ đúng ngày đến. Hủy đơn đồng thời hủy dịch vụ liên quan.
- Dịch vụ kiểm tra lịch theo múi giờ Việt Nam, không cho đặt chồng trong 60 phút. Admin xác nhận; khách thấy trạng thái cập nhật khi quay lại trang hoặc sau tối đa 15 giây.
- Nháp phòng/ngày/số khách được giữ trong sessionStorage. Auth và booking không còn fallback localStorage. Dữ liệu demo v2/v3 trong trình duyệt vẫn giữ nguyên, không tự nhập thành đơn có hiệu lực trên server.

Kiểm tra: `mvn test` chạy database test và API integration test (cách ly tài khoản, quyền admin, giá/sức chứa, đặt đồng thời, lịch sử, đổi mật khẩu, migration legacy, JSON và Origin). `npm run build` kiểm tra frontend. Kiểm tra thao tác trực tiếp bằng trình duyệt trên 390/768/1440 px.

Giới hạn: ảnh/giá/15 phòng là inventory minh họa; chưa có thanh toán, email xác minh, gửi email quên mật khẩu hay triển khai HTTPS công khai. Backend bind loopback, phù hợp chạy trên máy hiện tại. 112 suite tại `/tidal.html` vẫn dùng luồng tour và nháp riêng, chưa ánh xạ vào inventory 15 phòng này.

Bộ ảnh `02_IMPLEMENTATION/data/video intro/` gồm năm PNG bảng tổng hợp, có nội thất, panorama mẫu, mặt bằng, camera stations, vật liệu và ánh sáng. Đã xem từng bảng. Tên `living_01_day_8k.jpg`, `stations.csv`, GLB và thư mục dataset được in trong bảng không phải các file gốc có trên filesystem. Giữ bảng làm reference, không gắn chúng vào viewer như một panorama 8K độc lập.

Prototype giới thiệu không gian toàn màn hình bằng React + GSAP.

## Chạy dự án

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

## Thay tài nguyên

Danh sách cảnh nằm trong `src/main.jsx`, biến `scenes`. Mỗi cảnh nhận:

- `image`: ảnh nền và fallback/poster.
- `video`: video MP4 tùy chọn; hiện chỉ cảnh cuối dùng `walkthrough-room.mp4`.
- `title`, `eyebrow`, `description`: nội dung hiển thị.
- `position`: vị trí crop của ảnh trên màn hình.

Ảnh JPG/PNG hiện có là tài nguyên demo. `walkthrough-room.mp4` là bản sao cục bộ của clip walkthrough người dùng cung cấp. Để đạt chất lượng giống toàn bộ video tham chiếu, thay ba cảnh ảnh bằng ảnh/video gốc sạch tối thiểu 1920×1080 (ưu tiên WebP/AVIF cho ảnh, MP4 H.264 + WebM cho video), không chứa giao diện quay màn hình hay watermark.

## Điều khiển

- Chuột: cuộn lên/xuống.
- Cảm ứng: vuốt dọc.
- Bàn phím: phím mũi tên, Page Up/Down, Home/End.
- Nút: điều hướng ở góc phải và timeline dưới màn hình.

Website tự dùng ảnh poster khi video chưa tải và tôn trọng `prefers-reduced-motion`.

## Tidal — model studio TS-1501

Mở `/tidal.html` → tầng 15 → TS-1501 → **Khám phá bên trong**.
Phòng này dùng model Blender/GLB chi tiết và ánh sáng gián tiếp được bake từ Cycles;
phòng bản nhẹ vẫn hiển thị khi tài nguyên đang tải hoặc tải lỗi. Các phòng khác
giữ bộ nội thất procedural hiện có. Không đồng nghĩa toàn bộ 112 phòng đã đạt
chất lượng hình ảnh này.

Nguồn scene, quyền sử dụng tài nguyên và lệnh dựng lại: [assets/tidal1501/README.md](../../../../assets/tidal1501/README.md).
Chạy kiểm tra tích hợp bằng `node src/tidal/verify-studio.mjs` khi Vite đang ở port 5174.
