"""Reproducible web delivery crops of the AI concept sheets; no AI repainting or upscaling.

Each source is a 2x2 sheet; every quadrant becomes thumb/small/preview/large WebP files named <set>-<i>-<size>.webp.
The app labels all of them as AI illustrations, never as photos of a real room.
"""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]/'src/main/resources/web/review'
out=root/'media'
out.mkdir(exist_ok=True)
SETS={'studio':'studio-concept-v2.png','quad':'inn-quad-concept-v2.png'}
for key,file in SETS.items():
    source=root/file
    im=Image.open(source).convert('RGB')
    w,h=im.size
    manifest={'source':file,'sourceBytes':source.stat().st_size,'sourceSize':[w,h],'aiGenerated':True,'files':[]}
    for i in range(4):
        x=(i%2)*w//2; y=(i//2)*h//2
        tile=im.crop((x,y,x+w//2,y+h//2))
        for name,width,quality in [('thumb',160,65),('small',400,78),('preview',724,76),('large',724,88)]:
            variant=tile.resize((width,round(width*tile.height/tile.width)),Image.Resampling.LANCZOS)
            path=out/f'{key}-{i}-{name}.webp'
            variant.save(path,'WEBP',quality=quality,method=6)
            manifest['files'].append({'name':path.name,'width':variant.width,'height':variant.height,'bytes':path.stat().st_size})
    (out/('manifest.json' if key=='studio' else f'{key}-manifest.json')).write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(key,len(manifest['files']),'files')
