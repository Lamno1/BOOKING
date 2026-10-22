import React from 'react';
import {hotline} from '../../shared/catalog';

// Describes what this codebase actually stores. Update it together with any change to data handling.
const sections=[
 ['Dữ liệu chúng tôi thu thập',[
  'Tài khoản: tên hiển thị, email, mật khẩu (chỉ lưu dạng băm PBKDF2, không ai đọc được mật khẩu gốc).',
  'Đặt phòng: tên và email người lưu trú, ngày ở, số khách, phòng, tổng tiền, giờ đến dự kiến và yêu cầu đặc biệt bạn nhập.',
  'Trao đổi hỗ trợ: nội dung tin nhắn giữa bạn và nhân viên, yêu cầu đổi ngày, dịch vụ thêm.',
  'Đánh giá: số sao và nhận xét sau khi trả phòng; trên trang công khai chỉ hiện tên (không hiện họ, email hay mã đơn).',
  'Ghi chú nội bộ của nhân viên về đơn đặt phòng (chỉ nhân viên xem).',
  'Dữ liệu kỹ thuật: cookie phiên đăng nhập (HttpOnly); địa chỉ IP chỉ được giữ tạm trong bộ nhớ để chống dò mật khẩu và chặn truy cập dồn dập, không ghi vào nhật ký.',
 ]],
 ['Dữ liệu chỉ nằm trên thiết bị của bạn',[
  'Lịch sử tìm kiếm gần đây, bản nháp thanh toán, đánh dấu tin đã đọc và lịch sử trò chuyện với trợ lý tự động được lưu trong trình duyệt của bạn (localStorage / sessionStorage), không gửi lên máy chủ. Lịch sử trợ lý bị xóa khi đăng xuất hoặc đóng tab.',
 ]],
 ['Mục đích sử dụng',[
  'Giữ phòng, phục vụ kỳ nghỉ và dịch vụ bạn yêu cầu; trả lời yêu cầu hỗ trợ; xác minh khi bạn cần đặt lại mật khẩu; đảm bảo an toàn hệ thống.',
  'Chúng tôi không bán dữ liệu, không dùng công cụ quảng cáo hay phân tích của bên thứ ba, và trang web không tải script hoặc font từ bên ngoài.',
 ]],
 ['Chia sẻ dữ liệu',[
  'Chỉ nhân viên vận hành STAYOS truy cập dữ liệu đặt phòng. Không chia sẻ cho bên thứ ba, trừ khi cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật.',
 ]],
 ['Lưu trữ và bảo vệ',[
  'Dữ liệu lưu trên máy chủ của STAYOS và được sao lưu hằng ngày. Kết nối công khai phải đi qua HTTPS.',
  'Thời hạn lưu trữ cụ thể cho từng loại dữ liệu đang được xây dựng; trong thời gian này bạn có thể yêu cầu xóa bất kỳ lúc nào (xem mục dưới).',
 ]],
 ['Quyền của bạn (Nghị định 13/2023/NĐ-CP)',[
  'Được biết, xem, chỉnh sửa, yêu cầu xóa dữ liệu; rút lại sự đồng ý; phản đối hoặc hạn chế xử lý; khiếu nại.',
  'Một số dữ liệu đặt phòng có thể cần giữ lại theo nghĩa vụ kế toán, thuế hoặc lưu trú; khi đó chúng tôi sẽ giải thích lý do.',
 ]],
];

export function PrivacyPolicy(){
 return <section className="content-section legal-page" aria-labelledby="privacy-title">
  <p className="overline">CHÍNH SÁCH / DỮ LIỆU CÁ NHÂN</p>
  <h1 id="privacy-title">Chính sách bảo vệ dữ liệu cá nhân</h1>
  <p className="legal-draft">Bản nháp ngày 22/10/2026, mô tả đúng cách ứng dụng đang xử lý dữ liệu. Cần được rà soát pháp lý và bổ sung tên pháp nhân, mã số thuế, địa chỉ trước khi công bố chính thức.</p>
  {sections.map(([title,items])=><section key={title}><h2>{title}</h2><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></section>)}
  <section><h2>Liên hệ</h2><p>Để thực hiện các quyền trên hoặc hỏi về dữ liệu của bạn: {hotline?<>gọi <a href={`tel:${hotline}`}>{hotline}</a>, </>:''}hoặc nhắn trong mục Hỗ trợ khi đã đăng nhập. Chúng tôi xác minh danh tính trước khi cung cấp hoặc xóa dữ liệu.</p></section>
 </section>;
}
