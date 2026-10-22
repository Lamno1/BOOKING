"""Geometry proposal A, on a separate copy of the transferred model.
No room/interior design, animation, booking or edits to the baseline file.
Blender --background --factory-startup --python this.py
"""
import bpy
import math
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/architecture-transfer/logan-tidal-source.blend'
OUT = ROOT / 'assets/logan-option-a'
OUT.mkdir(parents=True, exist_ok=True)
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
originals = list(scene.objects)
anchor_before = {o.name: list(o.matrix_world.translation) for o in originals if o.get('isSpatialAnchor')}
levels_before = {o.name: [list(row) for row in o.matrix_world] for o in originals if o.name.startswith('LEVEL_')}
archived, added = [], []

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

facade = collection('A01_FACADE_PROPOSAL')
podium = collection('A02_PODIUM_ENTRY_PROPOSAL')
approach = collection('A03_ARRIVAL_ROUTE_PROPOSAL')
presentation = collection('A04_INSPECTION_CAMERAS_SCALE')
archive = collection('ORIGINAL_REPLACED_GEOMETRY__TOGGLE_FOR_REFERENCE')
archive.hide_render = True
archive.hide_viewport = True

def hide_source(o, reason):
    if any(r['name'] == o.name for r in archived):
        return
    archived.append({'name': o.name, 'action': 'retained but hidden in proposal', 'reason': reason})
    for c in list(o.users_collection):
        c.objects.unlink(o)
    archive.objects.link(o)

prefixes = ('GLAZING', 'MULLIONS_', 'BALCONY_', 'FACADE_', 'WINDOW_', 'WEST_MULLION',
            'CHAMPAGNE_', 'RIBBON_', 'PODIUM', 'ROOF_')
for obj in originals:
    if obj.name.startswith(prefixes) or obj.name in ('LEVEL_1', 'LEVEL_2'):
        hide_source(obj, 'Replace disc-like envelope and solid podium; level datums retained')
    elif obj.name == 'PATH_ARRIVAL':
        hide_source(obj, 'Replace arrival route with continuous graded path to east lobby door')
    elif 'CONTACT' in obj.name:
        hide_source(obj, 'Web contact-shadow card is not architectural geometry')

