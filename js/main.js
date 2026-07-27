// ========== 静态资源域名 ==========
const ASSET_BASE = 'http://img.leexiaocll.xyz/';

function assetUrl(path) {
  if (!path || path.startsWith('http')) return path;
  return ASSET_BASE + path;
}

// ========== 数据加载 ==========
async function loadData() {
  const response = await fetch('data/timeline.json');
  return response.json();
}

// ========== 封面渲染 ==========
function renderCover(meta, entries) {
  const cover = document.getElementById('cover');

  // 先设置卡片内容，让卡片有正确的尺寸
  document.querySelector('.cover-title').textContent = meta.title;
  document.querySelector('.cover-subtitle').textContent = meta.subtitle;
  document.querySelector('.cover-names').textContent = meta.names.join(' & ');

  // 词云数据：优先使用配置，否则从 content 提取
  let words;
  if (meta.wordcloud && meta.wordcloud.length > 0) {
    words = meta.wordcloud.map(w => [w.text, w.weight]);
  } else {
    const text = entries.map(e => e.content).join('');
    const segs = text.match(/[一-龥]{2,4}/g) || [];
    const stopWords = new Set(['我们','一个','一起','但是','这个','时候','觉得','还是','就是','没有','已经','什么','他们','可以','不是','因为','所以','今天','一些','到了','很多','你们','我的','你的','他的','她的','看到','到了','然后','之后','以后','开始','出来','起来','回来','下去','上来','这是','那是','那些','这些','自己','大家','比较','可能','应该','知道','觉得','那么','这样','那样','怎么','为什么','什么样','喜欢','照片','拍了','分享']);
    const freq = {};
    segs.forEach(w => {
      if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
    words = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 80);
  }

  // 绘制词云 canvas
  const canvas = document.createElement('canvas');
  const W = cover.offsetWidth || window.innerWidth;
  const H = cover.offsetHeight || window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, W, H);

  const colors = ['#8B6914', '#C4A882', '#FFB6C1', '#FF69B4', '#D4A574', '#B8860B', '#CD853F', '#DAA520'];
  const maxCount = words[0]?.[1] || 1;
  const placed = [];

  // 获取卡片区域作为碰撞禁区（带一点间距）
  const overlay = cover.querySelector('.cover-overlay');
  const coverRect = cover.getBoundingClientRect();
  const cardRect = overlay.getBoundingClientRect();
  const margin = 24;
  const card = {
    x: cardRect.left - coverRect.left - margin,
    y: cardRect.top - coverRect.top - margin,
    w: cardRect.width + margin * 2,
    h: cardRect.height + margin * 2
  };
  placed.push(card);

  function collides(x, y, w, h) {
    for (const r of placed) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
    }
    return false;
  }

  // 内边距，PC端词云集中在中心
  const isPC = W > 768;
  const padX = isPC ? W * 0.15 : 0;
  const padY = isPC ? H * 0.15 : 0;

  // 按权重排序，高权重优先放置
  words.sort((a, b) => b[1] - a[1]);

  words.forEach(([word, count], i) => {
    const ratio = 0.3 + (count / maxCount) * 0.7;
    const fontSize = Math.round(12 + ratio * 24);
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    const metrics = ctx.measureText(word);
    const w = metrics.width + 6;
    const h = fontSize + 6;

    let placed_ok = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = padX + Math.random() * (W - 2 * padX - w);
      const y = padY + Math.random() * (H - 2 * padY - h);
      if (!collides(x, y, w, h)) {
        const rotate = (Math.random() - 0.5) * 0.3;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(rotate);
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.5 + ratio * 0.5;
        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(word, 0, 0);
        ctx.restore();
        placed.push({ x, y, w, h });
        placed_ok = true;
        break;
      }
    }
  });

  cover.style.backgroundImage = `url(${canvas.toDataURL()})`;
}

