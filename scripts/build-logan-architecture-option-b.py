"""Option B geometry study. Reads A, preserves anchors/arrival, writes only B.
Blender --background --factory-startup --python scripts/build-logan-architecture-option-b.py
"""
import bpy, math, json, hashlib, ast, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/logan-option-a/logan-option-a.blend'
OUT=ROOT/'assets/logan-option-b'
OUT.mkdir(parents=True,exist_ok=True)
source_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
originals=list(scene.objects)
anchors={o.name:list(o.matrix_world.translation) for o in originals if o.get('isSpatialAnchor')}
levels={o.name:[list(row) for row in o.matrix_world] for o in originals if o.name.startswith('LEVEL_')}
arrival={o.name:[list(row) for row in o.matrix_world] for o in originals if any(c.name in ('A02_PODIUM_ENTRY_PROPOSAL','A03_ARRIVAL_ROUTE_PROPOSAL') for c in o.users_collection)}
manifest=json.loads((ROOT/'assets/architecture-transfer/logan-tidal-source.manifest.json').read_text())
added=[]
# Reuse only pure geometry helpers from A, not A's top-level rebuild/render code.
tree=ast.parse((ROOT/'scripts/build-logan-architecture-option-a.py').read_text())
selected={'collection','mat','box','mesh_obj','line','camera'}
defs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in selected]
facade=None
exec(compile(ast.Module(body=defs,type_ignores=[]),'<A geometry helpers>','exec'))
facade=collection('B01_ORGANIC_TOWER_PROPOSAL')
site=collection('B02_ENLARGED_ISLAND_PROPOSAL')
presentation=bpy.data.collections['A04_INSPECTION_CAMERAS_SCALE']
archive=collection('B_REFERENCE_A_ENVELOPE_HIDDEN')
archive.hide_render=True;archive.hide_viewport=True
hidden=[]
def archive_object(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    archive.objects.link(o);hidden.append(o.name)
bpy.data.collections['A01_FACADE_PROPOSAL'].hide_render=True
bpy.data.collections['A01_FACADE_PROPOSAL'].hide_viewport=True
for o in originals:
    if o.name.startswith('LEVEL_') and o.type=='MESH':archive_object(o)
    if o.name.startswith('A_BLADE_FOOTING'):archive_object(o)
    if o.name=='ISLAND':archive_object(o)
white=bpy.data.materials['A_Precast_light'];stone=bpy.data.materials['A_Limestone_geometry_study']
glass=bpy.data.materials['A_Glazing'];railglass=bpy.data.materials['A_Balcony_glass']
frame=bpy.data.materials['A_Bronze_frames'];champagne=bpy.data.materials['A_Champagne_structure']
sand=mat('B_Shore_geometry_study',(.61,.56,.43))
grass=mat('B_Land_geometry_study',(.22,.27,.15))
N=256

def boundary(floor,theta,kind='deck'):
    """Lobed, floor-dependent usable envelope. Core and level datums do not twist."""
    t=(floor-3)/15
    # Gentle neck/shoulder, with diagonal lobes that migrate over height.
    base=1/math.sqrt((math.cos(theta)/23.8)**2+(math.sin(theta)/26.2)**2)
    wave=4.1*math.cos(2*theta-.8+1.65*t)-2.1*math.cos(4*theta)+1.25*math.cos(3*theta+1.9*t)
    neck=-2.7*math.sin(math.pi*t)+1.5*t
    deck=base+wave+neck
    depth=2.25+1.2*(.5+.5*math.cos(2*theta+2.2*t))
    r=deck if kind=='deck' else deck-depth
    return (20+r*math.cos(theta),10+r*math.sin(theta))

def contour(floor,kind='deck'):
    return [boundary(floor,i*2*math.pi/N,kind) for i in range(N)]

def plate(name,pts,z,h,material,c=facade):
    n=len(pts);v=[(x,y,zz) for zz in (z,z+h) for x,y in pts]
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    f += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh_obj(name,v,f,material,c)

def skin(name,pts,z0,z1,material,c=facade,closed=True):
    v=[(x,y,z) for z in [z0,z1] for x,y in pts];n=len(pts)
    return mesh_obj(name,v,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n if closed else n-1)],material,c)