def mat(name, color, rough=.6, metal=0, transmission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = 1.45
    return m

stone = mat('A_Limestone_geometry_study', (.68, .64, .54))
white = mat('A_Precast_light', (.81, .8, .74))
frame = mat('A_Bronze_frames', (.14, .19, .19), .3, .5)
glass = mat('A_Glazing', (.25, .4, .43), .15, .15, .38)
railglass = mat('A_Balcony_glass', (.49, .65, .65), .12, 0, .78)
champagne = mat('A_Champagne_structure', (.47, .35, .19), .34, .65)
recess = mat('A_Recess_shadow', (.18, .24, .24))
pathmat = mat('A_Path_stone', (.55, .56, .51))
scale_mat = mat('A_Human_scale_marker', (.2, .27, .29))

def register(obj, name, c, material=None):
    obj.name = name
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    c.objects.link(obj)
    if material:
        obj.data.materials.append(material)
    obj['designStatus'] = 'OPTION A - UNAPPROVED CONCEPT'
    added.append(name)
    return obj

def box(name, loc, dims, material, c=facade, bevel=0):
    # Direct mesh creation avoids thousands of dependency-graph operator updates.
    x,y,z = [d/2 for d in dims]
    vertices = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    c.objects.link(obj)
    obj.location = loc
    if material: mesh.materials.append(material)
    obj['designStatus'] = 'OPTION A - UNAPPROVED CONCEPT'
    added.append(name)
    if bevel:
        mod = obj.modifiers.new('Edge construction radius', 'BEVEL'); mod.width = bevel; mod.segments = 2
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return obj

def mesh_obj(name, vertices, faces, material, c):
    mesh = bpy.data.meshes.new(name); mesh.from_pydata(vertices, [], faces); mesh.update()
    obj = bpy.data.objects.new(name, mesh); c.objects.link(obj)
    if material: mesh.materials.append(material)
    obj['designStatus'] = 'OPTION A - UNAPPROVED CONCEPT'; added.append(name)
    return obj

def line(name, points, radius, material, c):
    curve = bpy.data.curves.new(name, 'CURVE'); curve.dimensions = '3D'; curve.resolution_u = 1
    spline = curve.splines.new('POLY'); spline.points.add(len(points)-1)
    for p, xyz in zip(spline.points, points): p.co = (*xyz, 1)
    curve.bevel_depth = radius; curve.bevel_resolution = 2
    obj = bpy.data.objects.new(name, curve); c.objects.link(obj); curve.materials.append(material)
    obj['designStatus'] = 'OPTION A - UNAPPROVED CONCEPT'; added.append(name)
    return obj

def round_plate(name, cx, cy, width, depth, radius, bottom, thickness, material, c):
    points=[]
    for x,y,start in [(cx+width/2-radius,cy+depth/2-radius,0),(cx-width/2+radius,cy+depth/2-radius,90),
                      (cx-width/2+radius,cy-depth/2+radius,180),(cx+width/2-radius,cy-depth/2+radius,270)]:
        for i in range(9):
            a=math.radians(start+i*90/8);points.append((x+radius*math.cos(a),y+radius*math.sin(a)))
    n=len(points);verts=[(x,y,z) for z in (bottom,bottom+thickness) for x,y in points]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh_obj(name,verts,faces,material,c)

# Retain original level slabs 03-18 at their exact transforms; introduce legible
# bay depth rather than a continuous outer ring that reads as stacked discs.
for floor in range(3,19):
    z=(floor-1)*3.6
    for face in ['E','W','N','S']:
        ew=face in ['E','W']; length=48 if ew else 44; pitch=length/8
        facade_fixed = (42 if face=='E' else -2) if ew else (34 if face=='N' else -14)
        sign=1 if face in ['E','N'] else -1
        for bay in range(8):
            along=(10 if ew else 20)-length/2+(bay+.5)*pitch
            def fb(label, normal_offset, width, depth, bottom, height, material, bevel=0):
                normal=facade_fixed+sign*normal_offset
                loc=(normal,along,bottom+height/2) if ew else (along,normal,bottom+height/2)
                dims=(depth,width,height) if ew else (width,depth,height)
                return box(f'A_{face}_{floor:02}_{bay:02}_{label}',loc,dims,material,facade,bevel)
            # Solid reveal, separated panes and door-size modules. No interior furnishing.
            fb('SPANDREL',-.42,pitch-.12,.34,z+2.94,.62,stone)
            fb('GLASS',-.5,pitch-.38,.06,z+.35,2.58,glass)
            for offset in [-pitch/2+.12,0,pitch/2-.12]:
                p=along+offset
                pos=(facade_fixed-sign*.44,p,z+1.64) if ew else (p,facade_fixed-sign*.44,z+1.64)
                box(f'A_{face}_{floor:02}_{bay:02}_FRAME_{offset:.2f}',pos,(.12,.08,2.62) if ew else (.08,.12,2.62),frame)
            fb('TRANSOM',-.43,pitch-.24,.12,z+2.85,.07,frame)
            # Paired bays form recessed loggias, leaving vertical stone piers visible.
            fb('BALCONY_SLAB',1.14,pitch-.30,2.45,z+.18,.18,white)
            fb('GUARD',2.28,pitch-.48,.045,z+.42,.96,railglass)
            fb('RAIL',2.28,pitch-.44,.075,z+1.36,.055,frame)
            if bay%2==0:
                for offset in [-pitch/2+.1]:
                    p=along+offset
                    pos=(facade_fixed+sign*.72,p,z+1.75) if ew else (p,facade_fixed+sign*.72,z+1.75)
                    box(f'A_{face}_{floor:02}_{bay:02}_PIER',pos,(2.7,.25,3.45) if ew else (.25,2.7,3.45),stone)

# Two deep, continuous champagne blades integrated with the east arrival front.
# Footings, floor ties, and crown terminations are geometry, not floating strips.
for index, base_y in enumerate([-10,30],1):
    verts=[]; steps=80
    for i in range(steps+1):
        t=i/steps; z=1.15+t*65.15
        x=46.4+6.0*(1-t)**3
        y=base_y + (1 if index==1 else -1)*5.5*math.sin(math.pi*t)
        for dx,dy in [(-.45,-.85),(.45,-.85),(.45,.85),(-.45,.85)]: verts.append((x+dx,y+dy,z))
    faces=[]
    for i in range(steps):
        for j in range(4): faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    faces.extend([(3,2,1,0),tuple(steps*4+j for j in range(4))])
    mesh_obj(f'A_CHAMPAGNE_BLADE_{index}',verts,faces,champagne,facade)
    box(f'A_BLADE_FOOTING_{index}',(52.4,base_y,1.5),(2.6,3.2,.7),stone,podium,.1)
    for floor in range(3,19):
        z=(floor-1)*3.6+.38;t=(z-1.15)/65.15;x=46.4+6*(1-t)**3
        y=base_y+(1 if index==1 else -1)*5.5*math.sin(math.pi*t)
        box(f'A_BLADE_TIE_{index}_{floor}',((42+x)/2,y,z),(x-42,.24,.25),champagne)

round_plate('A_CROWN',20,10,50,54,5,64.82,.42,white,facade)
round_plate('A_CROWN_INSET',20,10,42,46,4,65.24,.12,stone,facade)
for y in [-10,30]: box(f'A_CROWN_CAP_{y}',(44.7,y,65.8),(4.2,1.7,1),champagne)

# Podium rebuilt as a readable envelope with an actual open east portal.
round_plate('A_PODIUM_BASE',20,10,66,66,8,.15,1.0,stone,podium)
round_plate('A_PODIUM_ROOF',20,10,66,66,8,6.35,.55,white,podium)
round_plate('A_PODIUM_ROOF_INSET',20,10,61,61,6,6.9,.12,stone,podium)
# East wall x50, door gap y7..13, double-height shell. Other sides paneled.
for face,fixed,start,end in [('E',50,-14,34),('W',-10,-14,34),('N',40,-4,44),('S',-20,-4,44)]:
    ew=face in ['E','W']
    for i in range(16):
        along=start+(i+.5)*(end-start)/16
        if face=='E' and 7<along<13: continue
        loc=(fixed,along,3.75) if ew else (along,fixed,3.75)
        box(f'A_PODIUM_{face}_PANE_{i}',loc,(.08,2.86,5.2) if ew else (2.86,.08,5.2),glass,podium)
    for i in range(17):
        along=start+i*(end-start)/16
        if face=='E' and 7<along<13:continue
        loc=(fixed,along,3.75) if ew else (along,fixed,3.75)
        box(f'A_PODIUM_{face}_POST_{i}',loc,(.28,.17,5.2) if ew else (.17,.28,5.2),frame,podium)
# Portal visibly open; side leaves parked in pocket, not an image pasted over glass.
for y in [6.6,13.4]:
    box(f'A_PORTAL_JAMB_{y}',(50.2,y,3.4),(.6,.45,4.5),stone,podium,.05)
    box(f'A_OPEN_DOOR_LEAF_{y}',(50.15,y+(-.6 if y<10 else .6),2.78),(.065,1.2,3.25),glass,podium)
box('A_PORTAL_HEADER',(50.2,10,5.46),(.6,7.25,.38),stone,podium,.05)
box('A_PORTAL_TRANSOM',(50,10,5.97),(.06,6.2,.72),glass,podium)
box('A_PORTAL_THRESHOLD',(50.25,10,1.165),(1.5,6,.03),frame,podium)
# The podium base itself is the empty lobby floor; do not add a coplanar slab.
# Canopy, ribbed soffit and columns; no interior decoration/furniture.
round_plate('A_ARRIVAL_CANOPY',55.6,10,16.8,22,2.6,5.4,.5,white,podium)
for y in [1,19]: box(f'A_CANOPY_COLUMN_{y}',(61,y,3.3),(.48,.48,4.3),champagne,podium,.06)
for i in range(25): box(f'A_CANOPY_SOFFIT_RIB_{i}',(55.5,-.2+i*.85,5.31),(14.5,.075,.16),frame,podium)
for y in [-18,38]: box(f'A_PODIUM_RETURN_{y}',(48,y,3.75),(4,4,5.2),stone,podium,.25)

# East arrival: bridge endpoint (120,0,.77) -> forecourt (70,10,1.15)
# -> canopy -> door (50,10,1.15). Same world coordinates as source bridge.
route=[(120,0,.77),(110,1,.867),(100,4,.965),(90,7,1.062),(81,10,1.15),(53,10,1.15),(50,10,1.15)]
walk_route=route[:5]  # Stop at the court edge, not through its coplanar surface.
width=6.0; vertices=[]
for i,p in enumerate(walk_route):
    a=Vector(walk_route[max(0,i-1)]);b=Vector(walk_route[min(len(walk_route)-1,i+1)])
    tangent=b-a
    if i==len(walk_route)-1:tangent=Vector((-1,0,0))
    side=Vector((-tangent.y,tangent.x,0)).normalized()*width/2
    for dz in [-.4,0]:
        for sign in [-1,1]: vertices.append((p[0]+sign*side.x,p[1]+sign*side.y,p[2]+dz))
faces=[]
for i in range(len(walk_route)-1):
    a=i*4;b=(i+1)*4
    faces += [(a+2,b+2,b+3,a+3),(a,b,b+2,a+2),(a+1,a+3,b+3,b+1),(a,a+1,b+1,b)]
faces += [(0,2,3,1),(len(vertices)-4,len(vertices)-3,len(vertices)-1,len(vertices)-2)]
mesh_obj('A_ARRIVAL_GRADED_WALK',vertices,faces,pathmat,approach)
round_plate('A_ENTRY_FORECOURT',67,10,28,28,5,.75,.4,pathmat,approach)
for sign in [-1,1]:
    line(f'A_ROUTE_EDGE_{sign}',[(v[0],v[1],v[2]+.05) for v in vertices[2 if sign==-1 else 3::4]],.08,stone,approach)
for x in range(84,120,4):
    a,b=next((a,b) for a,b in zip(walk_route,walk_route[1:]) if b[0]<=x<=a[0])
    t=(a[0]-x)/(a[0]-b[0]);y=a[1]+t*(b[1]-a[1]);z=a[2]+t*(b[2]-a[2])
    box(f'A_WALK_PAVING_JOINT_{x}',(x,y,z+.012),(.025,5.9,.012),frame,approach)
for y in [-3,23]:
    box(f'A_COURT_SEAT_WALL_{y}',(67,y,1.4),(12,.6,.5),stone,approach,.08)

# Remove source trees physically occupying the new route/forecourt, retain in archive.
bpy.context.view_layer.update()
removed_groves=set()
for o in originals:
    if o.type!='MESH' or not o.name.endswith('_TRUNK'): continue
    p=o.matrix_world.translation
    if 48<p.x<121 and -7<p.y<27: removed_groves.add(o.name[:-6])
for o in originals:
    if any(o.name.startswith(prefix) for prefix in removed_groves): hide_source(o,'Clear actual arrival route and canopy access')
    if o.name.startswith('SHRUB_'):
        p=o.matrix_world.translation
        if 48<p.x<121 and -7<p.y<27:hide_source(o,'Clear forecourt and graded walk')

# Scale references at 1.75 m, explicitly not guests/interior furnishing.
for i,(x,y) in enumerate([(57,8),(72,12)]):
    line(f'A_SCALE_PERSON_{i}_BODY',[(x,y,1.2),(x,y,2.45)],.17,scale_mat,presentation)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.15,location=(x,y,2.75))
    register(bpy.context.object,f'A_SCALE_PERSON_{i}_HEAD',presentation,scale_mat)

