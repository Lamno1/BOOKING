import React from 'react';
import {createRoot} from 'react-dom/client';
import {StayOverview} from '../src/StayOverview';
import '../src/styles.css';
import '../src/booking.css';
const booking={id:'FIXTURE-NOT-AN-ORDER',status:'CANCELLED',roomName:'I-103 · Phòng bốn',roomNumber:'I-103',propertyName:'STAYOS Inn',arrival:'2026-10-16',departure:'2026-10-18',guests:4,roomTotal:1500000,total:2150000,nightlyRate:750000,roomSnapshot:{area:34,beds:'2 giường đôi',capacity:4,features:['Wi-Fi']},policy:{checkIn:'14:00',checkOut:'12:00',cleaningFee:0,deposit:0,taxIncluded:true,cancellation:'Chính sách fixture kiểm thử, không phải lời hứa kinh doanh.',payment:'Không thu tiền.'}};
createRoot(document.getElementById('root')).render(<main className="booking-app"><section className="content-section"><p>KIỂM TRA COMPONENT THẬT · DỮ LIỆU GIẢ · KHÔNG ĐỌC/GHI DATABASE</p><StayOverview booking={booking} onBrowse={()=>location.assign('./selection.html')} onSupport={()=>{}}/></section></main>);
