"""Validate the geometric proposal, render its vector plan and write review evidence.
Run with workspace Python (Shapely + CairoSVG), after Blender builder completes.
"""
import json, math, hashlib, html
from pathlib import Path
from itertools import combinations
import cairosvg
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/logan-option-b'
r=json.loads((OUT/'geometry-review.json').read_text())
a=json.loads((ROOT/'assets/logan-option-a/geometry-review.json').read_text())
rooms=[Polygon(p['polygon']) for p in r['floor15Proposal']]
terraces=[Polygon(p['balconyPolygon']) for p in r['floor15Proposal']]
core=box(14,3,26,17)
corridor=box(8.5,-2,31.5,22).difference(core)
glazing=Polygon(r['floor15GlazingPolygon']);slab=Polygon(r['floor15SlabPolygon'])
checks=[]
def check(name,passed,detail):checks.append(dict(name=name,passed=bool(passed),detail=detail))
check('polygons_valid',all(p.is_valid for p in rooms+terraces+[slab,glazing]),'8 room / 8 terrace polygons and floor envelope')
overlap=max(p.intersection(q).area for p,q in combinations(rooms,2))
check('room_overlap',overlap<1e-6,dict(maxOverlapM2=overlap))
check('core_clear',all(p.intersection(core).area<1e-6 for p in rooms),'Core rectangle retained in proposal')
check('room_corridor_clear',max(p.intersection(corridor).area for p in rooms)<.02,'Small sampled corner chord tolerance 0.02 m2')
check('rooms_within_glazing',max(p.difference(glazing).area for p in rooms)<.02,'Same analytic outline sampled at 256 vertices')
check('terraces_within_slab',max(p.difference(slab).area for p in terraces)<.02,'Same analytic outline sampled at 256 vertices')
check('terraces_outside_rooms',max(p.intersection(q).area for p in rooms for q in terraces)<.02,'No shared floor area beyond sampling tolerance')
for p,room in zip(rooms,r['floor15Proposal']):
    door=Point(room['entryDoor']);baldoor=Point(room['balconyDoor'])
    check(room['roomId']+'_entry',p.boundary.distance(door)<.01 and corridor.boundary.distance(door)<.01,'Proposed door touches room and circulation boundary')
    check(room['roomId']+'_window',p.boundary.distance(baldoor)<.01 and glazing.boundary.distance(baldoor)<.01,'Proposed balcony door lies on curved external glazing')
oldland=unary_union([Polygon(p) for p in r['sourceIslandProjectedFaces'] if len(p)>2])
newland=Polygon(r['islandCoastPolygon'])
# Test outermost submerged beach edge too, not only landmark centre points.
from shapely.affinity import scale
beach=scale(newland,xfact=1.035,yfact=1.035,origin=(0,0))
for name,footprint in [('DINING',box(-133,-87,-103,-65)),('PAVILION',Point(-166,0).buffer(13))]:
    check(name+'_offshore',beach.intersection(footprint).area<.01,dict(landOverlapM2=beach.intersection(footprint).area))
cam_diffs=[]
for bc,ac in zip(r['cameras'],a['cameras']):
    cam_diffs.extend(abs(x-y) for x,y in zip(bc['position'],ac['position']))
    cam_diffs.extend(abs(x-y) for x,y in zip(bc['rotation'],ac['rotationEuler']))
    cam_diffs.extend([abs(bc['lens']-ac['lensMm']),abs(bc['orthoScale']-ac['orthoScale'])])
check('same_A_B_cameras',max(cam_diffs)<1e-8,dict(maxNumericDifference=max(cam_diffs)))
check('source_A_unchanged',hashlib.sha256((ROOT/'assets/logan-option-a/logan-option-a.blend').read_bytes()).hexdigest()==r['sourceSha256'],'SHA256 after B render')
result=dict(checks=checks,passed=all(c['passed'] for c in checks),
    islandOldProjectedAreaM2=oldland.area,islandBCoastAreaM2=newland.area,islandAreaRatio=newland.area/oldland.area,
    oldDimensions=[oldland.bounds[2]-oldland.bounds[0],oldland.bounds[3]-oldland.bounds[1]],
    newDimensions=[newland.bounds[2]-newland.bounds[0],newland.bounds[3]-newland.bounds[1]],
    limitations='Plan boundary checks only; no furniture, usable net area, structure, egress, full-scene collisions or view certification')