// ========== 时间线渲染 ==========
function renderTimeline(entries) {
  const timeline = document.getElementById('timeline');

  entries.forEach((entry, index) => {
    const side = index % 2 === 0 ? 'left' : 'right';
    const entryEl = document.createElement('div');
    entryEl.className = `entry ${side}`;

    let mediaHTML = '';
    if (entry.media && entry.media.length > 0) {
      mediaHTML = '<div class="media-grid">';
      mediaHTML += entry.media.map(m => {
        if (m.type === 'video') {
          return `<div class="media-item">
            <video poster="${assetUrl(m.poster) || ''}" preload="metadata">
              <source src="${assetUrl(m.src)}" type="video/mp4">
            </video>
            <span class="play-icon">&#9654;</span>
          </div>`;
        }
        const thumbUrl = assetUrl(m.thumb || m.src);
        const fullUrl = assetUrl(m.src);
        return `<div class="media-item">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${thumbUrl}" data-full="${fullUrl}" alt="${m.alt || ''}" decoding="async" class="clickable-img">
        </div>`;
      }).join('');
      mediaHTML += '</div>';
    }

    // 节点显示第一张图片
    const firstImage = entry.media && entry.media.find(m => m.type === 'image');
    const nodeHTML = firstImage
      ? `<div class="entry-node"><img src="${assetUrl(firstImage.thumb || firstImage.src)}" alt="" loading="lazy" decoding="async" class="node-thumb"></div>`
      : `<div class="entry-node"></div>`;

    entryEl.innerHTML = `
      ${nodeHTML}
      <div class="entry-connector"></div>
      <div class="entry-card">
        <span class="entry-date">${entry.date}</span>
        <h3 class="entry-title">${entry.title}</h3>
        ${mediaHTML}
        <p class="entry-content">${entry.content}</p>
      </div>
    `;

    timeline.appendChild(entryEl);
  });
}

