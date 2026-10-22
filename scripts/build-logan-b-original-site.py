"""Separate tower choice from island choice. Read B, restore original island only."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/logan-b-review-02';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets/logan-option-b/logan-option-b.blend'
digest=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
s=bpy.context.scene
markers={o.name:[list(r) for r in o.matrix_world] for o in s.objects if o.get('isSpatialAnchor') or o.name.startswith('LEVEL_')}
retained={o.name:[list(r) for r in o.matrix_world] for o in s.objects if any(c.name in ['A02_PODIUM_ENTRY_PROPOSAL','A03_ARRIVAL_ROUTE_PROPOSAL','B01_ORGANIC_TOWER_PROPOSAL'] for c in o.users_collection)}
oldsite=bpy.data.collections.new('S0_ORIGINAL_ISLAND_ACTIVE');s.collection.children.link(oldsite)
island=s.objects['ISLAND']
for c in list(island.users_collection):c.objects.unlink(island)
oldsite.objects.link(island)
bpy.data.collections['B02_ENLARGED_ISLAND_PROPOSAL'].hide_render=True
bpy.data.collections['B02_ENLARGED_ISLAND_PROPOSAL'].hide_viewport=True
report=json.loads((ROOT/'assets/logan-option-b/geometry-review.json').read_text())
for adjust in report['vegetationGroundingAdjustments']:
    for name in adjust['objects']:
        o=s.objects[name];m=o.matrix_world.copy();m.translation.z-=adjust['deltaZ'];o.matrix_world=m
bpy.context.view_layer.update()
def unchanged(d):return all(abs(m[i][j]-s.objects[n].matrix_world[i][j])<1e-7 for n,m in d.items() for i in range(4) for j in range(4))
assert unchanged(markers) and unchanged(retained)
proof=dict(sourceSha256=digest,sourceUnchanged=True,spatialAnchors=1154,levelDatums=18,
    towerAndArrivalTransformsUnchanged=True,activeIsland='ISLAND / original geometry, original material, no rescale',
    expandedIsland='B02 collection hidden; retained only for reference',
    approval=dict(tower='organic direction only',islandExpansion=False,roomPlan=False,booking=False))
(OUT/'site-verification.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')
s.camera=s.objects['A_CAMERA_01_EAST_ELEVATION']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'logan-b-original-island.blend'))
for name,cam in [('01-facade','A_CAMERA_01_EAST_ELEVATION'),('02-approach','A_CAMERA_02_APPROACH'),('03-entry','A_CAMERA_03_ENTRY')]:
    s.camera=s.objects[cam];s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    print('S0_RENDER_COMPLETE',name,flush=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==digest