def text(name, words, loc, size, c=presentation):
    data=bpy.data.curves.new(name,'FONT');data.body=words;data.size=size;data.align_x='CENTER';data.extrude=.007
    obj=bpy.data.objects.new(name,data);c.objects.link(obj);obj.location=loc
    # Text in YZ plane, facing east (+X).
    obj.rotation_euler=(math.pi/2,0,math.pi/2);data.materials.append(frame);added.append(name)
    return obj
text('A_ENTRY_SIGN','L O G A N',(64.02,10,5.53),.38)

def camera(name, loc, target, lens=48, ortho=None):
    data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);presentation.objects.link(o)
    o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    data.lens=lens;data.clip_end=5000
    if ortho: data.type='ORTHO';data.ortho_scale=ortho
    return o

cameras=[
 ('01-facade',camera('A_CAMERA_01_EAST_ELEVATION',(180,-12,39),(20,10,33),ortho=104)),
 ('02-approach',camera('A_CAMERA_02_APPROACH',(200,-92,101),(51,7,27),lens=37)),
 ('03-entry',camera('A_CAMERA_03_ENTRY',(86,-8,3.8),(50,10,3.1),lens=28)),
]
# Neutral, consistent inspection lighting. No image-generation or compositing.
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.69,.77,.8,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
sun=scene.objects.get('TRANSFER_INSPECTION_SUN');sun.location=(110,-95,140)
sun.rotation_euler=(Vector((20,10,20))-sun.location).to_track_quat('-Z','Y').to_euler()
sun.data.energy=2.5;sun.data.angle=math.radians(5)
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.cycles.max_bounces=6;scene.render.resolution_x=1600;scene.render.resolution_y=1200
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
bpy.context.view_layer.update()
errors=[]
for name,position in anchor_before.items():
    if (Vector(position)-scene.objects[name].matrix_world.translation).length>1e-8:errors.append(name)
