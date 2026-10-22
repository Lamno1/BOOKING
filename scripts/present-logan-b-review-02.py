"""Publish review drawings from floor15-study.json, with explicit decision gates."""
import json,math,html
from pathlib import Path
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
import cairosvg
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/logan-b-review-02'
D=json.loads((OUT/'floor15-study.json').read_text())
B=json.loads((ROOT/'assets/logan-option-b/geometry-review.json').read_text())
V=json.loads((ROOT/'assets/logan-option-b/validation.json').read_text())
assert D['passed'],'Do not publish as passing when a geometry check failed'
def shape(data):return unary_union([Polygon(p['shell'],p['holes']) for p in data])
colors=['#eed5bf','#dfd7bb','#c9dfca','#c0dfe0','#c7d5e8','#d9cce5','#e6cbc2','#eadba7']
def drawing(overlay=False):
    S=15;cx=480;cy=575
    def xy(p):return (cx+(p[0]-20)*S,cy-(p[1]-10)*S)
    def path(data):
        bits=[]
        for poly in data:
            for ring in [poly['shell']]+poly['holes']:
                bits.append('M'+' L'.join(f'{xy(p)[0]:.2f},{xy(p)[1]:.2f}' for p in ring)+' Z')
        return ' '.join(bits)
    def fill(data,color,stroke='none',width=1):return f'<path d="{path(data)}" fill="{color}" stroke="{stroke}" stroke-width="{width}" fill-rule="evenodd"/>'
    def polyline(points,color,width=2,dash=''):
        return '<polyline points="'+' '.join(f'{xy(p)[0]:.2f},{xy(p)[1]:.2f}' for p in points)+f'" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" '+(f'stroke-dasharray="{dash}"' if dash else '')+'/>'
    def text_at(p,txt,size=14):
        x,y=xy(p);return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" paint-order="stroke" stroke="#faf8ef" stroke-width="3">{html.escape(txt)}</text>'
    title='ĐỐI CHIẾU VỊ TRÍ V2 → TẦNG MẪU' if overlay else 'TẦNG 15 · THỬ CÔNG NĂNG TÁM PHÒNG'
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1510" height="1220" viewBox="0 0 1510 1220">',
      '<defs><pattern id="reserve" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#efefeb"/><path d="M0 8L8 0" stroke="#d8d9d4" stroke-width="1"/></pattern></defs>',
      '<rect width="100%" height="100%" fill="#faf8ef"/><g font-family="Arial,sans-serif" fill="#243940">',
      '<text x="40" y="45" font-size="27">LOGAN B / '+title+'</text>',
      '<text x="40" y="77" font-size="17">Cao độ +50,40 m · chỉ một tầng · cửa / tường / khối giường &amp; WC / lối đi kiểm tra</text>',
      fill(D['slab'],'#e4e9df','#526b5c',1.5),fill(D['residualIndoor'],'url(#reserve)'),fill(D['corridor'],'#f2e9d7','#8c9289'),fill(D['core'],'#acbec2','#304b54',2)]
    for r,c in zip(D['rooms'],colors):
        svg += [fill(r['gross'],c),fill(r['balcony'],'#c4d5bd','#65806a',1),fill(r['outerWalls'],'#40565a'),fill(r['internalWalls'],'#40565a'),fill(r['bath'],'#dae6e5','#718e92',1),fill(r['bed'],'#fcfaf4','#566e72',1.5)]
        # Bed and sanitary envelopes are spatial checks, not detailed interiors.
        for key,label in [('bath','WC'),('bed','2×2,1')]:
            p=shape(r[key]).centroid
            svg.append(text_at((p.x,p.y),label,11))
        if r['mainRoute']:svg.append(polyline([r['entry']['point']]+r['mainRoute']+[r['balconyDoor']['point']],'#be7b26',2.4,'5 3'))
        if r['bathRoute']:svg.append(polyline(r['bathRoute'],'#be7b26',1.7,'3 3'))
        for door in [r['entry'],r['balconyDoor'],r['bathDoor']]:
            if not door['ends']:continue
            svg.append(polyline(door['ends'],'#faf8ef',5))
            svg.append(polyline(door['ends'],'#138b9a',1.5))
        # Glazing arc uses the exact B floor contour clipped to this room frontage.
        arc=shape(r['gross']).boundary.intersection(shape(D['glazing']).boundary)
        for seg in ([arc] if arc.geom_type=='LineString' else getattr(arc,'geoms',[])):
            if seg.geom_type=='LineString':svg.append(polyline(list(seg.coords),'#238591',2))
        clear=shape(r['net']).difference(shape(r['bath']).buffer(.4)).difference(shape(r['bed']).buffer(.4))
        p=clear.representative_point();svg.append(text_at((p.x,p.y),r['roomId'].replace('TS-',''),14))
        if overlay:
            svg.append(polyline(r['originalFootprint'],'#b24d44',1.7,'6 4'))
            a=r['entry']['old'];b=r['entry']['point'];svg.append(polyline([a,b],'#b24d44',2.3))
            x,y=xy(a);svg.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#b24d44"/>')
    svg += [text_at((20,11),'LÕI 12 × 14 m',19),text_at((20,8.8),'thang / trục: chưa chốt',12),text_at((20,19.5),'HÀNH LANG VÒNG',12),
      '<text x="1020" y="160" font-size="22">BẮC ↑</text>',
      '<text x="1020" y="199" font-size="18">Diện tích net / ban công (m²)</text>']
    for i,r in enumerate(D['rooms']):svg.append(f'<text x="1020" y="{235+i*31}" font-size="17">{r["roomId"]}: {r["netArea"]:.2f} / {r["balconyNetArea"]:.2f}</text>')
    legend=['Tường bao: 240 mm; vách WC: 120 mm','Cửa vào: 1,10 m; ra ban công: 1,80 m','Cửa WC: 0,90 m','Nét cam: kiểm tra đĩa đi lại Ø 1,00 m','WC: khối 2,60 × 2,40 m','Giường: khối 2,10 × 2,00 m','Xanh nhạt: ban công riêng','Gạch chéo: phần đệm chưa chốt',f'Không tính {D["residualIndoorArea"]:.1f} m² đệm vào phòng.','Đỏ nét đứt: footprint / cửa v2' if overlay else 'Bản thử công năng, chưa là hồ sơ thi công.']
    for i,line in enumerate(legend):svg.append(f'<text x="1020" y="{525+i*30}" font-size="15">{html.escape(line)}</text>')
    svg += ['<path d="M1040 900h150 M1040 892v16 M1190 892v16" stroke="#243940" fill="none" stroke-width="2"/><text x="1040" y="930" font-size="16">0 ————— 10 m</text>',
      '<text x="40" y="1080" font-size="18">Net = sàn lọt lòng tường − vách WC; có tính sàn WC, không tính ban công, tường và vùng đệm.</text>',
      '<text x="40" y="1115" font-size="17">Có chỗ cho khối giường / WC và đường đi kiểm tra; chưa kiểm chứng đầy đủ sinh hoạt, nội thất, thoát hiểm.</text>',
      '<text x="40" y="1150" font-size="17">Giữ roomId và hướng v2. Không có phòng nào giữ nguyên toàn bộ footprint; xem bảng đối chiếu cửa / diện tích.</text></g></svg>']
    return '\n'.join(svg)
