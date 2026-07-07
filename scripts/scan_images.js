const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const OUTPUT = path.join(__dirname, '..', 'data', 'timeline.json');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];

// 读取现有数据，保留 title/content
let existing = {};
try {
  const old = JSON.parse(fs.readFileSync(OUTPUT, 'utf-8'));
  old.entries.forEach(e => { existing[e.date] = e; });
  var meta = old.meta;
} catch {
  var meta = { title: '我们的故事', subtitle: '', cover: 'assets/images/cover.svg', names: ['小明', '小红'] };
}

// 扫描文件夹
const folders = fs.readdirSync(IMAGES_DIR).filter(f => {
  const full = path.join(IMAGES_DIR, f);
  return fs.statSync(full).isDirectory();
});

const entries = [];

for (const folder of folders) {
  // 从文件夹名提取日期
  const dateMatch = folder.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : null;

  const folderPath = path.join(IMAGES_DIR, folder);
  const files = fs.readdirSync(folderPath).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return [...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext);
  }).sort();

  if (files.length === 0) continue;

  const media = files.map(f => {
    const ext = path.extname(f).toLowerCase();
    const isVideo = VIDEO_EXTS.includes(ext);
    const item = {
      type: isVideo ? 'video' : 'image',
      src: `assets/images/${folder}/${f}`,
      alt: ''
    };
    if (!isVideo) {
      const thumbPath = path.join(folderPath, 'thumbs', f);
      if (fs.existsSync(thumbPath)) {
        item.thumb = `assets/images/${folder}/thumbs/${f}`;
      }
    }
    return item;
  });

  const key = date || folder;
  const old = existing[key];

  entries.push({
    date: date || '2023-01-01',
    title: old ? old.title : folder,
    content: old ? old.content : '',
    media
  });
}

// 按日期升序
entries.sort((a, b) => a.date.localeCompare(b.date));

// 更新 subtitle
const dates = entries.map(e => e.date).filter(d => d !== '2023-01-01');
if (dates.length > 0) {
  meta.subtitle = `${dates[0].slice(0, 4)}.${dates[0].slice(5, 7)} - ${dates[dates.length - 1].slice(0, 4)}.${dates[dates.length - 1].slice(5, 7)}`;
}

// 保留原 stats，更新 photos 数量
let imgTotal = 0;
entries.forEach(e => e.media.forEach(m => { if (m.type === 'image') imgTotal++; }));
const stats = {
  days: 0,
  cities: 3,
  photos: imgTotal,
  custom: [
    { label: '电影', value: 42 },
    { label: '旅行', value: 8 }
  ]
};

const output = { meta, entries, stats };
fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');

// 统计
let imgCount = 0, vidCount = 0;
entries.forEach(e => e.media.forEach(m => m.type === 'image' ? imgCount++ : vidCount++));
console.log(`完成: ${entries.length} 个条目, ${imgCount} 张图片, ${vidCount} 个视频`);
