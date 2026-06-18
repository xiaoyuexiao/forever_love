// ========== 数据加载 ==========
async function loadData() {
  const response = await fetch('data/timeline.json');
  return response.json();
}

// ========== 封面渲染 ==========
function renderCover(meta) {
  const cover = document.getElementById('cover');
  cover.style.backgroundImage = `url(${meta.cover})`;

  document.querySelector('.cover-title').textContent = meta.title;
  document.querySelector('.cover-subtitle').textContent = meta.subtitle;
  document.querySelector('.cover-names').textContent = meta.names.join(' & ');
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
      mediaHTML = entry.media.map(m => {
        if (m.type === 'video') {
          return `<div class="entry-media">
            <video controls poster="${m.poster || ''}" preload="metadata">
              <source src="${m.src}" type="video/mp4">
            </video>
          </div>`;
        }
        return `<div class="entry-media">
          <img src="${m.src}" alt="${m.alt || ''}" loading="lazy">
        </div>`;
      }).join('');
    }

    entryEl.innerHTML = `
      <div class="entry-node"></div>
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

// ========== 统计区渲染 ==========
function renderStats(stats, firstDate) {
  const grid = document.querySelector('.stats-grid');

  // 计算天数
  const days = Math.floor((new Date() - new Date(firstDate)) / (1000 * 60 * 60 * 24));

  // 固定统计项
  const fixedStats = [
    { label: '在一起', value: days, suffix: '天' },
    { label: '城市', value: stats.cities, suffix: '个' },
    { label: '照片', value: stats.photos, suffix: '张' }
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
  }, { threshold: 0.1 });

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
  const heartSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='SIZE' height='SIZE' viewBox='0 0 24 24'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' fill='%23FFB6C1' fill-opacity='OPACITY' stroke='%23FF69B4' stroke-opacity='OPACITY' stroke-width='1'/></svg>`;
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

  let mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    trails.forEach((trail, i) => {
      const prev = i === 0 ? { x: mouseX, y: mouseY } : trails[i - 1];
      trail.x += (prev.x - trail.x) * 0.35;
      trail.y += (prev.y - trail.y) * 0.35;
      trail.el.style.left = `${trail.x}px`;
      trail.el.style.top = `${trail.y}px`;
    });
    requestAnimationFrame(animate);
  }

  animate();
}

// ========== 初始化 ==========
async function init() {
  const data = await loadData();
  renderCover(data.meta);
  renderTimeline(data.entries);
  renderStats(data.stats, data.entries[0].date);
  setupScrollAnimations();
  animateCounters();
  setupCursorTrail();
}

init();