for name,matrix in levels_before.items():
    if any(abs(matrix[i][j]-scene.objects[name].matrix_world[i][j])>1e-8 for i in range(4) for j in range(4)):errors.append(name)
assert not errors,errors
assert len(anchor_before)==1154
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
slopes=[abs(b[2]-a[2])/math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(route,route[1:])]
report=dict(status='UNAPPROVED ARCHITECTURAL OPTION A',source=str(SOURCE),sourceSha256=source_hash,
    sourceUnchanged=True,anchorsRetained=len(anchor_before),levelTransformsRetained=len(levels_before),
    anchorErrors=errors,roomPlanStatus='Concept datums retained, NOT locked architecture',
    arrivalRoute=route,walkWidthMetres=width,maxLongitudinalSlope=max(slopes),
    doorNominalOpeningMetres=6.0,doorClearWidthBetweenPostsMetres=5.83,doorThresholdElevation=1.15,
    cameras=[dict(image=name+'.png',position=list(cam.location),rotationEuler=list(cam.rotation_euler),
                  projection=cam.data.type,lensMm=cam.data.lens,orthoScale=cam.data.ortho_scale) for name,cam in cameras],
    renderSettings=dict(engine='CYCLES',resolution=[1600,1200],samples=32,denoise=True),
    routeScope='Geometric route proposal only, not code/accessibility certification',
    archivedOriginals=archived,newObjects=added,
    keptOriginals=[o.name for o in originals if not any(a['name']==o.name for a in archived)],
    changes=['Recessed glazing bays and segmented balconies replace continuous disc bands',
      'Two east champagne blades have podium footings, floor ties and crown caps',
      'Podium envelope rebuilt with a six-metre east opening and empty lobby shell',
      'Arrival walk joins existing east bridge to forecourt, canopy and portal'],
    unresolved=['No structural or fire-safety design', 'Room-plan/facade fit not approved',
      'Roof landscaping and site terrain remain source concept', 'No interiors or animation',
      'Amenity routes outside arrival zone not redesigned'])
(OUT/'geometry-review.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
scene.camera=cameras[0][1]
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'logan-option-a.blend'))
print('GEOMETRY_OPTION_SAVED',len(added),'new objects;',len(archived),'archived;',len(anchor_before),'anchors unchanged',flush=True)
for name,cam in cameras:
    requested_views=next((arg.split('=',1)[1].split(',') for arg in sys.argv if arg.startswith('--views=')),None)
    if requested_views and name not in requested_views:continue
    scene.camera=cam;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    print('REVIEW_RENDER_COMPLETE',name,flush=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
