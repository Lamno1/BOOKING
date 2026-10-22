"""Reproducible web delivery crops; no AI repainting/upscaling of concept art."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]/'src/main/resources/web/review'
source=root/'studio-concept-v2.png'
out=root/'media'
out.mkdir(exist_ok=True)
im=Image.open(source).convert('RGB')
w,h=im.size
manifest={'sourceBytes':source.stat().st_size,'sourceSize':[w,h],'files':[]}
for i in range(4):
    x=(i%2)*w//2; y=(i//2)*h//2
    tile=im.crop((x,y,x+w//2,y+h//2))
    for name,width,quality in [('thumb',160,65),('small',400,78),('preview',724,76),('large',724,88)]:
        variant=tile.resize((width,round(width*tile.height/tile.width)),Image.Resampling.LANCZOS)
        path=out/f'studio-{i}-{name}.webp'
        variant.save(path,'WEBP',quality=quality,method=6)
        manifest['files'].append({'name':path.name,'width':variant.width,'height':variant.height,'bytes':path.stat().st_size})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