for name,overlay in [('04-floor15-usable',False),('05-floor15-v2-overlay',True)]:
    (OUT/(name+'.svg')).write_text(drawing(overlay),encoding='utf-8')
    cairosvg.svg2png(url=str(OUT/(name+'.svg')),write_to=str(OUT/(name+'.png')))

# Same drawing scale for both sites. No assertion that larger land is necessary.
old=unary_union([Polygon(p) for p in B['sourceIslandProjectedFaces'] if len(p)>2])
new=Polygon(B['islandCoastPolygon'])
oldpoly=max(old.geoms,key=lambda p:p.area) if old.geom_type=='MultiPolygon' else old
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="970"><rect width="100%" height="100%" fill="#f8f6ef"/><g font-family="Arial,sans-serif" fill="#243940"><text x="36" y="40" font-size="26">QUY HOẠCH ĐẢO · QUYẾT ĐỊNH RIÊNG, CÙNG TỶ LỆ</text>']
for i,(poly,title) in enumerate([(oldpoly,'S0 · đảo cũ 3,39 ha — cơ sở hiện tại'),(new,'S1 · 7,07 ha — CHƯA DUYỆT')]):
    cx=310+i*800;cy=420;scale=1.7
    def pts(coords):return ' '.join(f'{cx+x*scale:.1f},{cy-y*scale:.1f}' for x,y in coords)
    svg += [f'<text x="{30+i*800}" y="93" font-size="22">{title}</text>',f'<rect x="{15+i*800}" y="118" width="770" height="620" fill="#e0ebee"/>',f'<polygon points="{pts(poly.exterior.coords)}" fill="#d4dec7" stroke="#54715a" stroke-width="2"/>']
    if i:svg.append(f'<polygon points="{pts(oldpoly.exterior.coords)}" fill="none" stroke="#aa6554" stroke-width="2" stroke-dasharray="7 4"/>')
    for a,b in [[(120,0),(260,0)],[(-110,0),(-165,0)],[(-92,-56),(-118,-76)]]:svg.append(f'<polyline points="{pts([a,b])}" stroke="#fff8df" stroke-width="6"/>')
    for title,p,w,h in [('Tháp',(20,10),60,60),('Hồ',(0,-48),54,30),('Spa',(-25,56),32,20),('NH',(-118,-76),30,22),('PV',(-166,0),26,26)]:
        x,y=cx+p[0]*scale,cy-p[1]*scale;svg.append(f'<rect x="{x-w*scale/2}" y="{y-h*scale/2}" width="{w*scale}" height="{h*scale}" fill="#fff9eb" stroke="#607879"/><text x="{x}" y="{y+5}" text-anchor="middle" font-size="13">{title}</text>')
    svg.append(f'<path d="M{30+i*800} 776h170" stroke="#243940" stroke-width="3"/><text x="{30+i*800}" y="804" font-size="17">0 ————— 100 m · BẮC ↑</text>')