for floor in range(3,19):
    z=(floor-1)*3.6;deck=contour(floor);inner=contour(floor,'glass')
    slab=plate(f'B_LEVEL_{floor:02}_CURVED_SLAB',deck,z,.28,white)
    slab['sourceLevel']=f'LEVEL_{floor}';slab['floor']=floor
    # Actual curved glazing encloses usable floor, rather than a rectangle behind a trim.
    skin(f'B_LEVEL_{floor:02}_GLASS',inner,z+.29,z+3.37,glass)
    skin(f'B_LEVEL_{floor:02}_SPANDREL',inner,z+3.1,z+3.48,stone)
    line(f'B_LEVEL_{floor:02}_SOFFIT_EDGE',[(x,y,z+.22) for x,y in deck+[deck[0]]],.075,white,facade)
    skin(f'B_LEVEL_{floor:02}_GUARD',deck,z+.33,z+1.38,railglass)
    line(f'B_LEVEL_{floor:02}_HANDRAIL',[(x,y,z+1.39) for x,y in deck+[deck[0]]],.033,frame,facade)
    for i in range(0,N,4):
        p=inner[i]
        line(f'B_FRAME_{floor}_{i}',[(p[0],p[1],z+.29),(p[0],p[1],z+3.4)],.045,frame,facade)
    for slot in range(8):
        theta=slot*math.pi/4
        p=Vector(boundary(floor,theta,'glass'))
        tangent=(Vector(boundary(floor,theta+.002,'glass'))-Vector(boundary(floor,theta-.002,'glass'))).normalized()
        left=p-.85*tangent;right=p+.85*tangent
        line(f'B_SLIDING_DOOR_FRAME_{floor}_{slot}',[(*left,z+.3),(*left,z+2.75),(*right,z+2.75),(*right,z+.3)],.045,frame,facade)
    # Eight radial privacy returns divide real terrace sectors, not one communal ring.
    for i in range(8):
        theta=math.radians(22.5+i*45)
        a=boundary(floor,theta,'glass');b=boundary(floor,theta)
        skin(f'B_TERRACE_PARTITION_{floor}_{i}',[a,b],z+.28,z+2.6,stone,closed=False)

# Roof follows the same lobed envelope; two stepped roof terraces, not a flat box cap.
roof=contour(18)
plate('B_ROOF_CURVED_CROWN',roof,64.8,.42,white)
for wing,(cx,cy,rx,ry,top) in enumerate([(13,22,9,11,67.0),(27,-1,10,10,66.5)],1):
    pts=[]
    for i in range(96):
        a=i*2*math.pi/96;r=1+.10*math.cos(3*a)
        pts.append((cx+rx*r*math.cos(a),cy+ry*r*math.sin(a)))
    plate(f'B_ROOF_WING_{wing}_BASE',pts,65.22,.2,stone)
    skin(f'B_ROOF_WING_{wing}_GLASS',pts,65.42,top,glass)
    plate(f'B_ROOF_WING_{wing}_CAP',[(cx+(x-cx)*1.07,cy+(y-cy)*1.07) for x,y in pts],top,.25,white)
skin('B_ROOF_GARDEN_GUARD',roof,65.22,66.32,railglass)

# Champagne ribs follow changing slab edges and have floor-level ties.
for rib,offset in enumerate([-.9,math.pi-.9],1):
    verts=[]
    for i in range(121):
        t=i/120;f=3+15*t;theta=offset+1.35*t
        for da,dr in [(-.034,-.35),(.034,-.35),(.034,.35),(-.034,.35)]:
            x,y=boundary(f,theta+da);x+=dr*math.cos(theta);y+=dr*math.sin(theta)
            verts.append((x,y,7.2+57.6*t))
    faces=[(4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j) for i in range(120) for j in range(4)]
    faces += [(3,2,1,0),(480,481,482,483)]
    mesh_obj(f'B_CHAMPAGNE_EDGE_RIB_{rib}',verts,faces,champagne,facade)
    for floor in range(3,19):
        theta=offset+1.35*(floor-3)/15
        a=boundary(floor,theta,'glass');b=boundary(floor,theta)
        line(f'B_RIB_TIE_{rib}_{floor}',[(*a,(floor-1)*3.6+.18),(*b,(floor-1)*3.6+.18)],.12,champagne,facade)
    foot=boundary(3,offset)
    line(f'B_RIB_PODIUM_SUPPORT_{rib}',[(*foot,1.15),(*foot,7.3)],.38,champagne,facade)