// ========== 媒体放大灯箱 ==========
function setupLightbox() {
  let currentMedia = [];
  let currentIndex = 0;
  let scale = 1;
  let posX = 0, posY = 0;
  let dragStartX = 0, dragStartY = 0;
  let isDragging = false;
  let loadSeq = 0; // 防止快速切换时显示旧图

  // 创建灯箱元素
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <span class="lightbox-close">&times;</span>
    <span class="lightbox-prev">&#10094;</span>
    <div class="lightbox-content">
      <div class="lightbox-spinner"></div>
      <img class="lightbox-img" src="" alt="">
      <video class="lightbox-video" src="" controls></video>
    </div>
    <span class="lightbox-next">&#10095;</span>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const lightboxVideo = lightbox.querySelector('.lightbox-video');
  const spinner = lightbox.querySelector('.lightbox-spinner');

  function resetTransform() {
    scale = 1;
    posX = 0;
    posY = 0;
    lightboxImg.style.transform = `scale(${scale}) translate(0px, 0px)`;
  }

  function updateTransform() {
    lightboxImg.style.transform = `scale(${scale}) translate(${posX}px, ${posY}px)`;
  }

  async function showMedia() {
    const seq = ++loadSeq;
    resetTransform();
    const item = currentMedia[currentIndex];

    // 先隐藏所有内容，显示 spinner
    lightboxImg.style.display = 'none';
    lightboxVideo.style.display = 'none';
    lightboxVideo.pause();
    spinner.classList.add('show');

    if (item.type === 'video') {
      spinner.classList.remove('show');
      lightboxVideo.style.display = 'block';
      lightboxVideo.src = item.src;
      lightboxVideo.play();
    } else {
      if (PreloadManager.isLoaded(item.src)) {
        // 已预加载，直接显示
        spinner.classList.remove('show');
        lightboxImg.src = item.src;
        lightboxImg.style.display = 'block';
      } else {
        // 未加载，暂停后台预加载，优先加载此图
        await PreloadManager.loadPriority(item.src);
        if (seq !== loadSeq) return; // 已切换到其他图片，忽略
        spinner.classList.remove('show');
        lightboxImg.src = item.src;
        lightboxImg.style.display = 'block';
      }
    }
  }

  function closeLightbox() {
    loadSeq++; // 取消正在进行的加载
    lightbox.classList.remove('active');
    lightboxVideo.pause();
    lightboxVideo.src = '';
    lightboxImg.src = '';
    spinner.classList.remove('show');
    resetTransform();
  }

  // 点击图片或视频打开灯箱
  document.addEventListener('click', (e) => {
    const mediaItem = e.target.closest('.media-item');
    if (!mediaItem) return;

    // 获取同一卡片内的所有媒体项
    const card = mediaItem.closest('.entry-card');
    const items = card.querySelectorAll('.media-item');
    currentMedia = Array.from(items).map(item => {
      const img = item.querySelector('img');
      const video = item.querySelector('video');
      if (video) {
        return { type: 'video', src: video.querySelector('source')?.src || video.src };
      }
      return { type: 'image', src: img.dataset.full || img.src };
    });
    currentIndex = Array.from(items).indexOf(mediaItem);
    showMedia();
    lightbox.classList.add('active');
  });

  // 关闭
  lightbox.querySelector('.lightbox-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  // 上一个
  lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + currentMedia.length) % currentMedia.length;
    showMedia();
  });

  // 下一个
  lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % currentMedia.length;
    showMedia();
  });

  // 点击背景关闭
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // 键盘左右切换
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') {
      currentIndex = (currentIndex - 1 + currentMedia.length) % currentMedia.length;
      showMedia();
    } else if (e.key === 'ArrowRight') {
      currentIndex = (currentIndex + 1) % currentMedia.length;
      showMedia();
    } else if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  // 滚轮缩放图片
  lightbox.addEventListener('wheel', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (lightboxImg.style.display === 'none') return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    scale = Math.min(Math.max(0.2, scale + delta), 5);
    if (scale <= 1) { posX = 0; posY = 0; }
    updateTransform();
  });

  // 拖动图片
  lightboxImg.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX - posX * scale;
    dragStartY = e.clientY - posY * scale;
    lightboxImg.classList.add('dragging');
    lightboxImg.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    posX = (e.clientX - dragStartX) / scale;
    posY = (e.clientY - dragStartY) / scale;
    updateTransform();
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    lightboxImg.classList.remove('dragging');
    lightboxImg.style.cursor = 'grab';
  });

  // 触摸拖动
  lightboxImg.addEventListener('touchstart', (e) => {
    if (scale <= 1) return;
    const t = e.touches[0];
    isDragging = true;
    dragStartX = t.clientX - posX * scale;
    dragStartY = t.clientY - posY * scale;
    lightboxImg.classList.add('dragging');
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    posX = (t.clientX - dragStartX) / scale;
    posY = (t.clientY - dragStartY) / scale;
    updateTransform();
  }, { passive: true });

  document.addEventListener('touchend', () => {
    isDragging = false;
    lightboxImg.classList.remove('dragging');
  });
}