svg+=['<text x="36" y="865" font-size="18">S0 giữ công năng hiện có. Chưa có yêu cầu công năng định lượng buộc phải mở rộng.</text>',
      '<text x="36" y="901" font-size="18">S1 thêm khoảng 3,68 ha: mới là quỹ cây xanh / bờ đệm / đường dạo dự phòng, chưa có chương trình đủ để duyệt.</text>',
      '<text x="36" y="937" font-size="18">Khuyến nghị: tiếp tục tháp và tầng mẫu trên S0; không gộp duyệt mặt đứng với quyết định mở rộng đất.</text></g></svg>']
(OUT/'06-site-options.svg').write_text('\n'.join(svg),encoding='utf-8');cairosvg.svg2png(url=str(OUT/'06-site-options.svg'),write_to=str(OUT/'06-site-options.png'))

lines=['# Logan — tách ba quyết định / tầng mẫu 15','',
 '## 1. Hình khối tháp','',
 'Giữ tháp B, tuyến tiếp cận và cửa sảnh A; khôi phục mesh đảo gốc và biến đổi cây trước khi nới đất. Không scale lại toàn cảnh. Ba camera và ánh sáng giữ như bộ A/B.',
 'File `logan-b-original-island.blend` là bản riêng; không sửa A, B hoặc scene website.',
 '', '## 2. Quy hoạch đảo','',
 'S0: ranh cũ 3,39 ha là cơ sở. S1: đề xuất 7,07 ha chưa duyệt. Chưa có nhu cầu công năng định lượng chứng minh cần thêm 3,68 ha.',
 'Hình `06-site-options.png` đặt hai ranh cùng tỷ lệ. Phần tăng chỉ được gọi là quỹ cây/bờ đệm/đường dạo dự phòng, không phải quy hoạch đã chốt. Khuyến nghị giữ S0.',
 '', '## 3. Một tầng mẫu — không nhân ra 112 phòng','',
 'Chỉ TS-1501…TS-1508 tại z=50,4 m. Biên sàn và kính lấy từ B. Lõi và ranh hành lang nguồn giữ nguyên; các mốc nguồn không bị di chuyển.',
 'Thay cách chia tám lát gross bằng tám phòng có tường bao 240 mm, vách WC 120 mm, cửa vào 1,10 m, cửa ban công 1,80 m và cửa WC 0,90 m.',
 '**Định nghĩa net:** tính từ mặt trong tường bao, trừ vách WC, cộng sàn WC; không tính ban công, sàn tường, hốc cửa và phần đệm. Là diện tích phục vụ thử nghiệm thiết kế, chưa phải số liệu thương mại đã xác nhận.',
 '', '| Phòng | v2 trong / BC | Net đề xuất / BC | Δ net m² | Dịch cửa vào m | Giữ được / phải đổi |','|---|---:|---:|---:|---:|---|']
