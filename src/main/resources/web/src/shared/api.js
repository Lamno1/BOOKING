const hostname = location.hostname || '127.0.0.1';
// Dev server and the desktop shell call the API on :8080; a production build served by the API itself uses its own origin.
const sameOrigin = !import.meta.env.DEV && location.protocol.startsWith('http') && location.port !== '5174' && location.port !== '5173';
const API = import.meta.env.VITE_API_URL || (sameOrigin ? '/api' : `http://${hostname}:8080/api`);

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}/${path}`, {
      ...options, credentials: 'include',
      signal: options.signal || AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (cause) {
    if (options.signal?.aborted) throw cause;
    throw new Error('Chưa nhận được phản hồi từ máy chủ. Hãy kiểm tra lịch sử trước khi thử lại; yêu cầu có thể đã được lưu.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'Không thể hoàn tất yêu cầu.');
    error.status = response.status;
    throw error;
  }
  return body;
}
const post = (path, body = {}) => api(path, { method: 'POST', body: JSON.stringify(body) });
export async function authMe() {
  try { return (await api('auth/me')).user; }
  catch (error) { if (error.status === 401) return null; throw error; }
}
export async function login(email, password) { return (await post('auth/login', { email, password })).user; }
export async function register(displayName, email, password) { return (await post('auth/register', { displayName, email, password })).user; }
export async function logout() { try { await post('auth/logout'); } catch (error) { if (error.status !== 401) throw error; } }
export const changePassword = (currentPassword, newPassword) => post('auth/password', { currentPassword, newPassword });
export const createBooking = body => post('bookings', body);
export const changeStatus = (id, status) => post(`bookings/${encodeURIComponent(id)}/status`, { status });
export const requestService = body => post('services', body);
export const cancelService = id => post(`services/${encodeURIComponent(id)}/cancel`, {});
export const updateArrival = (id, details) => post(`bookings/${encodeURIComponent(id)}/arrival`, details);
export const savedRooms = () => api('saved');
export const setSavedRoom = (roomId,saved) => post('saved', {roomId,saved});
export const createReview = body => post('reviews', body);
export const replyReview = (id,reply) => post(`admin/reviews/${encodeURIComponent(id)}/reply`, {reply});
export const moderateReview = (id,body) => post(`admin/reviews/${encodeURIComponent(id)}/status`, body);
export const confirmService = id => post(`services/${encodeURIComponent(id)}/confirm`);
export const createSupport = body => post('support',body);
export const replySupport = (id,message) => post(`support/${encodeURIComponent(id)}/messages`,{message});
export const cancelSupport = id => post(`support/${encodeURIComponent(id)}/cancel`);
export const quoteDateChange = (id,body) => post(`bookings/${encodeURIComponent(id)}/change-quote`,body);
export const saveStaffNote = (id, note) => post(`admin/bookings/${encodeURIComponent(id)}/note`, {note});
