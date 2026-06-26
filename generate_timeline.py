import os
import json
import re

images_dir = 'assets/images'

# 标题映射
title_map = {
    'wxc': '万象城约会',
    'xmjd': '小米之家',
    'birthday': '生日快乐',
    'lzp': '和刘振鹏',
    'ckr': '和陈科润',
    'hlg': '欢乐谷游玩',
    'kdc': '可大厨',
    'qrj': '情人节',
    'yly': '游乐场',
    'party': '聚会',
    'gq': '国庆假期',
    'pj': '评价',
    'gn': '过年',
    'lj': '旅行',
    'ls': '旅顺之旅',
    'cy': '出游',
    'qc': '青春记忆',
    'sk': '烧烤聚会',
    'zp': '照片时光',
    'kfz': '咖啡馆',
    'kdy': '看电影',
    'gsc': '故事城',
    'jzg': '金州湾',
    'sty': '山田园',
    'qy': '秋游',
    'dyx': '电影院',
    'cm': '草莓采摘',
    'qk': '秋裤',
    'xh': '鲜花',
    'cx': '出行记',
    'hn': '河南之旅',
    'qh': '清河漫步',
    'my': '美容时光',
    'mlw': '美丽屋',
    'htx': '海棠溪',
    'tg': '泰国游',
    'yl': '游乐时光',
    'fx': '飞翔体验',
    'hjls': '好聚好散',
}

entries = []

for folder in sorted(os.listdir(images_dir)):
    folder_path = os.path.join(images_dir, folder)
    if not os.path.isdir(folder_path):
        continue

    if folder in ['before', '.gitkeep']:
        continue

    match = re.search(r'(\d{4}-\d{2}-\d{2})', folder)
    if not match:
        continue

    date_str = match.group(1)

    files = []
    for f in os.listdir(folder_path):
        if f.startswith('.'):
            continue
        file_path = os.path.join(folder_path, f)
        if os.path.isfile(file_path):
            files.append(f)

    image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    video_exts = ['.mp4', '.mov', '.avi', '.webm']

    media = []
    for f in sorted(files):
        ext = os.path.splitext(f)[1].lower()
        rel_path = 'assets/images/' + folder + '/' + f

        if ext in image_exts:
            media.append({'type': 'image', 'src': rel_path, 'alt': ''})
        elif ext in video_exts:
            media.append({'type': 'video', 'src': rel_path, 'poster': ''})

    if not media:
        continue

    prefix = folder.split(date_str)[0].rstrip('_-')
    title = title_map.get(prefix, prefix)

    entries.append({
        'date': date_str,
        'title': title,
        'content': '',
        'media': media
    })

entries.sort(key=lambda x: x['date'])

# 读取现有的 timeline.json
with open('data/timeline.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 更新 entries
data['entries'] = entries

# 写入文件
with open('data/timeline.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Generated {len(entries)} entries')
for e in entries:
    print(f"  {e['date']} - {e['title']} ({len(e['media'])} files)")
