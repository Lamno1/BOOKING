// Customer-facing content for the B review; A and the booking application stay independent.
export function mountRoomContent(){
 document.querySelector('.hero-copy .intro').innerHTML='Giường đôi, góc ngồi và bếp nhỏ.<br>Một studio riêng cho hai người.';
 document.querySelector('.spaces h2').textContent='Nhìn rõ từng góc.';
 document.querySelector('.spaces .section-heading p').innerHTML='Tổng thể ở ảnh đầu.<br>Khám phá thêm khu ngủ, bếp và phòng tắm.';
 document.querySelector('.gallery-large figcaption span').textContent='02 — Bếp & bàn ăn';
 document.querySelector('.gallery-small figcaption span').textContent='03 — Phòng tắm riêng';
 document.querySelector('.gallery-wide figcaption span').textContent='04 — Giường & cửa sổ';
 document.querySelector('.spaces').insertAdjacentHTML('afterend',`
 <section class="room-life section" aria-labelledby="room-life-title">
  <div class="section-heading"><span class="section-no">02 / TRONG PHÒNG</span><h2 id="room-life-title">Một studio.<br>Đủ chỗ cho nhịp sống riêng.</h2><p>32 m² tổng diện tích theo danh mục demo.<br>Khu ngủ và sinh hoạt trong cùng không gian.</p></div>
  <div class="room-zones">
   <article><span class="micro">01 / NGHỈ NGƠI</span><h3>Một giường đôi.</h3><p>Tối đa 2 khách. Khu ngủ mở cùng góc ngồi và bếp, không phải phòng ngủ đóng cửa riêng.</p><button class="zone-photo" type="button" data-photo="3" aria-label="Xem khu ngủ toàn màn hình">Xem khu ngủ <span aria-hidden="true">↗</span></button></article>
   <article><span class="micro">02 / SINH HOẠT</span><h3>Bếp nhỏ, góc ngồi.</h3><p>Bếp và khu sinh hoạt có trong danh mục. Ảnh concept minh họa sofa và bàn ăn trong studio.</p><button class="zone-photo" type="button" data-photo="1" aria-label="Xem bếp và sinh hoạt toàn màn hình">Xem bếp & sinh hoạt <span aria-hidden="true">↗</span></button></article>
   <article><span class="micro">03 / RIÊNG TƯ</span><h3>Phòng tắm riêng.</h3><p>Phòng tắm dành riêng cho căn. Ảnh cho thấy phương án bố trí, chưa phải ảnh thiết bị thực tế.</p><button class="zone-photo" type="button" data-photo="2" aria-label="Xem phòng tắm riêng toàn màn hình">Xem phòng tắm <span aria-hidden="true">↗</span></button></article>
  </div>
  <details class="room-verification conditions"><summary>Thông tin cần xác nhận trước khi đặt <span aria-hidden="true">+</span></summary><div><p>Địa chỉ, bản đồ, liên hệ, chỗ đỗ xe và hướng nhìn cần được cơ sở xác nhận. Chưa có số đo để cam kết vị trí cửa sổ hoặc khoảng cách giữa các khu.</p><p>Kích thước giường, cách âm, thiết bị và dụng cụ bếp, nước nóng cùng vật dụng cấp kèm đang chờ kiểm chứng. Không suy ra tiện nghi được cung cấp chỉ từ đồ có trong ảnh concept.</p></div></details>
 </section>`);
 document.querySelector('.packages .section-no').textContent='03 / CÁCH Ở';
 document.querySelector('.package-foot').insertAdjacentHTML('beforebegin',`
 <section class="quote-detail" aria-labelledby="quote-detail-title"><div><p class="micro">14–16/11/2026 · 2 ĐÊM · 2 KHÁCH</p><h3 id="quote-detail-title">Giá này bao gồm gì?</h3><dl class="quote-lines"><div><dt>Phòng · 2 đêm × 850.000₫</dt><dd data-quote="room">1.700.000₫</dd></div><div><dt>Nâng gói ăn sáng</dt><dd data-quote="supplement">0₫</dd></div><div><dt>Dịch vụ mua thêm</dt><dd>Chưa chọn</dd></div><div class="quote-total"><dt>Tổng kỳ nghỉ</dt><dd data-quote="total">1.700.000₫</dd></div></dl></div><div class="benefit-schedule"><p class="micro">QUYỀN LỢI & LỊCH ĐỀ XUẤT</p><h3>Dùng khi nào?</h3><p>2 ly trà · mỗi khách 1 ly 250 ml, một lần khi nhận phòng.</p><p data-breakfast-schedule hidden>4 suất sáng · 2 suất ngày 15/11 và 2 suất ngày 16/11, 07:00–09:30 tại quầy. Mỗi suất gồm bánh mì trứng và nước suối 350 ml; chốt giờ trước 20:00 tối hôm trước.</p><p data-no-breakfast>Gói đang chọn không bao gồm bữa sáng.</p><small>Quyền lợi và lịch phục vụ là đề xuất chờ cơ sở duyệt. Yêu cầu dị ứng hoặc đổi món cần nhân viên xác nhận.</small></div></section>`);
 document.querySelector('.quote-lines>div:nth-child(3) dd').dataset.quote='extras';
 document.querySelector('.benefit-schedule>p:not(.micro)').dataset.teaSchedule='';
}
