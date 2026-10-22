"""Run with Blender --background --factory-startup --python this.py -- GLB manifest outdir.

Import and prove the transfer before any art edits. Generates packed .blend,
numeric audit and same-camera inspection render, not a cinematic art pass.
"""
import bpy
import json
import math
import sys
import hashlib
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix


def main():
    glb, manifest_path, destination = map(Path, sys.argv[sys.argv.index('--') + 1:])
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    destination.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb.resolve()), import_pack_images=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    bpy.context.view_layer.update()
    tolerance = .001  # one millimetre; Float32 coordinates in a metre-scale scene
    failures, checks = [], []

    def compare(name, expected, actual, kind):
        error = max(abs(a - b) for a, b in zip(expected, actual))
        entry = dict(name=name, kind=kind, errorMetres=error, passed=error <= tolerance)
        checks.append(entry)
        if not entry['passed']:
            failures.append({**entry, 'expected': expected, 'actual': actual})

    # glTF Y-up -> Blender Z-up: [x,y,z] -> [x,-z,y]. No custom import scaling.
    def gltf_to_blender(p):
        return [p[0], -p[2], p[1]]

    for item in manifest['meshes']:
        obj = scene.objects.get(item['name'])
        if obj is None or obj.type != 'MESH':
            failures.append(dict(name=item['name'], error='Missing imported mesh'))
            continue
        points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        low = [min(p[i] for p in points) for i in range(3)]
        high = [max(p[i] for p in points) for i in range(3)]
        a, b = item['boundsGltf']
        compare(obj.name, [a[0], -b[2], a[1]], low, 'boundsMin')
        compare(obj.name, [b[0], -a[2], b[1]], high, 'boundsMax')
    for item in manifest['markers']:
        obj = scene.objects.get(item['name'])
        if obj is None:
            failures.append(dict(name=item['name'], error='Missing spatial anchor'))
            continue
        compare(obj.name, item['sourcePosition'], list(obj.matrix_world.translation), 'anchorPosition')
        if obj.get('roomId') != item.get('roomId'):
            failures.append(dict(name=obj.name, error='roomId metadata mismatch'))
        obj.empty_display_size = .3
        obj.hide_render = True

    level_names = [o.name for o in scene.objects if o.name.startswith('LEVEL_') and o.name[6:].isdigit()]
    room_anchors = [o for o in scene.objects if o.name.startswith('ROOM_ANCHOR_TS-')]
    if len(level_names) != 18 or len(room_anchors) != 112:
        failures.append(dict(error='Incorrect floors/rooms', levels=len(level_names), rooms=len(room_anchors)))
    camera = scene.objects.get('TRANSFER_CAMERA')
    if camera is None:
        raise RuntimeError('Export did not contain the reference camera')
    compare(camera.name, gltf_to_blender(manifest['camera']['positionGltf']), list(camera.matrix_world.translation), 'cameraPosition')
    q = manifest['camera']['quaternionGltf']
    expected_direction = Matrix.Rotation(math.pi / 2, 4, 'X').to_3x3() @ (Quaternion((q[3], q[0], q[1], q[2])) @ Vector((0, 0, -1)))
    actual_direction = camera.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    camera_angle_error = expected_direction.angle(actual_direction)
    if camera_angle_error > 1e-4:
        failures.append(dict(error='Camera direction mismatch', radians=camera_angle_error))

    # Explicit vertical sensor fit matches Three.js vertical FOV at any aspect.
    camera.data.sensor_fit = 'VERTICAL'
    camera.data.sensor_height = 24
    camera.data.lens = 24 / (2 * math.tan(math.radians(manifest['camera']['fov']) / 2))
    scene.camera = camera
    scene.render.resolution_y = 900
    scene.render.resolution_x = round(900 * manifest['camera']['aspect'])
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1

    # Inspection lighting only: no model/detail additions. Web HDR / AO / fog are
    # deliberately not claimed to match; silhouette, placement and scale should.
    world = bpy.data.worlds.new('TRANSFER_INSPECTION_WORLD')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .67, .73, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .6
    scene.world = world
    sun_data = bpy.data.lights.new('TRANSFER_INSPECTION_SUN', 'SUN')
    sun_data.energy = 3.2
    sun_data.angle = math.radians(3)
    sun = bpy.data.objects.new(sun_data.name, sun_data)
    scene.collection.objects.link(sun)
    sun.location = (-150, -100, 135)
    sun.rotation_euler = (Vector((0, 0, 0)) - sun.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 5
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str((destination / 'blender-transfer-reference.png').resolve())
    # Ready-to-open Blender file uses the transferred camera, with anchors in
    # their own collection for easy inspection without covering the viewport.
    anchors = bpy.data.collections.new('SPATIAL_ANCHORS_INSPECT_ONLY')
    scene.collection.children.link(anchors)
    for obj in list(scene.objects):
        if obj.get('isSpatialAnchor'):
            for collection in list(obj.users_collection):
                collection.objects.unlink(obj)
            anchors.objects.link(obj)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'
                area.spaces.active.clip_end = 10000
    report = dict(passed=not failures, toleranceMetres=tolerance,
        glbSha256=hashlib.sha256(glb.read_bytes()).hexdigest(), blenderVersion=bpy.app.version_string,
        meshCount=len(manifest['meshes']), anchorCount=len(manifest['markers']),
        levelCount=len(level_names), roomCount=len(room_anchors),
        maxCoordinateErrorMetres=max(c['errorMetres'] for c in checks),
        cameraDirectionErrorRadians=camera_angle_error,
        materialLimitations=manifest['materialChanges'], failures=failures, checks=checks)
    (destination / 'transfer-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str((destination / 'logan-tidal-source.blend').resolve()))
    print('TRANSFER_AUDIT', json.dumps({k:v for k,v in report.items() if k != 'checks'}), flush=True)
    if failures:
        raise RuntimeError(f'{len(failures)} transfer checks failed; see transfer-verification.json')
    bpy.ops.render.render(write_still=True)
    print('TRANSFER_RENDER_COMPLETE', flush=True)


if __name__ == '__main__':
    main()
