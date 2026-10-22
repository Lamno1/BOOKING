"""Extract timestamped reference frames for design analysis; never publish as site assets."""
from pathlib import Path
import cv2

root = Path(__file__).resolve().parents[1]
source = root / 'data/video intro/antigravity.mp4'
output = root / 'target/reference-review'
output.mkdir(parents=True, exist_ok=True)
video = cv2.VideoCapture(str(source))
fps = video.get(cv2.CAP_PROP_FPS)
frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
duration = frames / fps
print(f'{source.name}: {int(video.get(3))}x{int(video.get(4))}, {fps:.2f} fps, {duration:.2f} sec')
for index in range(12):
    at = (duration - .2) * index / 11
    video.set(cv2.CAP_PROP_POS_MSEC, at * 1000)
    ok, frame = video.read()
    if ok:
        path = output / f'antigravity-{index:02d}-{at:.1f}s.jpg'
        cv2.imwrite(str(path), frame)
        print(path)
video.release()