# Expanded coast: preserve arrival inlet, west pier and dining water pocket.
# Catmull-Rom control points are explicit design data, not a uniform world rescale.
coast_controls=[(120,0),(161,47),(148,112),(77,158),(-20,170),(-99,132),(-130,66),
                (-117,0),(-104,-32),(-92,-56),(-62,-100),(20,-140),(105,-119),(158,-55)]
coast=[]
for j in range(len(coast_controls)):
    p0=Vector(coast_controls[(j-1)%len(coast_controls)]);p1=Vector(coast_controls[j]);p2=Vector(coast_controls[(j+1)%len(coast_controls)]);p3=Vector(coast_controls[(j+2)%len(coast_controls)])
    for k in range(12):
        t=k/12
        p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
        coast.append(tuple(p))
verts=[(0,0,.16)];rings=[.18,.4,.6,.76,.88,.94,1,1.035]
for r in rings:
    for x,y in coast:
        z=.16 if r<.76 else (.55 if r<.88 else (.35 if r<.94 else (-.05 if r<1 else -.65)))
        # Broad raised northern landscape, away from current architecture.
        z+=max(0,y*r-80)/90*max(0,1-r)*4
        verts.append((x*r,y*r,z))
n=len(coast);faces=[(0,1+i,1+(i+1)%n) for i in range(n)]
for ri in range(len(rings)-1):
    for i in range(n):
        a=1+ri*n+i;b=1+ri*n+(i+1)%n;c=b+n;d=a+n
        faces.extend([(a,d,c),(a,c,b)])
terrain=mesh_obj('B_ISLAND_EXPANDED_TERRAIN',verts,faces,grass,site)
terrain.data.materials.append(sand)
for p in terrain.data.polygons:
    p.material_index=0
    if any(v>=1+5*n for v in p.vertices):p.material_index=1
    p.use_smooth=True

ground_bvh=BVHTree.FromPolygons([Vector(v) for v in verts],faces)
def ground_height(x,y):
    hit=ground_bvh.ray_cast(Vector((x,y,20)),Vector((0,0,-1)))
    return hit[0].z if hit[0] is not None else None

# Re-seat source vegetation on the rebuilt terrain; coordinates of architectural
# anchors are untouched. Move complete groves, including fronds, by the same dz.
vegetation_adjustments=[]
for trunk in originals:
    if trunk.type!='MESH' or not trunk.name.endswith('_TRUNK'):continue
    if any(c.hide_render for c in trunk.users_collection):continue
    bounds=[trunk.matrix_world @ Vector(p) for p in trunk.bound_box]
    x=sum(p.x for p in bounds)/8;y=sum(p.y for p in bounds)/8
    h=ground_height(x,y)
    if h is None:continue
    dz=h-min(p.z for p in bounds)-.06
    prefix=trunk.name[:-6]
    moved=[]
    for part in originals:
        if part.name.startswith(prefix+'_') and part.type=='MESH':
            m=part.matrix_world.copy();m.translation.z+=dz;part.matrix_world=m;moved.append(part.name)
    vegetation_adjustments.append(dict(trunk=trunk.name,deltaZ=dz,objects=moved))

# Simple northern/eastern terrain zoning, explicitly not a final landscape art pass.
for j,(cx,cy,rx,ry) in enumerate([(-18,115,40,18),(100,78,25,28),(84,-84,25,15)]):
    pts=[(cx+rx*math.cos(i*math.pi/40),cy+ry*math.sin(i*math.pi/40)) for i in range(80)]
    line(f'B_LANDSCAPE_RESERVE_PATH_{j}',[(*p,(ground_height(*p) or 0)+.04) for p in pts+[pts[0]]],.65,stone,site)

