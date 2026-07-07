import os
import sys
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent.parent / 'assets' / 'images'
THUMB_SIZE = 200
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
VIDEO_EXTS = {'.mp4', '.webm', '.mov'}

count = 0
skipped = 0

for folder in sorted(BASE.iterdir()):
    if not folder.is_dir():
        continue
    thumb_dir = folder / 'thumbs'
    thumb_dir.mkdir(exist_ok=True)

    for f in sorted(folder.iterdir()):
        ext = f.suffix.lower()
        if ext not in IMAGE_EXTS:
            continue

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
                print(f'  已生成 {count} 张...')
        except Exception as e:
            print(f'  跳过 {f.name}: {e}')

print(f'完成: 新增 {count} 张缩略图, 跳过 {skipped} 张已存在')
