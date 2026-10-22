# STAYOS — đặt phòng cho khách sạn căn hộ và nhà nghỉ

Ứng dụng đặt phòng gồm trang khách (tìm phòng, đặt, quản lý kỳ nghỉ, dịch vụ, đánh giá, chat hỗ trợ có trợ lý tự động) và bảng vận hành cho nhân viên.

- Backend: Java 21, `com.sun.net.httpserver`, SQLite (WAL), Gson.
- Frontend: React 18 + Vite 5, không phụ thuộc script hay font bên thứ ba.

## Chạy thử trên máy

```powershell
# API (database demo riêng, không dùng cho khách thật)
.\scripts\start-api.ps1 -Demo -Database D:/tmp/stayos-demo.sqlite
# Giao diện
cd src/main/resources/web; npm ci; npm run dev -- --host 127.0.0.1 --port 5174
```

## Kiểm thử

```powershell
mvn -o test                                         # API, bảo mật, hợp đồng route
cd src/main/resources/web; npm run test:booking     # build + test logic giao diện
```

## Tài liệu

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): cấu trúc theo tính năng, thêm API ở đâu, quy tắc dữ liệu.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): triển khai công khai sau HTTPS, biến môi trường, các lớp bảo vệ, số đo tải.
- [docs/UX_UPGRADE_2026_10_21.md](docs/UX_UPGRADE_2026_10_21.md): nhật ký các đợt nâng cấp giao diện.

Dữ liệu khách, database và bản sao lưu không bao giờ được đưa vào repo (`data/` nằm trong `.gitignore`).