def area(poly):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])))/2
def inside(p,poly):
    x,y=p;odd=False
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:odd=not odd
    return odd
def rect(r):return [(20+r[0],10+r[1]),(20+r[2],10+r[1]),(20+r[2],10+r[3]),(20+r[0],10+r[3])]
def segment_distance(p,a,b):
    p,a,b=Vector(p),Vector(a),Vector(b);d=b-a
    t=max(0,min(1,(p-a).dot(d)/d.length_squared)) if d.length_squared else 0
    return (p-a-t*d).length
def edge_distance(p,poly):return min(segment_distance(p,a,b) for a,b in zip(poly,poly[1:]+poly[:1]))

# All old markers are kept, but compatibility is tested, not assumed.
conflicts=[];room_checks=[]
for m in manifest['markers']:
    if not m['name'].startswith('ROOM_ANCHOR_'):continue
    floor=m['floor'];deck=contour(floor);inner=contour(floor,'glass')
    r=rect(m['roomBoundsLocal']);bal=rect(m['balconyBoundsLocal'])
    cut=[list(p) for p in r if not inside(p,inner)]
    baloutside=[list(p) for p in bal if not inside(p,deck)]
    balinside=[list(p) for p in bal if inside(p,inner)]
    reasons=[]
    if cut:reasons.append('Original room corners outside B glazing envelope')
    if baloutside:reasons.append('Original balcony corners outside B slab')
    if balinside:reasons.append('Original balcony overlaps B enclosed space')
    # Original room outward face does not coincide with B glazing even when contained.
    gap=min(edge_distance(p,inner) for p in r)
    if gap>.4:reasons.append('Original room needs revised window/balcony connection')
    item=dict(roomId=m['roomId'],floor=floor,slot=m['slot'],reasons=reasons,roomCornersOutside=cut,
              balconyCornersOutside=baloutside,balconyCornersInsideGlazing=balinside,nearestOldCornerToGlazing=gap,
              proposal='Repartition to curved glazing with dedicated terrace; keep old markers only for reference')
    room_checks.append(item)
    if reasons:conflicts.append(item)

# Floor 15 proposed radial zoning: core unchanged, continuous 2.5 m minimum ring
# corridor, each of 8 sectors has a corridor door and a glazing/terrace opening.
# Area differences to v2 are made explicit; this is NOT a silent replacement catalog.
def corridor(theta):
    c,s=math.cos(theta),math.sin(theta);r=min(11.5/max(abs(c),1e-8),12/max(abs(s),1e-8))
    return (20+r*c,10+r*s)
room_plan=[]
targets={1:(84,24),2:(90,30),3:(60,12),4:(60,12),5:(60,12),6:(66,18),7:(66,18),8:(90,30)}
for slot,deg in [(1,180),(2,135),(3,90),(4,45),(5,0),(6,-45),(7,-90),(8,-135)]:
    angles=[math.radians(deg-22.5+45*i/32) for i in range(33)]
    outer=[boundary(15,t,'glass') for t in angles];inner=[corridor(t) for t in angles]
    terrace=[boundary(15,t) for t in angles]
    poly=inner+list(reversed(outer));balpoly=outer+list(reversed(terrace))
    door=corridor(math.radians(deg));window=boundary(15,math.radians(deg),'glass')
    olddoor=next(m['sourcePosition'][:2] for m in manifest['markers'] if m['name']==f'DOOR_TS-15{slot:02}')
    room_plan.append(dict(roomId=f'TS-15{slot:02}',slot=slot,polygon=poly,balconyPolygon=balpoly,
        entryDoor=door,balconyDoor=window,windowArc=outer,proposedGrossInsideArea=area(poly),proposedGrossBalconyArea=area(balpoly),
        originalInsideTarget=targets[slot][0],originalBalconyTarget=targets[slot][1],originalDoor=olddoor,
        doorShiftMetres=(Vector(door)-Vector(olddoor)).length))