(OUT/'validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
cairosvg.svg2png(url=str(OUT/'04-floor-15.svg'),write_to=str(OUT/'04-floor-15.png'))
def site_points(poly):return ' '.join(f'{480+x*1.95:.1f},{460-y*1.95:.1f}' for x,y in poly)
old_outline=list(max(oldland.geoms,key=lambda p:p.area).exterior.coords) if oldland.geom_type=='MultiPolygon' else list(oldland.exterior.coords)
site_svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="900"><rect width="100%" height="100%" fill="#e1edf0"/><g font-family="Arial,sans-serif" fill="#253c42">',
 '<text x="32" y="42" font-size="25">LOGAN · QUY MÔ ĐẢO A / B</text>',
 '<text x="32" y="74" font-size="17">Cùng hệ tọa độ, không thu nhỏ tháp hay di chuyển mốc công trình</text>',
 f'<polygon points="{site_points(r["islandCoastPolygon"])}" fill="#d2dcc2" stroke="#506950" stroke-width="3"/>',
 f'<polygon points="{site_points(old_outline)}" fill="none" stroke="#a35743" stroke-width="3" stroke-dasharray="8 6"/>']
for path in [[(120,0),(260,0)],[(-110,0),(-165,0)],[(-92,-56),(-118,-76)]]:
    site_svg.append(f'<polyline points="{site_points(path)}" fill="none" stroke="#f6f2e4" stroke-width="8"/>')