for r in D['rooms']:
    preserved='giữ vị trí cửa' if r['entry']['shift']<.01 else 'đổi vị trí cửa'
    lines.append(f'| {r["roomId"]} | {r["targetInside"]} / {r["targetBalcony"]} | {r["netArea"]:.2f} / {r["balconyNetArea"]:.2f} | +{r["netDelta"]:.2f} | {r["entry"]["shift"]:.2f} | Giữ mã, hướng, chỉ tiêu gần đúng; {preserved}; đổi footprint và ban công |')
lines+=['', 'Không có phòng nào giữ nguyên toàn bộ footprint v2. Cửa TS-1502, TS-1507, TS-1508 giữ được tọa độ cũ; các cửa còn lại dịch chuyển theo bảng.',
 '', '### Tọa độ cửa và công năng thử','', '| Phòng | Cửa cũ X,Y | Cửa mới X,Y | Cửa ban công X,Y |','|---|---|---|---|']
for r in D['rooms']:
    f=lambda p:', '.join(f'{v:.3f}' for v in p)
    lines.append(f'| {r["roomId"]} | {f(r["entry"]["old"])} | {f(r["entry"]["point"])} | {f(r["balconyDoor"]["point"])} |')
lines+=['', 'Mỗi phòng đã đặt thử khối giường 2,10×2,00 m và khối vệ sinh 2,60×2,40 m. Kiểm tra đường đi bằng đĩa Ø1,00 m đến ban công và tới trước cửa WC, có tránh hai khối này.',
 'Đây không phải chứng minh căn suite đã hoàn chỉnh: chưa có đầy đủ bếp, tủ, ghế, phòng ngủ riêng, cấu tạo cửa kính và thiết bị WC. Đường đi 1 m không phải chứng nhận tiếp cận xe lăn hoặc thoát hiểm.',
 '', '### Phần còn phải giải quyết trước khi chốt tầng', '',
 f'- Còn **{D["residualIndoorArea"]:.1f} m² phần đệm bên trong lớp kính**, thể hiện gạch chéo; không tính vào phòng, chưa tự gán thành phòng bán thêm.',
 f'- Còn {D["deckReserveArea"]:.1f} m² sàn ngoài phần ban công riêng; chưa là diện tích sử dụng được duyệt.',
 '- Có thể phân bổ phần đệm thành không gian chung/dịch vụ hoặc loggia; chuyển thành loggia cần thay kính và xem lại mặt đứng. Chưa thực hiện để tránh gộp thêm quyết định.',
 '- Lõi mới giữ vị trí/bounds; chưa thiết kế cụ thể cầu thang, thang máy, trục kỹ thuật hay phân khoang cháy.',
 '- Ranh phòng và ban công của tầng mẫu khác các vách chia ban công B cũ. Scene toàn tháp chỉ dùng duyệt hình khối, không được coi là đã tích hợp mặt bằng mới.',
 '- Sau khi duyệt tầng này mới kiểm tra từng cao độ khác; không suy rộng kết quả tới 112 phòng.',
 '', '## Kết quả kiểm tra phạm vi hẹp','',
 f'{len(D["checks"])} kiểm tra dữ liệu tầng mẫu: '+('PASS' if D['passed'] else 'FAIL')+'. Chi tiết trong `floor15-study.json`.',
 'PASS chỉ gồm hình học, diện tích theo giả định tường, cửa, ban công và phép thử đường đi với hai khối công năng; không phải nghiệm thu kiến trúc.',
 '', '## Tái tạo','', '```powershell',
 "& 'tools/blender-portable/blender-4.5.9-windows-x64/blender.exe' --background --factory-startup --python scripts/build-logan-b-original-site.py",
 "& 'C:/Program Files/Python313/python.exe' scripts/plan-logan-floor15-review.py",
 "& 'C:/Program Files/Python313/python.exe' scripts/present-logan-b-review-02.py", '```']
