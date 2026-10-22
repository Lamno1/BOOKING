import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Render the actual JSX component without logging in or writing a booking.
const built = await build({entryPoints:['src/features/trips/StayOverview.jsx'],bundle:true,write:false,platform:'node',format:'esm',define:{'process.env.NODE_ENV':'"production"'}});
const {StayOverview} = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
const booking={id:'TEST-ONLY',status:'CANCELLED',roomName:'I-103 · Phòng bốn',roomNumber:'I-103',propertyName:'STAYOS Inn',arrival:'2026-10-16',departure:'2026-10-18',guests:4,roomTotal:1500000,total:2150000,nightlyRate:750000,roomSnapshot:{area:34,beds:'2 giường đôi',capacity:4,features:['Wi-Fi']},policy:{checkIn:'14:00',checkOut:'12:00',cleaningFee:0,deposit:0,taxIncluded:true,cancellation:'Điều kiện đã lưu',payment:'Không thu tiền.'}};
const render=b=>renderToStaticMarkup(React.createElement(StayOverview,{booking:b,onSupport(){},onBrowse(){}}));
test('cancelled receipt shows saved money and policy, not an active stay',()=>{
  const html=render(booking);
  assert.ok(html.includes('<time dateTime="2026-10-16">16/10/2026</time>'));
  for(const text of ['Đặt phòng đã hủy.','Tìm kỳ nghỉ mới','I-103','1.500.000','650.000','2.150.000','Điều kiện đã lưu','trước khi hủy'])assert.ok(html.includes(text),text);
  for(const text of ['Chuẩn bị đến nơi','Trong kỳ nghỉ','Thông tin hỗ trợ →'])assert.ok(!html.includes(text),text);
});
test('checked-out receipt has no active service action',()=>{
  const html=render({...booking,status:'CHECKED_OUT'});
  assert.ok(html.includes('Kỳ nghỉ đã kết thúc.'));
  assert.ok(!html.includes('Thông tin hỗ trợ →'));
});
test('active and legacy receipts do not invent address or overwrite historical facts',()=>{
  const active=render({...booking,status:'CONFIRMED'});
  assert.ok(active.includes('Chuẩn bị đến nơi'));assert.ok(active.includes('Chưa có địa chỉ xác minh'));
  const legacy=render({...booking,roomSnapshot:undefined,policy:undefined,roomTotal:undefined,total:4980000});
  assert.ok(legacy.includes('4.980.000'));assert.ok(legacy.includes('Đơn cũ chưa lưu thông số phòng'));
  assert.ok(legacy.includes('Đơn cũ chưa có bản chụp chính sách'));
});
