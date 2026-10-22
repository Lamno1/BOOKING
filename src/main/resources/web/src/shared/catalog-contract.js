// Never combine partial API records with a different catalog revision.
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function validateAvailability(payload, catalog, dates) {
  const mismatch = () => { throw new Error('Danh mục trên máy chủ chưa đồng bộ. Tạm dừng đặt phòng; vui lòng tải lại trang hoặc liên hệ quản trị.'); };
  if (!payload || payload.catalogVersion !== catalog.version || payload.arrival !== dates.arrival || payload.departure !== dates.departure) mismatch();
  for (const group of ['properties','rooms','services']) {
    if (!Array.isArray(payload[group]) || payload[group].length !== catalog[group].length) mismatch();
    const ids = new Set(payload[group].map(item=>item.id));
    if (ids.size !== catalog[group].length) mismatch();
    for (const expected of catalog[group]) {
      const actual = payload[group].find(item=>item.id===expected.id);
      if (!actual || !Object.keys(expected).every(key=>same(actual[key],expected[key]))) mismatch();
      if (group==='rooms' && (typeof actual.available!=='boolean' || !['AVAILABLE','BOOKED','CLOSED'].includes(actual.availabilityReason))) mismatch();
    }
  }
  return payload;
}