for title,p,w,h in [('Tháp',(20,10),60,60),('Hồ',(0,-48),54,30),('Spa',(-25,56),32,20),('Nhà hàng',(-118,-76),30,22),('Pavilion',(-166,0),26,26)]:
    x,y=480+p[0]*1.95,460-p[1]*1.95
    site_svg.append(f'<rect x="{x-w*.975}" y="{y-h*.975}" width="{w*1.95}" height="{h*1.95}" rx="8" fill="#f6f2e4" stroke="#51616b"/>')
    site_svg.append(f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="13">{title}</text>')
site_svg += ['<text x="40" y="810" font-size="17">Đỏ nét đứt: đảo gốc. Xanh: bờ B đề xuất. Phần mở rộng chưa thiết kế cảnh quan chi tiết.</text>',
 f'<text x="40" y="842" font-size="17">{oldland.area/10000:.2f} ha → {newland.area/10000:.2f} ha · {result["islandAreaRatio"]:.2f} lần diện tích · BẮC ↑</text></g></svg>']
(OUT/'05-island-scale.svg').write_text('\n'.join(site_svg),encoding='utf-8')
cairosvg.svg2png(url=str(OUT/'05-island-scale.svg'),write_to=str(OUT/'05-island-scale.png'))

lines=['# Logan B — đối chiếu hình học, chờ duyệt','',
 'B đọc bản A và lưu sang `logan-option-b.blend`. Không sửa A, nguồn GLB, manifest hoặc website.',
 '', '## Thay đổi','',
 '- Thay sàn chữ nhật và mặt kính A bằng đường bao nhiều múi thay đổi theo cao độ; lõi và mốc tầng không xoay.',
 '- Ban công phân thành tám khu, có vách riêng và vị trí cửa trượt đề xuất. Hai dải champagne bám mép sàn có liên kết về tầng.',
 '- Mái chia thành hai khối cong lùi vào, chừa sân mái; chưa trang trí vườn mái.',
 '- Giữ tuyến cầu → sân → mái đón → cửa sảnh A. Giữ transform 18 sàn nguồn và 1.154 mốc; các sàn nguồn được ẩn, không xóa.',
 f'- Đảo: {result["oldDimensions"][0]:.1f} × {result["oldDimensions"][1]:.1f} m → {result["newDimensions"][0]:.1f} × {result["newDimensions"][1]:.1f} m. Diện tích chiếu bằng {oldland.area:,.0f} → {newland.area:,.0f} m² ({result["islandAreaRatio"]:.2f} lần).',
 '- Bờ mở rộng chủ yếu về bắc, đông bắc và đông nam; giữ vịnh lõm tại đầu cầu và khoảng nước nhà hàng/pavilion. Cảnh quan mới chỉ phân khu, chưa hoàn thiện.',
 '', '## Cùng camera, không che khác biệt','',
 'Ba ảnh A được lấy từ bộ A đã giao; B dùng nguyên camera, tiêu cự, tỷ lệ ảnh, ánh sáng và thiết lập Cycles 32 samples của A. Không dùng ảnh AI.',
 'Ảnh B ở 1600×1200: `01-facade.png`, `02-approach.png`, `03-entry.png`.',
 'Mặt bằng `04-floor-15.svg/png` được lấy từ cùng hàm đường bao B, không vẽ một mặt bằng độc lập.',
 '', '## Xung đột và đề xuất — không âm thầm đổi phòng','',
 f'{r["conflictingRoomCount"]}/112 phòng có ít nhất một vấn đề hình học khi giữ footprint/balcony v2. Những mốc vẫn tồn tại không có nghĩa chúng còn phù hợp.',
 'Bảng sau là đề xuất tầng 15: cửa đi và diện tích phải được duyệt lại. Diện tích B là gross phân khu, không phải diện tích phòng thương mại/net.',
 '', '| Phòng | V2 trong / ban công m² | B gross trong / ban công m² | Dịch cửa đề xuất m |',
 '|---|---:|---:|---:|']
for p in r['floor15Proposal']:
    lines.append(f'| {p["roomId"]} | {p["originalInsideTarget"]} / {p["originalBalconyTarget"]} | {p["proposedGrossInsideArea"]:.1f} / {p["proposedGrossBalconyArea"]:.1f} | {p["doorShiftMetres"]:.2f} |')
lines += ['', 'Phương án xử lý: duyệt phân khu B với diện tích mới, hoặc giữ chỉ tiêu v2 rồi phân bổ phần dư thành loggia, sân lùi và không gian dịch vụ. Chưa thay số liệu trong booking.',
 '', '### Chi tiết từng phòng bị ảnh hưởng','',
 '| Phòng | Góc phòng ngoài kính B | Góc ban công ngoài sàn | Góc ban công lọt vào vùng kín | Khoảng từ góc phòng cũ gần nhất đến kính B (m) |',
 '|---|---:|---:|---:|---:|']
for p in r['roomCompatibility']:
    lines.append(f'| {p["roomId"]} | {len(p["roomCornersOutside"])} | {len(p["balconyCornersOutside"])} | {len(p["balconyCornersInsideGlazing"])} | {p["nearestOldCornerToGlazing"]:.2f} |')
lines += ['', 'Tọa độ từng điểm xung đột nằm trong `geometry-review.json` (world X đông, Y bắc; cao độ = (tầng−1)×3,6).',
 '', '## Kiểm tra','', f'Kết quả kiểm tra biên hình học: {"PASS" if result["passed"] else "CÓ MỤC CHƯA ĐẠT — xem validation.json"}.',
 'Chỉ kiểm tra polygon/biên cửa trong sơ đồ đề xuất, không chứng nhận cửa thực thi, nội thất, kết cấu, hành lang thoát hiểm hoặc toàn cảnh không va chạm.',
 '', '## Tái tạo','', '```powershell',
 "& 'tools/blender-portable/blender-4.5.9-windows-x64/blender.exe' --background --factory-startup --python scripts/build-logan-architecture-option-b.py",
 "& 'C:/Program Files/Python313/python.exe' scripts/review-logan-option-b.py", '```',
 '', 'Chưa làm vật liệu cuối, animation, nội thất hoặc booking. Dừng ở duyệt hình khối B và quy mô đảo.']
(OUT/'README.md').write_text('\n'.join(lines),encoding='utf-8')

# A self-contained local review page with original renders side by side.
cards=[]
for filename,title in [('01-facade','Mặt đứng'),('02-approach','Lối tiếp cận và quy mô đảo'),('03-entry','Cửa sảnh giữ từ A')]:
    cards.append(f'<section><h2>{title}</h2><div class="pair"><figure><figcaption>A · tham chiếu</figcaption><a href="../logan-option-a/{filename}.png"><img src="../logan-option-a/{filename}.png" alt="A {title}"></a></figure><figure><figcaption>B · đề xuất, chưa duyệt</figcaption><a href="{filename}.png"><img src="{filename}.png" alt="B {title}"></a></figure></div></section>')
page='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Logan A / B — duyệt hình khối</title>
<style>body{margin:0;background:#f4f2ec;color:#20353d;font:17px/1.6 system-ui,sans-serif}main{max-width:1700px;margin:auto;padding:32px}h1{font-size:32px;margin:0}h2{font-size:24px;margin-top:44px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{padding:12px 0}img{width:100%;height:auto;display:block}a{color:#235b6a}.notice{padding:18px;background:#e8dfca} .plan{max-width:1320px}@media(max-width:720px){main{padding:18px}.pair{grid-template-columns:1fr}}</style><main><h1>Logan · Phương án A / B</h1><p>Cùng ba camera, cùng ánh sáng. B thay hình khối, không phải bản vật liệu cuối.</p>'''
page+=f'<p class="notice">Đảo {result["newDimensions"][0]:.0f} × {result["newDimensions"][1]:.0f} m, diện tích {result["islandAreaRatio"]:.2f} lần bản cũ. 112 phòng cần đối chiếu lại; sơ đồ B chưa thay catalog đặt phòng.</p>'
page+=''.join(cards)+'<section><h2>Tầng 15 · phân khu đề xuất và footprint v2 nét đứt</h2><a href="04-floor-15.png"><img class="plan" src="04-floor-15.png" alt="Mặt bằng tám phòng tầng 15"></a></section><p><a href="README.md">Báo cáo xung đột đầy đủ</a> · <a href="validation.json">Kiểm tra hình học</a> · <a href="logan-option-b.blend">File Blender B</a></p></main></html>'
page=page.replace('</main>','<section><h2>Đảo A / B · cùng tỷ lệ</h2><img class="plan" src="05-island-scale.png" alt="Đối chiếu bờ đảo A và B"></section></main>')
(OUT/'index.html').write_text(page,encoding='utf-8')
print(json.dumps(result,indent=2))
assert result['passed'],'Review checks failed; do not report accepted geometry'