// ========== 统计区渲染 ==========
function renderStats(stats) {
  const grid = document.querySelector('.stats-grid');

  // 固定统计项
  const fixedStats = [
    { label: '在一起', value: stats.days, suffix: '天' },
    { label: '城市', value: stats.cities, suffix: '个' }
  ];

  // 自定义统计项
  const customStats = (stats.custom || []).map(s => ({
    label: s.label,
    value: s.value,
    suffix: ''
  }));

  const allStats = [...fixedStats, ...customStats];

  allStats.forEach(stat => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-value" data-target="${stat.value}">0</div>
      <div class="stat-label">${stat.label}${stat.suffix}</div>
    `;
    grid.appendChild(card);
  });
}

// ========== 滚动动画 ==========
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01 });

  // 观察时间线条目
  document.querySelectorAll('.entry').forEach(el => observer.observe(el));

  // 观察统计卡片
  document.querySelectorAll('.stat-card').forEach(el => observer.observe(el));
}

// ========== 数字滚动动画 ==========
function animateCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        animateNumber(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-value').forEach(el => observer.observe(el));
}

function animateNumber(el, target) {
  const duration = 1500;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.floor(eased * target);
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target;
    }
  }

  requestAnimationFrame(update);
}

// ========== 鼠标残影效果 ==========
function setupCursorTrail() {
  const heartSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='SIZE' height='SIZE' viewBox='0 0 24 24'><path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z' fill='%23FFD700' fill-opacity='OPACITY' stroke='%23DAA520' stroke-opacity='OPACITY' stroke-width='0.8'/></svg>`;
  const trailCount = 8;
  const trails = [];

  for (let i = 0; i < trailCount; i++) {
    const size = 20 - i * 2;
    const opacity = 0.6 - i * 0.06;
    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    trail.style.backgroundImage = `url("data:image/svg+xml,${heartSVG.replace(/SIZE/g, size).replace(/OPACITY/g, opacity)}")`;
    trail.style.width = `${size}px`;
    trail.style.height = `${size}px`;
    document.body.appendChild(trail);
    trails.push({ el: trail, x: 0, y: 0 });
  }

  let mouseX = -100, mouseY = -100;
  let isMoving = false;
  let moveTimer = null;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isMoving = true;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => { isMoving = false; }, 100);
  });

  function animate() {
    trails.forEach((trail, i) => {
      const prev = i === 0 ? { x: mouseX, y: mouseY } : trails[i - 1];
      trail.x += (prev.x - trail.x) * 0.35;
      trail.y += (prev.y - trail.y) * 0.35;
      const size = 20 - i * 2;
      const hotX = 12, hotY = 12;
      trail.el.style.left = `${trail.x - hotX + (24 - size) / 2}px`;
      trail.el.style.top = `${trail.y - hotY + (24 - size) / 2}px`;
      trail.el.style.opacity = isMoving ? (0.6 - i * 0.06) : '0';
    });
    requestAnimationFrame(animate);
  }

  animate();
}

// ========== 背景音乐 ==========
function setupMusic() {
  const btn = document.getElementById('music-btn');
  const audio = document.getElementById('bgm');

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      btn.classList.add('playing');
    } else {
      audio.pause();
      btn.classList.remove('playing');
    }
  });

  // 自动播放
  audio.play().then(() => {
    btn.classList.add('playing');
  }).catch(() => {
    // 浏览器阻止自动播放，用户需手动点击
  });
}

// ========== 图片预加载管理器 ==========
const PreloadManager = {
  loaded: new Set(),

  isLoaded(url) {
    return this.loaded.has(url);
  },

  loadOne(url) {
    return new Promise((resolve) => {
      if (this.loaded.has(url)) { resolve(); return; }
      const img = new Image();
      img.onload = () => { this.loaded.add(url); resolve(); };
      img.onerror = () => { this.loaded.add(url); resolve(); };
      img.src = url;
    });
  },

  // 优先加载某张图（用户点击查看时调用）
  async loadPriority(url) {
    if (this.loaded.has(url)) return;
    await this.loadOne(url);
  }
};

// ========== 滚动式缩略图预加载 ==========
function setupScrollThumbLoader() {
  const entries = document.querySelectorAll('.entry');
  let lastScrollY = window.scrollY;
  let ticking = false;

  function getLoadRange() {
    const vh = window.innerHeight;
    // 当前视口 + 下方 2 个卡片的高度范围
    const scrollTop = window.scrollY;
    const loadUntil = scrollTop + vh * 3;
    return { scrollTop, loadUntil };
  }

  function loadEntryThumbs(entry) {
    if (entry.dataset.thumbsLoaded) return;
    entry.dataset.thumbsLoaded = '1';
    const imgs = entry.querySelectorAll('.media-item img[data-src]');
    imgs.forEach(img => {
      const src = img.dataset.src;
      if (src) {
        img.removeAttribute('data-src');
        img.src = src;
      }
    });
  }

  function checkEntries() {
    const { scrollTop, loadUntil } = getLoadRange();
    entries.forEach(entry => {
      const rect = entry.getBoundingClientRect();
      const entryTop = rect.top + scrollTop;
      if (entryTop < loadUntil) {
        loadEntryThumbs(entry);
      }
    });
  }

  // 用 IntersectionObserver 检测进入范围的条目
  const observer = new IntersectionObserver((observed) => {
    observed.forEach(e => {
      if (e.isIntersecting) {
        loadEntryThumbs(e.target);
      }
    });
  }, { rootMargin: '500% 0px' });

  entries.forEach(entry => observer.observe(entry));

  // 滚动时加载下方 2 个卡片
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      checkEntries();
      ticking = false;
    });
  }, { passive: true });

  // 首次加载当前视口及下方 2 个卡片
  checkEntries();

  // 延迟兜底：确保视口内条目都已加载（处理移动端 observer 未触发的情况）
  setTimeout(() => {
    entries.forEach(entry => {
      const rect = entry.getBoundingClientRect();
      if (rect.top < window.innerHeight * 2) {
        loadEntryThumbs(entry);
      }
    });
  }, 500);
}

