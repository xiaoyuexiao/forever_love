import os
import sys
import subprocess
from pathlib import Path
from PIL import Image
import imageio_ffmpeg

BASE = Path(__file__).resolve().parent.parent / 'assets' / 'images'
THUMB_SIZE = 200
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
VIDEO_EXTS = {'.mp4', '.webm', '.mov'}
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

count = 0
skipped = 0
vid_count = 0
vid_skipped = 0

for folder in sorted(BASE.iterdir()):
    if not folder.is_dir():
        continue
    thumb_dir = folder / 'thumbs'
    thumb_dir.mkdir(exist_ok=True)

    for f in sorted(folder.iterdir()):
        ext = f.suffix.lower()

        # 图片缩略图
        if ext in IMAGE_EXTS:
            thumb_path = thumb_dir / f.name
            if thumb_path.exists():
                skipped += 1
                continue
            try:
                img = Image.open(f)
                img.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                img.save(thumb_path, 'JPEG', quality=75, optimize=True)
                count += 1
                if count % 50 == 0:
                    print(f'  图片缩略图已生成 {count} 张...')
            except Exception as e:
                print(f'  跳过 {f.name}: {e}')

        # 视频首帧 poster
        if ext in VIDEO_EXTS:
            poster_path = thumb_dir / (f.stem + '.jpg')
            if poster_path.exists():
                vid_skipped += 1
                continue
            try:
                subprocess.run([
                    FFMPEG, '-y', '-i', str(f),
                    '-vframes', '1', '-q:v', '3',
                    '-vf', f'scale={THUMB_SIZE}:-1',
                    str(poster_path)
                ], capture_output=True, check=True)
                vid_count += 1
                print(f'  视频 poster: {f.name}')
            except Exception as e:
                print(f'  跳过视频 {f.name}: {e}')

print(f'完成: 图片缩略图 {count} 张 (跳过 {skipped}), 视频 poster {vid_count} 张 (跳过 {vid_skipped})')
