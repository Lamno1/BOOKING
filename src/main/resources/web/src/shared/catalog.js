import inventory from './data/inventory.json';
export const catalog = inventory;
// One source of truth shared with the Java booking service.
export const properties = inventory.properties;
export const rooms = inventory.rooms;
export const propertyById = id => properties.find(property => property.id === id);
export const bookingPropertyName = booking => booking.propertyName || 'Đơn từ danh mục cũ · chưa gán cơ sở';
const serviceDescriptions = {
  transfer: 'Đưa đón sân bay. Chưa chốt tuyến, loại xe, số khách, số chiều hoặc phí cầu đường.',
  dining: 'Bữa tối hải sản. Chưa chốt số suất, thực đơn và cơ sở phục vụ; 650.000₫ không có nghĩa là đủ cho toàn bộ nhóm khách.',
  spa: 'Dịch vụ thư giãn. Chưa chốt liệu trình, thời lượng, số người hoặc địa điểm phục vụ.',
  tour: 'Trải nghiệm địa phương. Chưa chốt tuyến, thời lượng, số người và phương tiện.',
};
export const services = inventory.services.map(service => ({ ...service,
  category: 'Dịch vụ tùy chọn · mô phỏng',
  description: serviceDescriptions[service.id] || 'Phạm vi phục vụ chưa được xác nhận.',
  unitLabel: '/ 1 yêu cầu demo · chưa xác nhận định mức phục vụ',
}));
/** Services marked "available": false (paused) stay readable on old bookings but are never offered again. */
export const bookable = list => list.filter(item => item.available !== false);
export const hotline = inventory.properties.find(p => p.phone)?.phone || null;
export const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