(OUT/'README.md').write_text('\n'.join(lines),encoding='utf-8')
table=''.join(f'<tr><td>{r["roomId"]}</td><td>{r["targetInside"]} / {r["targetBalcony"]}</td><td>{r["netArea"]:.2f} / {r["balconyNetArea"]:.2f}</td><td>{r["entry"]["shift"]:.2f} m</td></tr>' for r in D['rooms'])
page='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Logan — ba quyết định riêng</title><style>body{margin:0;background:#f8f6ef;color:#243940;font:17px/1.6 system-ui}main{max-width:1550px;margin:auto;padding:32px}h1{font-size:32px}h2{margin-top:42px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{width:100%;height:auto}a{color:#285e69}.note{padding:20px;background:#e9e0cc}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}@media(max-width:740px){main{padding:18px}.pair{grid-template-columns:1fr}}</style><main><h1>Logan · Ba quyết định tách riêng</h1><p class="note">Dáng cong B: hướng phát triển. Đảo mở rộng: chưa duyệt. Tầng mẫu: thử công năng, chưa duyệt. Booking: giữ nguyên.</p><h2>1 / Tháp B trên đảo cũ</h2>'''
for image,title in [('01-facade','Mặt đứng'),('02-approach','Tuyến tiếp cận'),('03-entry','Cửa sảnh')]:
    page+=f'<h3>{title} · cùng camera</h3><div class="pair"><figure><figcaption>A trên đảo cũ</figcaption><img src="../logan-option-a/{image}.png" alt="A {title}"></figure><figure><figcaption>B trên đảo cũ — bản mới</figcaption><img src="{image}.png" alt="B {title}"></figure></div>'
page+='<h2>2 / Quy hoạch đảo không gộp với duyệt tháp</h2><img src="06-site-options.png" alt="Hai ranh đảo cùng tỷ lệ"><h2>3 / Một tầng mẫu, không nhân ra 112 phòng</h2><p>Net có trừ tường và vách WC. Khối giường, WC và đường đi chỉ dùng kiểm tra không gian, chưa phải nội thất hoàn chỉnh.</p><img src="04-floor15-usable.png" alt="Tầng mẫu có tường, cửa và đường đi"><table><thead><tr><th>Phòng</th><th>v2 trong / BC</th><th>Net mới / BC (m²)</th><th>Dịch cửa vào</th></tr></thead><tbody>'+table+'</tbody></table>'
page+=f'<p class="note">Còn {D["residualIndoorArea"]:.1f} m² phần đệm chưa chốt công năng; không tính vào diện tích phòng. Không có phòng nào giữ nguyên footprint v2. Chưa kiểm chứng đầy đủ sinh hoạt, kết cấu hoặc thoát hiểm.</p>'
page+='<h3>Đối chiếu vị trí cũ / mới</h3><img src="05-floor15-v2-overlay.png" alt="Đối chiếu footprint v2 và cửa mới"><p><a href="README.md">Báo cáo đầy đủ</a> · <a href="floor15-study.json">Dữ liệu và kết quả kiểm tra</a> · <a href="logan-b-original-island.blend">B trên đảo gốc — Blender</a></p></main></html>'
(OUT/'index.html').write_text(page,encoding='utf-8')
print('Review published:',OUT)