def write_plan_svg():
    # Same metre coordinates as the Blender model; no independent illustration.
    W,H=1320,1070;scale=12;ox=470;oy=510
    def xy(p):return (ox+(p[0]-20)*scale,oy-(p[1]-10)*scale)
    def points(poly):return ' '.join(f'{xy(p)[0]:.1f},{xy(p)[1]:.1f}' for p in poly)
    colors=['#ead1ba','#dbd6b8','#c5d9c4','#b9d7d7','#c7d2e5','#d6c9de','#e8c9c4','#e8d9aa']
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
      '<rect width="100%" height="100%" fill="#f7f5ee"/>',
      '<g font-family="Arial,sans-serif" fill="#253c42">',
      '<text x="40" y="44" font-size="25">LOGAN B / TẦNG 15 · CAO ĐỘ +50,40 M</text>',
      '<text x="40" y="75" font-size="16">Sơ đồ phân khu đề xuất từ cùng đường bao 3D — CHƯA CHỐT DIỆN TÍCH / KẾT CẤU</text>']
    svg.append(f'<polygon points="{points(rect([-11.5,-12,11.5,12]))}" fill="#eee8d9" stroke="#444"/>')
    for room,color in zip(room_plan,colors):
        svg.append(f'<polygon points="{points(room["balconyPolygon"])}" fill="#e1e9dd" stroke="#506959" stroke-width="1"/>')
        svg.append(f'<polygon points="{points(room["polygon"])}" fill="{color}" stroke="#354f55" stroke-width="2"/>')
        svg.append(f'<polyline points="{points(room["windowArc"])}" fill="none" stroke="#138795" stroke-width="4"/>')
        for p in [room['entryDoor'],room['balconyDoor']]:
            x,y=xy(p);svg.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#f7f5ee" stroke="#175f72" stroke-width="3"/>')
        theta=math.radians({1:180,2:135,3:90,4:45,5:0,6:-45,7:-90,8:-135}[room['slot']])
        p=boundary(15,theta,'glass');q=corridor(theta);x,y=xy(((p[0]+q[0])/2,(p[1]+q[1])/2))
        svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="16">{room["roomId"]}</text>')
    for m in manifest['markers']:
        if m['name'].startswith('ROOM_ANCHOR_TS-15'):
            svg.append(f'<polygon points="{points(rect(m["roomBoundsLocal"]))}" fill="none" stroke="#b35344" stroke-width="1.4" stroke-dasharray="5 4"/>')
    svg.append(f'<polygon points="{points(rect([-6,-7,6,7]))}" fill="#afbec1" stroke="#354f55" stroke-width="2"/>')
    x,y=xy((20,10));svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="20">LÕI</text>')
    svg += ['<text x="880" y="140" font-size="22">BẮC ↑</text>',
      '<text x="880" y="180" font-size="16">Đường xanh: cửa kính / view</text>',
      '<text x="880" y="208" font-size="16">Chấm tròn: cửa đề xuất</text>',
      '<text x="880" y="236" font-size="16">Nét đứt đỏ: mặt bằng v2 cũ</text>',
      '<text x="880" y="264" font-size="16">Xanh nhạt: ban công riêng</text>',
      '<text x="880" y="315" font-size="16">Phòng | trong / ban công (m²)</text>']
    for i,r in enumerate(room_plan):
        svg.append(f'<text x="880" y="{345+i*31}" font-size="16">{r["roomId"]}: {r["proposedGrossInsideArea"]:.1f} / {r["proposedGrossBalconyArea"]:.1f}</text>')
    svg += ['<text x="880" y="645" font-size="16">Diện tích gross khác bản v2.</text>',
      '<text x="880" y="673" font-size="16">Không dùng số này cho booking.</text>',
      '<text x="40" y="940" font-size="17">8 phòng tiếp cận hành lang vòng; mỗi phòng chạm lớp kính và một phần ban công riêng.</text>',
      '<text x="40" y="969" font-size="17">Cửa / diện tích B là đề xuất. Toàn bộ mốc v2 vẫn giữ nguyên trong Blender để đối chiếu.</text>',
      '<text x="40" y="998" font-size="17">Chưa chia nội thất, chưa kiểm tra thoát hiểm hay tính khả thi kết cấu.</text>',
      '<path d="M880 810 h120 M880 804 v12 M1000 804 v12" fill="none" stroke="#253c42" stroke-width="2"/>',
      '<text x="880" y="842" font-size="16">0 ————— 10 m</text></g></svg>']
    (OUT/'04-floor-15.svg').write_text('\n'.join(svg),encoding='utf-8')