// ========== 并发预加载（仅用于首屏） ==========
function preloadImagesConcurrent(urls, onProgress) {
  let loaded = 0;
  const total = urls.length;
  const concurrency = 6;

  return new Promise((resolve) => {
    if (total === 0) { resolve(); return; }

    let index = 0;
    function next() {
      if (index >= total) return;
      const i = index++;
      const img = new Image();
      img.onload = img.onerror = () => {
        PreloadManager.loaded.add(urls[i]);
        loaded++;
        if (onProgress) onProgress(loaded, total);
        if (loaded === total) resolve();
        else next();
      };
      img.src = urls[i];
    }

    for (let c = 0; c < Math.min(concurrency, total); c++) next();
  });
}

// ========== 初始化 ==========
async function init() {
  const data = await loadData();

  // 收集所有缩略图 URL（用于首屏加载）
  const allThumbs = [];
  data.entries.forEach(e => {
    e.media.forEach(m => {
      if (m.type === 'image') allThumbs.push(assetUrl(m.thumb || m.src));
    });
  });

  const loader = document.getElementById('loader');
  const bar = document.getElementById('loader-bar');
  const text = document.getElementById('loader-text');

  // 首屏：并发加载前 100 张缩略图
  const phase1 = allThumbs.slice(0, 100);
  const phase1Total = phase1.length;

  const timeout = new Promise((resolve) => setTimeout(resolve, 8000));
  const loading = preloadImagesConcurrent(phase1, (loaded) => {
    const pct = Math.round((loaded / phase1Total) * 100);
    bar.style.width = pct + '%';
    text.textContent = `加载中 ${pct}%`;
  });

  await Promise.race([loading, timeout]);
  bar.style.width = '100%';

  loader.classList.add('fade-out');
  setTimeout(() => loader.remove(), 600);

  renderCover(data.meta, data.entries);
  renderTimeline(data.entries);
  renderStats(data.stats);
  setupScrollAnimations();
  animateCounters();
  setupCursorTrail();
  setupFallingStars();
  setupLightbox();
  setupMusic();

  // 滚动式缩略图预加载
  setupScrollThumbLoader();
}

// ========== 星星坠落特效 ==========
function setupFallingStars() {
  const canvas = document.getElementById('stars-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const stars = [];
  const maxStars = 40;

  function createStar() {
    return {
      x: Math.random() * W,
      y: -10,
      size: 2 + Math.random() * 4,
      speed: 0.3 + Math.random() * 0.8,
      opacity: 0.4 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.3,
      twinkle: Math.random() * Math.PI * 2
    };
  }

  // 初始化一些星星分散在屏幕各处
  for (let i = 0; i < 15; i++) {
    const s = createStar();
    s.y = Math.random() * H;
    stars.push(s);
  }

  function drawStar(x, y, size, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    // 随机新增星星
    if (stars.length < maxStars && Math.random() < 0.03) {
      stars.push(createStar());
    }

    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.y += s.speed;
      s.x += s.drift;
      s.twinkle += 0.02;
      const twinkleAlpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));

      drawStar(s.x, s.y, s.size, twinkleAlpha);

      // 移除超出屏幕的星星
      if (s.y > H + 10) {
        stars.splice(i, 1);
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

init();
