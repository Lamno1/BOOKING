from pathlib import Path
from html import escape

root = Path(__file__).resolve().parent

def text(x, y, value, size=17, color='#e9eee4', anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{escape(value)}</text>'

def svg(w, h, content):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L9,4 L0,8" fill="none" stroke="#cfdbad" stroke-width="1.4"/></marker><marker id="diamond" markerWidth="16" markerHeight="12" refX="1" refY="6" orient="auto"><path d="M1,6 L7,1 L13,6 L7,11 Z" fill="#cfdbad"/></marker></defs><rect width="100%" height="100%" fill="#1d2822"/><g font-family="Arial, sans-serif">{content}</g></svg>'''

def edge(path):
    return f'<path d="{path}" fill="none" stroke="#cfdbad" stroke-width="2" marker-end="url(#arrow)"/>'

def box(x, y, title, fields):
    parts = [f'<rect x="{x}" y="{y}" width="310" height="170" rx="5" fill="#29372e" stroke="#9eaf99"/>', text(x+18,y+32,title,22), f'<path d="M{x},{y+48}h310" stroke="#9eaf99"/>']
    parts += [text(x+18,y+77+i*23,line,16,'#d0d8ca') for i,line in enumerate(fields)]
    return ''.join(parts)

parts = [text(40,43,'STAYOS · UML lớp đề xuất trước tích hợp',27),text(40,70,'Mô hình khái niệm; chưa phải các lớp đã triển khai.',16,'#b5c3ae')]
parts += [box(40,110,'Room',['id · propertyId','capacity','nightlyPrice']),box(445,110,'RatePlan',['id · version','perGuestNight','quyền lợi theo khách / đêm']),box(850,110,'BenefitRule',['name · quantityBasis','servingWindow','quy tắc tính định mức'])]
parts += [box(40,400,'Booking',['id · dates · guests','status','confirm() · cancel()']),box(445,400,'BookingSnapshot',['catalogVersion · planVersion','room / plan / addons / total','policyAtBooking · benefits']),box(850,400,'ServiceRequest',['serviceId · quantity','scheduledAt · unitPriceAtBooking','status'])]
parts += [edge('M195,280 V400'),text(208,340,'1 phòng / nhiều đơn',15),edge('M600,280 V323 H310 V400'),text(420,313,'1 gói / nhiều đơn',15),edge('M755,190 H850'),text(802,173,'1 : 0..*',14,anchor='middle'),edge('M350,490 H445'),text(397,470,'1 : 1',14,anchor='middle'),edge('M195,570 V640 H1005 V570'),text(600,630,'1 đơn → 0..* dịch vụ mua thêm',17,anchor='middle')]
parts += [text(40,700,'Snapshot được lưu cùng đơn; đổi giá/gói không tính lại lịch sử.',18),text(40,733,'Nguồn UML chuẩn, cardinality và quan hệ composition: README.md (Mermaid).',15,'#b5c3ae')]
(root/'uml-classes.svg').write_text(svg(1200,770,''.join(parts)),encoding='utf-8')

steps = [
    ('01','Đọc yêu cầu & hiện trạng','Tách dữ liệu thật, concept và phần còn thiếu'),
    ('02','Tạo ảnh sản phẩm đích','Desktop + mobile theo hướng B'),
    ('03','Vẽ UML & workflow','Chốt cấu trúc dữ liệu, luồng lỗi và tiêu chí'),
    ('04','Chủ dự án duyệt bộ xem trước','Sửa ảnh/sơ đồ nếu chưa phù hợp'),
    ('05','Làm bản tương tác trong review','Gallery, gói, dịch vụ, lịch và trạng thái'),
    ('06','Kiểm thử & so với bản duyệt','UI, giá/quyền lợi, mobile và hiệu năng'),
    ('07','Tích hợp API & bảo toàn đơn cũ','Chỉ dùng giá, chính sách và quyền lợi đã duyệt'),
    ('08','Bàn giao bằng chứng để nghiệm thu','Bản chạy, ảnh so sánh, kiểm thử và giới hạn'),
]
parts = [text(40,48,'STAYOS · Workflow AI thực hiện',29),text(40,80,'Lượt hiện tại: tạo bộ xem trước, chưa sửa booking chính.',17,'#b5c3ae')]
for i,(num,title,desc) in enumerate(steps):
    y=115+i*135
    fill='#cfdbad' if i==3 else '#29372e'
    ink='#1d2822' if i==3 else '#e9eee4'
    parts += [f'<rect x="70" y="{y}" width="660" height="100" rx="8" fill="{fill}" stroke="#9eaf99"/>',text(92,y+36,num,25,ink),text(150,y+36,title,22,ink),text(150,y+70,desc,16,ink)]
    if i<7: parts.append(edge(f'M400,{y+100} V{y+135}'))
parts += [text(400,1235,'Không duyệt ảnh AI thành ảnh thật; không suy ra quyền lợi kinh doanh.',16,'#b5c3ae','middle')]
(root/'ai-workflow.svg').write_text(svg(800,1270,''.join(parts)),encoding='utf-8')

html='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STAYOS · Xem trước cách AI làm</title><style>body{margin:0;background:#1d2822;color:#eff0e6;font:17px/1.6 Arial,sans-serif}main{max-width:1200px;margin:auto;padding:32px 24px}h1{font-size:36px;font-weight:500}h2{font-weight:500;margin-top:48px}a{color:#cfdbad}img{display:block;width:100%;height:auto;border:1px solid #536050}small,p{color:#c0cbb8}.label{color:#cfdbad;font-size:13px;letter-spacing:.12em}.flow{max-width:800px;margin:auto}nav{display:flex;gap:22px;flex-wrap:wrap}section{margin:36px 0}.note{padding:18px;border-left:3px solid #cfdbad;background:#29372e}</style><main><p class="label">STAYOS / TRƯỚC KHI TRIỂN KHAI</p><h1>Nhìn kết quả trước.<br>Hiểu cách AI sẽ làm.</h1><p>Ảnh đích sản phẩm, UML và workflow đề xuất. Chưa thay booking chính.</p><nav><a href="#preview">Ảnh sản phẩm</a><a href="#uml">UML lớp</a><a href="#workflow">Workflow AI</a><a href="README.md">Tài liệu và UML tuần tự</a></nav><section id="preview"><h2>01 · Ảnh kết quả dự kiến</h2><img src="product-preview.png" alt="Mockup sản phẩm đích STAYOS hướng B, desktop và mobile"><p>Concept AI cho giao diện; không phải screenshot bản đã lập trình. Tổng gói minh họa cho 2 khách / 2 đêm.</p></section><section id="uml"><h2>02 · UML lớp đề xuất</h2><img src="uml-classes.svg" alt="Các lớp Room, RatePlan, BenefitRule, Booking, BookingSnapshot, ServiceRequest"><p>Phiên bản Mermaid chỉnh sửa được và UML tuần tự client → API → SQLite nằm trong <a href="README.md">tài liệu thiết kế</a>.</p></section><section id="workflow"><h2>03 · AI làm theo thứ tự nào?</h2><img class="flow" src="ai-workflow.svg" alt="Workflow 8 bước từ yêu cầu, ảnh và UML qua duyệt, prototype, kiểm thử, tích hợp và bàn giao"></section><p class="note">Duyệt hình thức không đồng nghĩa duyệt giá, chính sách, ảnh thực tế hoặc mở bán. Các bước tích hợp là đề xuất cho giai đoạn sau.</p></main></html>'''
(root/'index.html').write_text(html,encoding='utf-8')
print('Created uml-classes.svg, ai-workflow.svg, index.html')
