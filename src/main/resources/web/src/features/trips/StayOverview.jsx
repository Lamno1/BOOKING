import React from 'react';
import { money, bookingPropertyName } from '../../shared/catalog';
import { stayPresentation, formatStayDate } from '../../shared/booking-domain';

export function StayOverview({ booking, onSupport, onBrowse }) {
  const view = stayPresentation(booking);
  const { room, property, policy } = view;
  return <div className="stay-overview">
    {!view.active && <section className="stay-closed" role="status">
      <h2>{view.cancelled ? 'Đặt phòng đã hủy.' : 'Kỳ nghỉ đã kết thúc.'}</h2>
      <p>{view.cancelled ? 'Đơn này không còn giữ phòng. Các yêu cầu dịch vụ được lưu bên dưới để đối chiếu trạng thái hủy.' : 'Thông tin bên dưới là lịch sử kỳ nghỉ, không phải lịch trình đang hoạt động.'}</p>
      <p>Bản demo không thu tiền. Tổng đã lưu không phải khoản cần thanh toán hoặc xác nhận hoàn tiền.</p>
      <button className="gold-button" onClick={onBrowse}>Tìm kỳ nghỉ mới</button>
    </section>}
    <section className="stay-receipt" aria-label="Tóm tắt đơn đã lưu">
      <h2>Thông tin tại thời điểm đặt</h2>
      <p>{bookingPropertyName(booking)} · {booking.roomNumber || booking.roomName}</p>
      {room ? <p>{room.area} m² · {room.beds} · tối đa {room.capacity} khách<br/>{room.features?.join(' · ')}</p> : <p>Đơn cũ chưa lưu thông số phòng; không lấy thông số mới thay vào lịch sử.</p>}
      <dl><div><dt>Ngày ở / số khách</dt><dd className="stay-dates"><time dateTime={booking.arrival}>{formatStayDate(booking.arrival)}</time><span>→</span><time dateTime={booking.departure}>{formatStayDate(booking.departure)}</time><span>· {booking.guests} khách</span></dd></div>
        <div><dt>Tiền phòng đã lưu{Number.isFinite(booking.nightlyRate) ? ` · ${money(booking.nightlyRate)}/đêm` : ''}</dt><dd>{view.roomTotal === null ? 'Chưa có chi tiết' : money(view.roomTotal)}</dd></div>
        {booking.offerSnapshot&&<div><dt>Phần nâng gói đã lưu</dt><dd>{money(booking.packageSupplement)}</dd></div>}
        <div><dt>Dịch vụ mua thêm đã ghi vào đơn</dt><dd>{view.serviceTotal === null ? 'Chưa có chi tiết' : money(view.serviceTotal-(booking.packageSupplement||0))}</dd></div>
        <div><dt>Tổng đã lưu{view.cancelled ? ' trước khi hủy' : ''}</dt><dd><strong>{money(view.total)}</strong></dd></div></dl>
      {booking.offerSnapshot?<><h3>{booking.offerSnapshot.plan.name} · gói mô phỏng</h3>{booking.offerSnapshot.benefits.map(b=><p key={b.name}><strong>{b.quantity} {b.unit} {b.name} · đã bao gồm, không cộng lại tiền</strong><br/>{b.rule}</p>)}<p>Giá và quyền lợi là đề xuất demo, chưa phải cam kết mở bán.</p></>:<p>Đơn này chưa áp dụng gói quyền lợi tặng kèm. Các khoản dịch vụ bên dưới là mua thêm, không phải quà tặng.</p>}
    </section>
    <section className="stay-receipt"><h2>Chính sách đã lưu cùng đơn</h2>
      {policy ? <><p>Nhận phòng {policy.checkIn} · trả phòng {policy.checkOut} · giờ Việt Nam.</p><p>Vệ sinh {money(policy.cleaningFee)} · cọc {money(policy.deposit)} · {policy.taxIncluded ? 'giá gồm thuế' : 'thuế chưa xác nhận'}.</p><p>{policy.cancellation}</p><p>{policy.payment}</p></> : <p>Đơn cũ chưa có bản chụp chính sách. Không gán chính sách hiện tại cho đơn này.</p>}
    </section>
    {view.active && <section className="stay-receipt"><h2>{booking.status === 'CHECKED_IN' ? 'Trong kỳ nghỉ' : 'Chuẩn bị đến nơi'}</h2>
      <p>{property?.address || 'Chưa có địa chỉ xác minh và hướng dẫn đến nơi. Không dùng bản demo để lên đường hoặc thanh toán.'}</p>
      <p>{property?.phone ? `Liên hệ: ${property.phone}` : 'Chưa cấu hình số liên hệ của cơ sở.'}</p>
      <p>{property?.checkInMethod || 'Chưa có hướng dẫn nhận phòng trong hồ sơ đơn.'}</p>
      <button onClick={onSupport}>Thông tin hỗ trợ →</button>
    </section>}
  </div>;
}
