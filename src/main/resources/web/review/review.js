const [catalog,proposal]=await Promise.all(['catalog.json','packages.json'].map(f=>fetch(new URL(f,import.meta.url)).then(r=>r.json())));
const money=n=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
const names=ids=>ids.map(id=>catalog.properties.find(p=>p.id===id).name).join(' / ');
const table=(heads,rows)=>'<div class="table-scroll"><table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(cols=>'<tr>'+cols.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
document.querySelector('#package-table').innerHTML=table(['Gói / cơ sở','Giá đề xuất','Tiện nghi / quyền lợi đã gồm','Số người, số lần, đặt lịch','Điều kiện & quyết định'],proposal.packages.map(p=>[
 '<strong>'+p.name+'</strong><small>'+names(p.properties)+'</small>',
 'Giá phòng + '+money(p.nightlySupplement)+'/đêm<small>R-101: '+money(850000+p.nightlySupplement)+'/đêm'+(p.properties.includes('inn')?' · I-101: '+money(450000+p.nightlySupplement)+'/đêm':'')+'</small>',
 'Tiện nghi theo phòng: phòng tắm, Wi-Fi, điều hòa; Residence thêm bếp và sinh hoạt.<br><b>'+(p.benefits.map(b=>b.name+' — đã gồm, +0₫').join('<br>')||'Không có quà tặng')+'</b>',
 p.benefits.map(b=>b.people+' người · '+b.uses+'<small>'+b.schedule+'</small>').join('')||'Không yêu cầu đặt lịch tiện nghi có sẵn.',
 p.conditions+'<p class="pending">'+p.decision+'</p>'
]));
document.querySelector('#addons-table').innerHTML=table(['Mua thêm / cơ sở','Giá & đơn vị tính','Phạm vi','Điều kiện','Cần duyệt'],proposal.addons.map(s=>['<strong>'+s.name+'</strong><small>'+names(s.properties)+'</small>',money(s.price)+'<small>'+s.unit+'</small>',s.description,s.conditions,'<span class="pending">'+s.decision+'</span>']));
document.querySelector('#inventory-table').innerHTML=table(['Cơ sở / mã','Loại / tầng','Diện tích / sức chứa','Giường','Giá cơ sở / đêm'],catalog.rooms.map(r=>[names([r.propertyId])+'<strong>'+r.number+'</strong>',r.typeName+' · tầng '+r.floor,r.area+' m² · '+r.capacity+' khách',r.beds,money(r.price)]));
const frame=document.querySelector('#preview'),shell=document.querySelector('#frame-shell'),mat=document.querySelector('.preview-mat');
let screen='home',size=window.innerWidth<760?'mobile':'desktop';
function resize(){mat.classList.toggle('mobile',size==='mobile');if(size==='desktop'){const scale=Math.min(1,mat.clientWidth/1440);shell.style.transform='scale('+scale+')';shell.style.marginBottom=((840*scale)-840)+'px';}else{shell.style.transform='none';shell.style.marginBottom='0';}
 document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===size)));}
document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>{screen=b.dataset.screen;frame.src='./prototype.html?screen='+screen;document.querySelector('#open-screen').href=frame.src;document.querySelectorAll('[data-screen]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=b.dataset.size;resize();});
window.addEventListener('resize',resize);resize();
document.querySelector('#screen-links').innerHTML=['home','rooms','detail','checkout'].flatMap((s,i)=>['desktop','mobile'].map(device=>'<a href="./screenshots/'+s+'-'+device+'.jpg" target="_blank">'+['Trang chủ','Danh sách','Chi tiết','Checkout'][i]+' · '+device+' ↗</a>')).join('');