write_plan_svg()
bpy.context.view_layer.update()
assert len(anchors)==1154
assert all((Vector(v)-scene.objects[n].matrix_world.translation).length<1e-8 for n,v in anchors.items())
assert all(abs(v[i][j]-scene.objects[n].matrix_world[i][j])<1e-8 for n,v in levels.items() for i in range(4) for j in range(4))
assert all(abs(v[i][j]-scene.objects[n].matrix_world[i][j])<1e-8 for n,v in arrival.items() for i in range(4) for j in range(4))
for name in added:scene.objects[name]['designStatus']='OPTION B - UNAPPROVED CONCEPT'
report=dict(status='OPTION B - geometry review, not final architecture',sourceSha256=source_hash,
    anchorsUnchanged=1154,levelTransformsUnchanged=len(levels),arrivalTransformsUnchanged=len(arrival),
    islandOldBounds=[[-122.76664,-87.50364],[122.76664,93.87000]],
    islandNewBounds=[[min(p[0] for p in coast),min(p[1] for p in coast)],[max(p[0] for p in coast),max(p[1] for p in coast)]],
    islandNewCoastAreaM2=area(coast),islandCoastControlPoints=coast_controls,islandCoastPolygon=coast,
    floor15GlazingPolygon=contour(15,'glass'),floor15SlabPolygon=contour(15),
    sourceIslandProjectedFaces=[[[float(v) for v in (scene.objects['ISLAND'].matrix_world @ scene.objects['ISLAND'].data.vertices[i].co)[:2]] for i in p.vertices] for p in scene.objects['ISLAND'].data.polygons],
    cameras=[dict(name=name,position=list(bpy.data.objects[name].location),rotation=list(bpy.data.objects[name].rotation_euler),
        lens=bpy.data.objects[name].data.lens,orthoScale=bpy.data.objects[name].data.ortho_scale)
        for name in ['A_CAMERA_01_EAST_ELEVATION','A_CAMERA_02_APPROACH','A_CAMERA_03_ENTRY']],
    offshoreLandmarks=[dict(id=n,point=p,insideProposedLand=inside(p,coast)) for n,p in [('DINING',(-118,-76)),('PAVILION',(-166,0))]],
    roomCompatibility=room_checks,conflictingRoomCount=len(conflicts),floor15Proposal=room_plan,
    hiddenAObjects=hidden,newObjects=added,vegetationGroundingAdjustments=vegetation_adjustments,
    limitations=['No full collision/structural/fire safety certification','Floor15 sectors are gross area concepts, do not match original v2 suite areas',
      'Old room anchors retained only as references; affected views and room tours are not valid for B',
      'Island extension changes site layout; northern paths are reserve zoning, not finished landscape',
      'No app/booking/manifest updates, no interior or animation'])
(OUT/'geometry-review.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
assert not any(p['insideProposedLand'] for p in report['offshoreLandmarks'])
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
scene.camera=bpy.data.objects['A_CAMERA_01_EAST_ELEVATION']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'logan-option-b.blend'))
print('B_SAVED; anchor checks pass; conflicts:',len(conflicts),flush=True)
views=[('01-facade','A_CAMERA_01_EAST_ELEVATION'),('02-approach','A_CAMERA_02_APPROACH'),('03-entry','A_CAMERA_03_ENTRY')]
requested=next((a.split('=',1)[1].split(',') for a in sys.argv if a.startswith('--views=')),None)
for name,cam in views:
    if requested and name not in requested:continue
    scene.camera=bpy.data.objects[cam];scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True);print('B_RENDERED',name,flush=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
