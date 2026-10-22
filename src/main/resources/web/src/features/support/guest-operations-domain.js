import {formatStayDate,nextDate} from '../../shared/booking-domain.js';
export const supportKinds={TOWELS:'Thêm khăn',WIFI:'Wi-Fi',CHECKIN:'Nhận phòng',OTHER:'Hỗ trợ đơn / sau kỳ nghỉ',DATE_CHANGE:'Đổi ngày ở',INQUIRY:'Tư vấn trước khi đặt'};
export const supportStatuses={OPEN:'Đã tiếp nhận',IN_PROGRESS:'Đang xử lý',RESOLVED:'Đã giải quyết',CANCELLED:'Đã rút / hủy',APPROVED:'Đã duyệt',DECLINED:'Chưa được duyệt'};
export const supportOpen=ticket=>['OPEN','IN_PROGRESS'].includes(ticket.status);
export function occupancyDays(arrival,count=7){const result=[];for(let day=arrival;result.length<count;day=nextDate(day)){if(!day)return [];result.push(day);}return result;}
export function occupiedOn(bookings,roomId,date){return bookings.find(booking=>booking.roomId===roomId&&['CONFIRMED','CHECKED_IN'].includes(booking.status)&&booking.arrival<=date&&booking.departure>date)||null;}
const amount=value=>Number.isFinite(value)?new Intl.NumberFormat('vi-VN').format(value)+'₫':'Chưa ghi nhận';
const statusText=status=>({CONFIRMED:'Đã xác nhận',CHECKED_IN:'Đã nhận phòng',CHECKED_OUT:'Đã trả phòng',CANCELLED:'Đã hủy',PENDING:'Chờ xác nhận'})[status]||'Chưa xác định';
export function receiptText(booking,requests=[]){return [
 'STAYOS · TÓM TẮT ĐẶT PHÒNG','Bản demo · chưa thu tiền',`Mã: ${booking.id}`,`Cơ sở: ${booking.propertyName||'Đơn cũ · chưa gán cơ sở'}`,`Phòng: ${booking.roomName}`,
 `Khách: ${booking.guestName||'—'}`,`Nhận: ${formatStayDate(booking.arrival)} · Trả: ${formatStayDate(booking.departure)} · ${booking.guests} khách`,`Trạng thái: ${statusText(booking.status)}`,
 `Tiền phòng đã lưu: ${amount(booking.roomTotal)}`,`Tổng đã lưu${booking.status==='CANCELLED'?' trước hủy':''}: ${amount(booking.total)}`,
 ...(booking.offerSnapshot?[`Gói: ${booking.offerSnapshot.plan.name} · mô phỏng`,`Phần nâng gói: ${amount(booking.packageSupplement)}`,...booking.offerSnapshot.benefits.map(b=>`Bao gồm ${b.quantity} ${b.unit} ${b.name}: ${b.rule}`)]:[]),
 ...requests.filter(request=>request.bookingId===booking.id).map(request=>`${request.name}${request.quantity?' · '+request.quantity+' × '+request.unit:''}: ${amount(request.price)} · ${statusText(request.status)}${request.start?' · '+new Date(request.start).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):' · chưa ghi nhận lịch'}${request.conditions?'\r\nĐiều kiện: '+request.conditions:''}`),
 ...(booking.policy?[`Nhận phòng ${booking.policy.checkIn||'chưa ghi nhận'} · trả phòng ${booking.policy.checkOut||'chưa ghi nhận'} · giờ Việt Nam`,`Phí vệ sinh: ${amount(booking.policy.cleaningFee)} · Cọc: ${amount(booking.policy.deposit)}`,`Thuế: ${booking.policy.taxIncluded?'giá gồm thuế':'chưa xác nhận'}`,booking.policy.capacity||'Không ghi nhận điều kiện sức chứa trong đơn.']:[]),
 'Chính sách đã lưu:',booking.policy?.cancellation||'Đơn cũ chưa có bản chụp chính sách.',booking.policy?.payment||'Chưa có thông tin thanh toán trong hồ sơ.',
 ...(booking.changes||[]).map(change=>`Đổi ngày: ${formatStayDate(change.currentArrival)}–${formatStayDate(change.currentDeparture)} → ${formatStayDate(change.arrival)}–${formatStayDate(change.departure)}; ${amount(change.currentTotal)} → ${amount(change.total)}${change.planName?`; nâng gói ${amount(change.currentPackageSupplement)} → ${amount(change.packageSupplement)}`:''}${change.transferChange?`; xe đón ${new Date(change.transferChange.start).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · chuyến ${change.transferChange.schedule.flight}`:''}`)
 ].join('\r\n');}
