// Dates use the property's timezone, not the visitor's browser timezone.
export function formatStayDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '—';
  return value.split('-').reverse().join('/');
}
export function dateAfter(days, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function nextDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export function bookingProblem({ room, arrival, departure, guests, availability, today = dateAfter(0) }) {
  if (!arrival || !departure || arrival < today || departure <= arrival) return 'Chọn ngày đến từ hôm nay và ngày đi sau ngày đến.';
  if (!Number.isInteger(guests) || guests < 1 || guests > room.capacity) return `Phòng này phù hợp từ 1 đến ${room.capacity} khách.`;
  if (!availability) return 'Chờ kiểm tra giá và phòng trống trước khi đặt.';
  if (room.available !== true) return room.availabilityReason === 'CLOSED' ? 'Phòng đang tạm ngưng nhận khách. Vui lòng chọn phòng khác.' : 'Phòng không còn trống trong ngày đã chọn. Hãy đổi ngày hoặc chọn phòng khác.';
  return '';
}

// Assistance never guesses a paid service from free text.
export function supportReply(message) {
  const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const notes = [];
  if (/\bkhan\b/.test(text)) notes.push('Yêu cầu thêm khăn cần nhân viên xác nhận số lượng và khả năng phục vụ.');
  if (/wi[\s-]?fi|mat khau/.test(text)) notes.push('Mật khẩu Wi-Fi chưa có trong dữ liệu hỗ trợ; hãy hỏi lễ tân của cơ sở.');
  if (!notes.length) notes.push('Bản demo chưa thể xử lý nội dung này hoặc xác nhận dịch vụ từ tin nhắn.');
  return { title: 'Chưa gửi yêu cầu cho nhân viên', message: notes.join(' ') + ' Chưa có kênh chuyển tiếp trong demo. Không thêm dịch vụ hoặc tính phí.' };
}

export function stayPresentation(booking) {
  const active = ['CONFIRMED', 'CHECKED_IN'].includes(booking.status);
  return {
    active,
    cancelled: booking.status === 'CANCELLED',
    room: booking.roomSnapshot || null,
    property: booking.propertySnapshot || null,
    policy: booking.policy || null,
    roomTotal: Number.isFinite(booking.roomTotal) ? booking.roomTotal : null,
    // Saved total includes services added later; do not recalculate from today's catalog.
    serviceTotal: Number.isFinite(booking.roomTotal) && Number.isFinite(booking.total) ? booking.total - booking.roomTotal : null,
    total: booking.total,
  };
}

// Expected arrival windows (Vietnam time). Must match BookingService.ARRIVAL_WINDOWS.
export const arrivalWindows={'14-16':'14:00–16:00','16-18':'16:00–18:00','18-20':'18:00–20:00','20-22':'20:00–22:00','22-24':'22:00–24:00','after-24':'Sau 0:00 (đến muộn)'};
export const arrivalWindowText=window=>arrivalWindows[window]||'';
