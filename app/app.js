// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  currentView: 'feed',
  selectedNeighborhood: 'Todos',
  selectedCategory: null,
  searchQuery: '',
  eventFilter: 'all',
  detailPlaceId: null,
  prevView: 'feed',
  compareList: [],
  featuredIndex: 0,
  feedPage: 0,
};

const FEED_PAGE_SIZE = 12;

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
function getSaved()        { return JSON.parse(localStorage.getItem('gc_saved_places') || '[]'); }
function setSaved(ids)     { localStorage.setItem('gc_saved_places', JSON.stringify(ids)); }
function getAttending()    { return JSON.parse(localStorage.getItem('gc_attending_events') || '[]'); }
function setAttending(ids) { localStorage.setItem('gc_attending_events', JSON.stringify(ids)); }

function getPlaces() {
  const s = localStorage.getItem('gc_admin_places');
  if (s) { try { return JSON.parse(s); } catch(e) {} }
  return window.GC_PLACES;
}
function getEvents() {
  const s = localStorage.getItem('gc_admin_events');
  if (s) { try { return JSON.parse(s); } catch(e) {} }
  return window.GC_EVENTS;
}

// ─── XP / LEVEL ───────────────────────────────────────────────────────────────
function calcXP() {
  return getSaved().length * 1 + getAttending().length * 2;
}
function calcLevel(xp) {
  if (xp >= 20) return { name: 'Globetrotter', next: null,  progress: 100 };
  if (xp >= 10) return { name: 'Adventurer',   next: 20,    progress: (xp - 10) / 10 * 100 };
  if (xp >= 5)  return { name: 'Explorer',     next: 10,    progress: (xp - 5) / 5 * 100 };
  return              { name: 'Rookie',        next: 5,     progress: xp / 5 * 100 };
}

function updateHeader() {
  const level = calcLevel(calcXP());
  const badge = document.getElementById('level-badge');
  if (badge) badge.textContent = level.name;
}

// ─── CATEGORY COLORS ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  'Restaurante':    '#0066FF',
  'Ristorante':     '#0066FF',
  'Pizzería':       '#0066FF',
  'Pizza':          '#0066FF',
  'Food':           '#0066FF',
  'Café':           '#0066FF',
  'Bar':            '#A855F7',
  'Bar / Cocktail': '#A855F7',
  'Cocktail Bar':   '#A855F7',
  'Pub':            '#A855F7',
  'Nightlife':      '#EC4899',
  'Club':           '#EC4899',
  'Discoteca':      '#EC4899',
  'Fiesta':         '#EC4899',
  'Cultura':        '#F97316',
  'Arte':           '#F97316',
  'Museo':          '#F97316',
  'Tour':           '#F97316',
  'Actividad':      '#10B981',
  'Deporte':        '#10B981',
  'Sport':          '#10B981',
  'Naturaleza':     '#10B981',
};
function getCatColor(cat) {
  return CAT_COLORS[cat] || '#0066FF';
}

// ─── AVATAR STACK ─────────────────────────────────────────────────────────────
const _AV_NAMES  = ['LA','SO','NI','VA','MA','CA','FE','JU','MI','TO','AL','DA'];
const _AV_COLORS = ['#0066FF','#10B981','#F97316','#A855F7','#EC4899','#00B4FF','#EF4444','#FBBF24'];

function renderAvatarStack(count, seed) {
  if (count <= 0) return '';
  const visible = Math.min(count, 3);
  let html = '<div class="avatar-stack">';
  for (let i = 0; i < visible; i++) {
    const ni = (seed * 3 + i * 7) % _AV_NAMES.length;
    const ci = (seed * 5 + i * 3) % _AV_COLORS.length;
    html += `<div class="avatar-xs" style="background:${_AV_COLORS[ci]}">${_AV_NAMES[ni]}</div>`;
  }
  if (count > 3) {
    html += `<div class="avatar-xs avatar-more">+${count - 3}</div>`;
  }
  html += '</div>';
  return html;
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
const _CONFETTI_COLORS = ['#EC4899','#0066FF','#F97316','#10B981','#A855F7','#00B4FF','#FBBF24'];

function launchConfetti(originEl) {
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const dist  = 35 + Math.random() * 30;
    p.style.cssText = [
      `left:${cx}px`,
      `top:${cy}px`,
      `background:${_CONFETTI_COLORS[i % _CONFETTI_COLORS.length]}`,
      `--tx:${(Math.cos(angle) * dist).toFixed(1)}px`,
      `--ty:${(Math.sin(angle) * dist - 30).toFixed(1)}px`,
      `--rot:${Math.floor(Math.random() * 360)}deg`,
    ].join(';');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

// ─── GC SCORE ─────────────────────────────────────────────────────────────────
function calcGCScore(p) {
  let s = 0;
  s += Math.min((p.stats?.going || 0) / 20 * 40, 40);
  s += ({ '< €10': 25, '€10–20': 18, '€20–40': 10, '> €40': 5 }[p.priceRange] ?? 12);
  s += p.offer?.text ? 20 : 0;
  s += ({ premium: 15, partner: 10, free: 5 }[p.plan] ?? 5);
  return Math.round(Math.min(s, 100));
}

// ─── VERIFY CODE ──────────────────────────────────────────────────────────────
function genVerifyCode(studentId, placeId) {
  const key = `${studentId}-${placeId}`;
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  h = Math.abs(h);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) { code += chars[h % chars.length]; h = Math.floor(h / chars.length); }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

// ─── DATA URL → BLOB ──────────────────────────────────────────────────────────
function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

// ─── HERO SWIPE (module-level, attached once) ──────────────────────────────────
let _heroStartX = 0, _heroCurrentX = 0, _heroIsDragging = false, _heroMouseReady = false, _heroDidDrag = false;

function heroSwipeEnd(hero) {
  const dx = _heroCurrentX - _heroStartX;
  _heroStartX = 0; _heroCurrentX = 0;

  if (Math.abs(dx) > 70) {
    const right = dx > 0;
    hero.style.transition = 'transform 300ms ease-out, opacity 300ms';
    hero.style.transform  = `translateX(${right ? '150vw' : '-150vw'}) rotate(${right ? 22 : -22}deg)`;
    hero.style.opacity    = '0';

    if (right) {
      // Swipe right = save
      const placeId = parseInt(hero.dataset.place);
      const saved   = getSaved();
      if (!saved.includes(placeId)) { saved.push(placeId); setSaved(saved); updateHeader(); }
      launchConfetti(hero.querySelector('.featured-card-save'));
    }

    const trending = [...getPlaces().filter(p => p.active !== false)]
      .sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0));
    state.featuredIndex = (state.featuredIndex + 1) % Math.max(trending.length, 1);
    setTimeout(() => navigate('feed'), 320);
  } else {
    hero.style.transition = 'transform 200ms ease-out';
    hero.style.transform  = '';
    // Reset indicators
    const si = hero.querySelector('.hero-save-indicator');
    const ki = hero.querySelector('.hero-skip-indicator');
    if (si) si.style.opacity = '0';
    if (ki) ki.style.opacity = '0';
  }
}

function initHeroSwipe() {
  const hero = document.querySelector('.featured-card');
  if (!hero) return;
  _heroDidDrag = false;

  // Touch only (no mouse drag)
  hero.addEventListener('touchstart', e => {
    _heroStartX = _heroCurrentX = e.touches[0].clientX;
    _heroIsDragging = true;
    _heroDidDrag = false;
    hero.style.transition = 'none';
    hero.classList.add('dragging');
  }, { passive: true });

  hero.addEventListener('touchmove', e => {
    if (!_heroIsDragging) return;
    _heroCurrentX = e.touches[0].clientX;
    const dx = _heroCurrentX - _heroStartX;
    if (Math.abs(dx) > 8) _heroDidDrag = true;
    hero.style.transform = `translateX(${dx}px) rotate(${dx * 0.03}deg)`;
    const si = hero.querySelector('.hero-save-indicator');
    const ki = hero.querySelector('.hero-skip-indicator');
    if (si) si.style.opacity = dx > 30 ? Math.min((dx - 30) / 60, 1) : 0;
    if (ki) ki.style.opacity = dx < -30 ? Math.min((-dx - 30) / 60, 1) : 0;
  }, { passive: true });

  hero.addEventListener('touchend', () => {
    if (!_heroIsDragging) return;
    _heroIsDragging = false;
    hero.classList.remove('dragging');
    heroSwipeEnd(hero);
  }, { passive: true });
}

// ─── CARD SCROLL ANIMATION ────────────────────────────────────────────────────
function initCardObserver() {
  let count = 0;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${count * 35}ms`;
      entry.target.classList.add('card-visible');
      count++;
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

  document.querySelectorAll('.place-card, .event-card').forEach(el => obs.observe(el));
}

// ─── SMART CHIPS ──────────────────────────────────────────────────────────────
function initSmartChips() {
  const wrap = document.querySelector('.chips-smart-wrap');
  if (!wrap) return;
  const scroller = document.getElementById('app-content');
  if (!scroller) return;
  let lastY = scroller.scrollTop;
  scroller.addEventListener('scroll', () => {
    const y  = scroller.scrollTop;
    const dy = y - lastY;
    if (dy > 0 && y > 80) wrap.classList.add('chips-hidden');
    else if (dy < -40)    wrap.classList.remove('chips-hidden');
    lastY = y;
  }, { passive: true });
}

// ─── INFINITE SCROLL ──────────────────────────────────────────────────────────
function initInfiniteScroll() {
  const sentinel = document.getElementById('feed-sentinel');
  if (!sentinel) return;

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.unobserve(sentinel);

    const loading = document.getElementById('feed-loading');
    if (loading) loading.style.display = 'flex';

    setTimeout(() => {
      const places   = getPlaces().filter(p => p.active !== false);
      const saved    = getSaved();
      const filtered = state.selectedNeighborhood === 'Todos'
        ? places
        : places.filter(p => p.neighborhood === state.selectedNeighborhood);

      state.feedPage++;
      const start = state.feedPage * FEED_PAGE_SIZE;
      const end   = start + FEED_PAGE_SIZE;
      const next  = filtered.slice(start, end);

      if (loading) loading.style.display = 'none';

      const grid = document.getElementById('dense-grid');
      if (!grid || next.length === 0) {
        sentinel.remove();
        if (loading) loading.remove();
        if (grid) {
          const e = document.createElement('div');
          e.className = 'feed-end';
          e.textContent = 'Has visto todo ✓';
          grid.after(e);
        }
        return;
      }

      // Build new cards in a temp container so listeners attach only to them
      const tmp = document.createElement('div');
      next.forEach(place => {
        const wrap = document.createElement('div');
        wrap.innerHTML = renderMiniCard(place, saved).trim();
        tmp.appendChild(wrap.firstElementChild);
      });
      attachMiniCardListeners(tmp);
      attachSaveBtns(tmp);
      attachIrBtns(tmp);

      // Move cards to grid with staggered fade-in
      Array.from(tmp.children).forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        card.style.transition = `opacity 250ms ease ${i * 40}ms, transform 250ms ease ${i * 40}ms`;
        grid.appendChild(card);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }));
      });

      if (filtered.length > end) {
        obs.observe(sentinel);
      } else {
        sentinel.remove();
        if (loading) loading.remove();
        const e = document.createElement('div');
        e.className = 'feed-end';
        e.textContent = 'Has visto todo ✓';
        grid.after(e);
      }
    }, 350);
  }, { threshold: 0.1 });

  obs.observe(sentinel);
}

// ─── HERO PARALLAX ────────────────────────────────────────────────────────────
function initHeroParallax() {
  const scroller = document.getElementById('app-content');
  const heroImg  = document.querySelector('.featured-card-img');
  if (!scroller || !heroImg) return;
  let ticking = false;
  scroller.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        heroImg.style.transform = `translateY(${Math.min(scroller.scrollTop * 0.15, 20)}%)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ─── MINI CARD FLIP LISTENERS ─────────────────────────────────────────────────
function attachMiniCardListeners(container) {
  const isTouchOnly = window.matchMedia('(hover: none)').matches;
  container.querySelectorAll('.mini-card').forEach(card => {
    const inner = card.querySelector('.mini-card-inner');
    if (!inner) return;

    if (isTouchOnly) {
      // Mobile: tap → flip; auto-flip back after 5s
      let autoFlipTimer = null;
      card.addEventListener('click', e => {
        if (e.target.closest('[data-save]') || e.target.closest('[data-ir]') || e.target.closest('[data-flip-back]')) return;
        inner.classList.toggle('is-flipped');
        if (inner.classList.contains('is-flipped')) {
          clearTimeout(autoFlipTimer);
          autoFlipTimer = setTimeout(() => inner.classList.remove('is-flipped'), 5000);
        }
      });
    } else {
      // Desktop: mouseenter 350ms delay → flip; mouseleave → unflip; click → detail
      let hoverTimer = null;
      card.addEventListener('mouseenter', () => {
        hoverTimer = setTimeout(() => inner.classList.add('is-flipped'), 350);
      });
      card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        inner.classList.remove('is-flipped');
      });
      card.addEventListener('click', e => {
        if (e.target.closest('[data-save]') || e.target.closest('[data-ir]') || e.target.closest('[data-flip-back]')) return;
        if (!inner.classList.contains('is-flipped')) {
          navigate('detalle', { detailPlaceId: parseInt(card.dataset.place), prevView: state.currentView });
        }
      });
    }

    // Flip-back button
    const flipBackBtn = card.querySelector('[data-flip-back]');
    if (flipBackBtn) {
      flipBackBtn.addEventListener('click', e => {
        e.stopPropagation();
        inner.classList.remove('is-flipped');
      });
    }
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const MAIN_VIEWS = ['feed', 'explorar', 'eventos', 'guardados', 'pass'];

function navigate(view, params) {
  if (params) Object.assign(state, params);
  state.currentView = view;
  if (MAIN_VIEWS.includes(view)) {
    document.querySelectorAll('#bottom-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
  }
  const content = document.getElementById('app-content');
  content.innerHTML = VIEWS[view]();
  content.scrollTop = 0;
  attachListeners();
  updateHeader();
}

// ─── PLACE CARD ───────────────────────────────────────────────────────────────
function renderPlaceCard(place, saved, showDescuentoBtn = false) {
  const isSaved   = saved.includes(place.id);
  const isCompare = state.compareList.includes(place.id);
  const going     = place.stats?.going || 0;
  const coverSrc  = place.imageData || place.imageUrl;
  const logoSrc   = place.logoData;
  const catColor  = getCatColor(place.category);

  let imageHtml;
  if (coverSrc) {
    imageHtml = `<img class="place-card-img" src="${coverSrc}" alt="${place.name}" loading="lazy" onerror="this.style.display='none'"/>`;
  } else if (logoSrc) {
    imageHtml = `<div class="place-card-icon-bg" style="background:${place.bgColor || '#F3F4F6'}"><img class="place-card-logo" src="${logoSrc}" alt="${place.name}"/></div>`;
  } else {
    imageHtml = `<div class="place-card-icon-bg" style="background:${place.bgColor || '#F3F4F6'}">${place.emoji || '●'}</div>`;
  }

  return `
    <div class="place-card" data-place="${place.id}" style="--cat-color:${catColor}">
      <div class="place-card-media">${imageHtml}</div>
      <div class="place-card-body">
        <div class="place-name">${place.name}</div>
        <div class="place-meta">
          <span class="place-category-dot" style="background:${catColor}"></span>
          ${place.category} · ${place.neighborhood}
        </div>
        ${place.priceRange ? `<div class="place-price">${place.priceRange} / persona</div>` : ''}
        ${going > 0 ? `
        <div class="place-social">
          ${renderAvatarStack(going, place.id)}
          <span class="place-social-text">${going} van a esto${going >= 15 ? ' 🔥' : ''}</span>
        </div>` : ''}
        ${place.offer?.text ? `<div class="place-offer">${place.offer.text}</div>` : ''}
        <div class="place-actions">
          <div class="place-actions-left">
            <button class="save-btn${isSaved ? ' saved' : ''}" data-save="${place.id}" title="${isSaved ? 'Quitar' : 'Guardar'}">♥</button>
          </div>
          <div class="place-actions-right">
            <button class="btn-compare-card${isCompare ? ' active' : ''}" data-compare="${place.id}">${isCompare ? '✓ Seleccionado' : '⇄ Comparar'}</button>
            <button class="btn-ir" data-ir="${place.id}">IR →</button>
          </div>
        </div>
        ${showDescuentoBtn && place.offer?.text ? `<button class="btn-descuento-sm" data-descuento="${place.id}">🎫 Mi descuento</button>` : ''}
      </div>
    </div>`;
}

// ─── MINI CARD ────────────────────────────────────────────────────────────────
function renderMiniCard(place, saved) {
  const isSaved  = saved.includes(place.id);
  const going    = place.stats?.going || 0;
  const coverSrc = place.imageData || place.imageUrl;
  const catColor = getCatColor(place.category);
  const location = place.address || place.neighborhood;

  let imgHtml;
  if (coverSrc) {
    imgHtml = `<img src="${coverSrc}" alt="${place.name}" loading="lazy" onerror="this.style.display='none'"/>`;
  } else {
    imgHtml = `<div class="mini-img-wrap-icon" style="background:${place.bgColor || '#F3F4F6'}">${place.emoji || '●'}</div>`;
  }

  const desc = (place.description || '').slice(0, 90) + ((place.description || '').length > 90 ? '…' : '');

  return `
    <div class="mini-card" data-place="${place.id}" style="--cat-color:${catColor}">
      <div class="mini-card-inner">
        <div class="mini-card-front">
          <div class="mini-img-wrap">
            ${imgHtml}
            <div class="mini-title-overlay">
              <div class="mini-card-name">${place.name}</div>
              <div class="mini-card-cat">${place.category}</div>
            </div>
            ${isSaved ? '<div class="mini-saved-badge">♥</div>' : ''}
          </div>
          <div class="mini-info">
            ${location ? `<div class="mini-info-row">📍 ${location}</div>` : ''}
            <div class="mini-info-row"><span class="mini-cat-dot"></span>${place.category}</div>
            ${place.priceRange ? `<div class="mini-info-price">${place.priceRange} / persona</div>` : ''}
            ${going >= 8 ? `<div class="mini-info-urgency">🔥 Se llena rápido</div>` : ''}
          </div>
          <div class="mini-cta">
            <button class="mini-heart-btn${isSaved ? ' saved' : ''}" data-save="${place.id}">♥</button>
            <button class="mini-ir-btn" data-ir="${place.id}">IR →</button>
          </div>
        </div>
        <div class="mini-card-back">
          <div class="mini-back-body">
            ${going > 0 ? `
            <div class="mini-social-row">
              ${renderAvatarStack(going, place.id)}
              <span class="mini-social-text">${going} van a esto</span>
            </div>` : ''}
            <div class="mini-back-desc">${desc || place.category + ' en ' + place.neighborhood}</div>
            <div class="mini-back-info">
              ${place.hours   ? `<span>🕐 ${place.hours}</span>`      : ''}
              ${place.address ? `<span>📍 ${place.address}</span>`    : ''}
              ${place.offer?.text ? `<span>🎫 ${place.offer.text}</span>` : ''}
            </div>
          </div>
          <div class="mini-back-actions">
            <button class="mini-flip-back-btn" data-flip-back>← Volver</button>
            <button class="mini-back-save-btn${isSaved ? ' saved' : ''}" data-save="${place.id}">${isSaved ? 'Guardado' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCompareBar() {
  const n = state.compareList.length;
  if (n === 0) return '';
  return `
    <div class="compare-float">
      <span class="compare-float-info">${n} lugar${n !== 1 ? 'es' : ''}</span>
      <div class="compare-float-divider"></div>
      <span id="clear-compare">Limpiar</span>
      <button id="go-compare" class="btn-compare-go">Comparar</button>
    </div>`;
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
const VIEWS = {

  feed() {
    state.feedPage = 0;
    const places = getPlaces().filter(p => p.active !== false);
    const saved  = getSaved();
    const neighborhoods = ['Todos', ...new Set(places.map(p => p.neighborhood))];
    const filtered = state.selectedNeighborhood === 'Todos'
      ? places
      : places.filter(p => p.neighborhood === state.selectedNeighborhood);

    const xp    = calcXP();
    const level = calcLevel(xp);

    const trending = [...places].sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0));
    state.featuredIndex = Math.min(state.featuredIndex, Math.max(trending.length - 1, 0));
    const featured      = trending[state.featuredIndex] || null;
    const featuredCover = featured ? (featured.imageData || featured.imageUrl) : null;
    const catColor      = featured ? getCatColor(featured.category) : '#0066FF';
    const going         = featured?.stats?.going || 0;

    const dotsHtml = trending.length > 1 ? `
      <div class="hero-dots">
        ${trending.map((_, i) => `<div class="hero-dot${i === state.featuredIndex ? ' active' : ''}"></div>`).join('')}
      </div>` : '';

    const firstPage = filtered.slice(0, FEED_PAGE_SIZE);
    const hasMore   = filtered.length > FEED_PAGE_SIZE;

    return `
      <div class="view">
        <div class="feed-greeting">
          <div class="feed-greeting-name">Buongiorno, Lautaro!</div>
          <div class="feed-greeting-sub">Roma te espera — ${places.length} lugares disponibles</div>
          <div class="xp-row">
            <span class="xp-label">${level.name}</span>
            <span class="xp-points">${xp} XP${level.next ? ' · próximo: ' + level.next + ' XP' : ' · Máximo nivel'}</span>
          </div>
          <div class="xp-bar-track">
            <div class="xp-bar-fill" style="width:${level.progress}%"></div>
          </div>
        </div>

        ${featured ? `
        <div class="featured-wrap featured-wrap-compact">
          <div class="featured-label">⭐ Trending</div>
          <div class="hero-card-area">
            ${trending.length > 1 ? `<button class="hero-nav-btn hero-prev" id="hero-prev">&#8249;</button>` : ''}
            <div class="featured-card" data-place="${featured.id}" style="border-top-color:${catColor}">
              ${featuredCover
                ? `<img class="featured-card-img" src="${featuredCover}" alt="${featured.name}" onerror="this.style.display='none'"/>`
                : `<div class="featured-card-icon-bg" style="background:${featured.bgColor || '#DBEAFE'}">${featured.emoji || '🏠'}</div>`
              }
              <div class="featured-card-overlay"></div>
              <div class="featured-card-info">
                <div class="featured-card-name">${featured.name}</div>
                <div class="featured-card-sub">${featured.category} · ${featured.neighborhood}</div>
                ${going > 0 ? `
                <div class="featured-card-social">
                  ${renderAvatarStack(going, featured.id)}
                  <span class="featured-card-social-text">${going} van a esto</span>
                </div>` : ''}
              </div>
              <div class="hero-save-indicator">❤️ Guardar</div>
              <div class="hero-skip-indicator">→ Siguiente</div>
              ${(featured.stats?.going || 0) >= 15 ? '<span class="featured-card-badge">🔥 Popular</span>' : ''}
              <button class="featured-card-save${saved.includes(featured.id) ? ' saved' : ''}" data-save="${featured.id}">♥</button>
            </div>
            ${trending.length > 1 ? `<button class="hero-nav-btn hero-next" id="hero-next">&#8250;</button>` : ''}
          </div>
          ${dotsHtml}
        </div>` : ''}

        <div class="section-head">
          <span class="section-head-title">Lugares en Roma${state.selectedNeighborhood !== 'Todos' ? ' · ' + state.selectedNeighborhood : ''}</span>
          <span class="section-head-sub">${places.length} registrado${places.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="chips-smart-wrap">
          <div class="chips-row">
            ${neighborhoods.map(n => `
              <div class="chip${n === state.selectedNeighborhood ? ' active' : ''}" data-neighborhood="${n}">${n}</div>
            `).join('')}
          </div>
        </div>

        ${renderCompareBar()}

        ${filtered.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-title">${places.length === 0 ? 'Sin lugares aún' : 'Sin lugares en ' + state.selectedNeighborhood}</div>
              <div class="empty-state-desc">${places.length === 0 ? 'Pronto habrá lugares disponibles.' : 'Probá con otro barrio.'}</div>
             </div>`
          : `<div class="dense-grid" id="dense-grid">${firstPage.map(p => renderMiniCard(p, saved)).join('')}</div>
             ${hasMore
               ? `<div id="feed-sentinel" class="feed-sentinel"></div>
                  <div id="feed-loading" class="feed-loading" style="display:none"><div class="feed-spinner"></div><span style="font-size:13px;color:#9CA3AF">Cargando...</span></div>`
               : `<div class="feed-end">Has visto todo ✓</div>`
             }`
        }
      </div>`;
  },

  explorar() {
    const places = getPlaces().filter(p => p.active !== false);
    const saved  = getSaved();
    const categories = [...new Set(places.map(p => p.category))];

    let filtered = places;
    if (state.selectedCategory) filtered = filtered.filter(p => p.category === state.selectedCategory);
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    return `
      <div class="view">
        <div class="search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-input" class="search-input" placeholder="Buscar lugar, barrio o categoría..." value="${state.searchQuery.replace(/"/g,'&quot;')}"/>
        </div>

        ${categories.length > 0 ? `
        <div class="chips-row">
          <div class="chip${!state.selectedCategory ? ' active' : ''}" data-category="">Todas</div>
          ${categories.map(c => `<div class="chip${state.selectedCategory === c ? ' active' : ''}" data-category="${c}">${c}</div>`).join('')}
        </div>` : ''}

        ${renderCompareBar()}

        <div class="result-count" id="result-count">${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}</div>

        <div id="search-results">
          ${filtered.length === 0
            ? `<div class="empty-state">
                <div class="empty-state-title">Sin resultados</div>
                <div class="empty-state-desc">Probá con otro término o filtro</div>
               </div>`
            : `<div class="cards-grid">${filtered.map(p => renderPlaceCard(p, saved)).join('')}</div>`
          }
        </div>
      </div>`;
  },

  eventos() {
    const events    = getEvents();
    const places    = getPlaces();
    const attending = getAttending();

    const filtered = state.eventFilter === 'all'
      ? events
      : events.filter(ev => ev.week === (state.eventFilter === 'week' ? 'this' : 'month'));

    return `
      <div class="tabs">
        <div class="tab${state.eventFilter === 'all'   ? ' active' : ''}" data-event-filter="all">Todos</div>
        <div class="tab${state.eventFilter === 'week'  ? ' active' : ''}" data-event-filter="week">Esta semana</div>
        <div class="tab${state.eventFilter === 'month' ? ' active' : ''}" data-event-filter="month">Este mes</div>
      </div>
      <div class="view">
        ${filtered.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-title">Sin eventos en este período</div>
              <div class="empty-state-desc">Cuando haya eventos disponibles aparecerán aquí</div>
             </div>`
          : `<div class="events-grid">
              ${filtered.map(ev => {
                const place = places.find(p => p.id === ev.placeId);
                const isAttending = attending.includes(ev.id);
                const count = ev.going + (isAttending ? 1 : 0);
                return `
                  <div class="event-card">
                    <div class="event-card-accent"></div>
                    <div class="event-card-body">
                      <div class="event-card-head">
                        <div>
                          <div class="event-name">${ev.name}</div>
                          <div class="event-place-name">${place ? place.name + ' · ' + place.neighborhood : '—'}</div>
                        </div>
                        <div class="event-date-chip">${ev.displayDate}</div>
                      </div>
                      <div class="event-price-tag">${ev.time} · ${ev.price}</div>
                      <div class="event-footer">
                        <span class="event-going">${count} confirmados</span>
                        <button class="btn-attend${isAttending ? ' attending' : ''}" data-attend="${ev.id}">
                          ${isAttending ? 'Apuntado' : 'Me apunto'}
                        </button>
                      </div>
                    </div>
                  </div>`;
              }).join('')}
            </div>`
        }
      </div>`;
  },

  guardados() {
    const saved  = getSaved();
    const places = getPlaces().filter(p => saved.includes(p.id));

    return `
      <div class="view">
        <div class="section-head">
          <span class="section-head-title">Guardados</span>
          <span class="section-head-sub">${places.length} lugar${places.length !== 1 ? 'es' : ''}</span>
        </div>
        ${renderCompareBar()}
        ${places.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-title">Nada guardado todavía</div>
              <div class="empty-state-desc">Guardá lugares para encontrarlos fácilmente</div>
              <button class="btn-primary-sm" data-view="feed">Ver lugares</button>
             </div>`
          : `<div class="cards-grid">${places.map(p => renderPlaceCard(p, saved, true)).join('')}</div>`
        }
      </div>`;
  },

  pass() {
    const places = getPlaces().filter(p => p.plan !== 'free' && p.active !== false);
    return `
      <div class="view">
        <div class="pass-card">
          <div class="pass-header">
            <span class="pass-brand">Global Connect</span>
            <span class="pass-type">Student Pass</span>
          </div>
          <div class="pass-name">Lautaro García</div>
          <div class="pass-uni">UBA · Erasmus Roma 2026</div>
          <div class="pass-id-box">
            <div class="pass-id-label">ID Estudiante</div>
            <div class="pass-id">GC-2026-00847</div>
          </div>
          <div class="pass-footer">
            <span>Válido: Feb – Jul 2026</span>
            <span>Partner Premium</span>
          </div>
        </div>

        ${places.length > 0 ? `
        <div class="section-head" style="margin-top:4px">
          <span class="section-head-title">Beneficios activos</span>
          <span class="section-head-sub">${places.length} lugar${places.length !== 1 ? 'es' : ''}</span>
        </div>
        <div style="background:#fff;margin:0 16px 16px;border:1px solid #EAECEF;border-radius:14px;overflow:hidden">
          ${places.map(p => `
            <div class="benefit-item" data-place="${p.id}">
              <div class="benefit-icon" style="background:${p.bgColor || '#F8FAFC'}">${p.emoji || '●'}</div>
              <div>
                <div class="benefit-name">${p.name}</div>
                ${p.offer?.text ? `<div class="benefit-offer">${p.offer.text}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="empty-state">
          <div class="empty-state-title">Sin beneficios activos</div>
          <div class="empty-state-desc">Los locales partner aparecerán aquí</div>
        </div>`}

        <div style="padding:0 16px 8px">
          <button class="btn-primary-full" id="share-btn">Compartir mi GCPass</button>
        </div>
      </div>`;
  },

  detalle() {
    const place = getPlaces().find(p => p.id === state.detailPlaceId);
    if (!place) return `<div class="empty-state"><div class="empty-state-title">Local no encontrado</div></div>`;
    const saved    = getSaved();
    const isSaved  = saved.includes(place.id);
    const coverSrc = place.imageData || place.imageUrl;

    const rows = [];
    if (place.priceRange) rows.push(`
      <div class="detail-info-row">
        <span class="detail-info-icon">💶</span>
        <span class="detail-info-text">${place.priceRange} por persona</span>
      </div>`);
    if (place.address) rows.push(`
      <div class="detail-info-row">
        <span class="detail-info-icon">📍</span>
        ${place.mapsUrl
          ? `<a href="${place.mapsUrl}" target="_blank" class="detail-info-link">${place.address}</a>`
          : `<span class="detail-info-text">${place.address}</span>`}
      </div>`);
    if (place.hours) rows.push(`
      <div class="detail-info-row">
        <span class="detail-info-icon">🕐</span>
        <span class="detail-info-text">${place.hours}</span>
      </div>`);
    if (place.phone) rows.push(`
      <div class="detail-info-row">
        <span class="detail-info-icon">📞</span>
        <a href="tel:${place.phone}" class="detail-info-link">${place.phone}</a>
      </div>`);
    if (place.website) rows.push(`
      <div class="detail-info-row">
        <span class="detail-info-icon">🌐</span>
        <a href="${place.website}" target="_blank" class="detail-info-link">${place.website.replace(/^https?:\/\//, '')}</a>
      </div>`);

    const menuBtn = place.menuData
      ? `<button class="btn-primary-full" id="open-menu-btn" style="background:#F8FAFC;color:#1D4ED8;border:1px solid #BFDBFE;" data-menu-type="${place.menuType || ''}">Ver carta / menú</button>`
      : (place.menuUrl
          ? `<a href="${place.menuUrl}" target="_blank" style="display:block;text-align:center;padding:13px;border:1px solid #EAECEF;border-radius:12px;font-size:13px;font-weight:700;color:#1D4ED8;text-decoration:none">Ver carta / menú</a>`
          : '');

    return `
      <div class="btn-back" id="detail-back">← Volver</div>
      ${coverSrc
        ? `<img class="detail-cover" src="${coverSrc}" alt="${place.name}" onerror="this.style.display='none'"/>`
        : `<div class="detail-cover-icon-bg" style="background:${place.bgColor || '#F8FAFC'}">${place.emoji || '●'}</div>`
      }
      <div class="detail-hero">
        <div class="detail-name">${place.name}</div>
        <div class="detail-cat">${place.category} · ${place.neighborhood}</div>
      </div>

      ${place.offer?.text ? `
      <div class="detail-offer">
        <div class="detail-offer-label">Oferta GCPass</div>
        <div class="detail-offer-text">${place.offer.text}</div>
      </div>` : ''}

      ${rows.length > 0 ? `<div class="detail-info">${rows.join('')}</div>` : ''}

      ${place.description ? `<div class="detail-desc">${place.description}</div>` : ''}

      <div class="detail-actions">
        ${place.offer?.text ? `<button class="btn-descuento" id="show-descuento-btn">🎫 Mostrar mi descuento</button>` : ''}
        <button class="btn-primary-full" data-save="${place.id}" style="${isSaved ? 'background:#F8FAFC;color:#64748B;border:1px solid #EAECEF;' : ''}">
          ${isSaved ? 'Guardado' : 'Guardar lugar'}
        </button>
        ${menuBtn}
        ${place.mapsUrl ? `<a href="${place.mapsUrl}" target="_blank" style="display:block;text-align:center;padding:12px;border:1px solid #EAECEF;border-radius:12px;font-size:13px;font-weight:700;color:#475569;text-decoration:none">Cómo llegar</a>` : ''}
      </div>`;
  },

  menuViewer() {
    const place = getPlaces().find(p => p.id === state.detailPlaceId);
    if (!place || !place.menuData) {
      return `<div class="empty-state"><div class="empty-state-title">Menú no disponible</div></div>`;
    }
    const isPDF = place.menuType?.includes('pdf');
    const mediaEl = isPDF
      ? `<iframe id="menu-frame" class="menu-overlay-frame" src="about:blank"></iframe>`
      : `<img class="menu-overlay-img" src="${place.menuData}" alt="Menú de ${place.name}"/>`;
    return `
      <div class="menu-overlay">
        <div class="menu-overlay-bar">
          <span class="menu-overlay-title">Carta — ${place.name}</span>
          <span class="menu-overlay-close" id="menu-close">✕ Cerrar</span>
        </div>
        ${mediaEl}
      </div>`;
  },

  comparar() {
    const allPlaces = getPlaces();
    const places = state.compareList.map(id => allPlaces.find(p => p.id === id)).filter(Boolean);

    if (places.length < 2) {
      return `
        <div class="view">
          <div class="btn-back" id="detail-back">← Volver</div>
          <div class="empty-state">
            <div class="empty-state-title">Seleccioná al menos 2 lugares</div>
            <div class="empty-state-desc">Usá el botón "⇄ Comparar" en las tarjetas para agregar hasta 3 lugares</div>
          </div>
        </div>`;
    }

    const n        = places.length;
    const scores   = places.map(p => calcGCScore(p));
    const maxScore = Math.max(...scores);
    const CIRC     = 125.66; // 2π × 20
    const PRICE_RANK = { '< €10': 1, '€10–20': 2, '€20–40': 3, '> €40': 4 };
    const priceRanks   = places.map(p => PRICE_RANK[p.priceRange] || 5);
    const minPriceRank = Math.min(...priceRanks);
    const maxGoing     = Math.max(...places.map(p => p.stats?.going || 0));

    const rows = [
      { label: 'Popularidad', fn: p => `${p.stats?.going || 0} estudiantes`,  winner: p => (p.stats?.going || 0) === maxGoing && maxGoing > 0 },
      { label: 'Precio',      fn: p => p.priceRange || '—',                   winner: p => !!p.priceRange && (PRICE_RANK[p.priceRange] || 5) === minPriceRank },
      { label: 'Oferta GC',   fn: p => p.offer?.text ? '✓ ' + p.offer.text : '—', winner: p => !!p.offer?.text },
      { label: 'Horario',     fn: p => p.hours || '—',                        winner: () => false },
      { label: 'Barrio',      fn: p => p.neighborhood,                        winner: () => false },
      { label: 'Plan',        fn: p => ({ premium: '⭐ Premium', partner: 'Partner', free: 'Free' }[p.plan] || '—'), winner: p => p.plan === 'premium' },
    ];

    return `
      <div class="compare-fullscreen" style="--n:${n}">

        <div class="compare-top-bar">
          <span class="compare-top-bar-back" id="detail-back">← Volver</span>
          <span class="compare-top-bar-title">Comparando ${n} lugares</span>
          <span class="compare-top-bar-clear" id="clear-compare">Limpiar</span>
        </div>

        <div class="compare-places-bar" style="--n:${n}">
          <div class="compare-bar-spacer"></div>
          ${places.map((p, i) => {
            const score      = scores[i];
            const isWinner   = score === maxScore;
            const color      = isWinner ? '#10B981' : '#0066FF';
            const dashOffset = (CIRC * (1 - score / 100)).toFixed(2);
            const coverSrc   = p.imageData || p.imageUrl;
            return `
              <div class="compare-place-header${isWinner ? ' winner' : ''}">
                ${coverSrc
                  ? `<img class="compare-place-thumb" src="${coverSrc}" alt="${p.name}" onerror="this.style.display='none'"/>`
                  : `<div class="compare-place-thumb-placeholder">${p.emoji || '●'}</div>`
                }
                <div class="compare-score-mini">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#E2E8F0" stroke-width="5"/>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="${color}" stroke-width="5"
                      stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${dashOffset}"
                      stroke-linecap="round" transform="rotate(-90 22 22)"/>
                  </svg>
                  <span class="compare-score-mini-val">${score}</span>
                </div>
                <div class="compare-place-name-mini">${p.name}</div>
                ${isWinner ? '<div class="compare-winner-badge">GC ★</div>' : ''}
              </div>`;
          }).join('')}
        </div>

        <div class="compare-content">
          ${rows.map(row => `
            <div class="compare-row" style="--n:${n}">
              <div class="compare-row-label">${row.label}</div>
              ${places.map(p => {
                const isW = row.winner(p);
                return `<div class="compare-row-cell${isW ? ' winner' : ''}">${row.fn(p)}</div>`;
              }).join('')}
            </div>`).join('')}
        </div>

        <div class="compare-bottom-ctas" style="--n:${n}">
          ${places.map((p, i) => {
            const isWinner = scores[i] === maxScore;
            return `<button class="compare-cta-btn${isWinner ? ' winner' : ''}" data-compare-view="${p.id}">IR a ${p.name}</button>`;
          }).join('')}
        </div>

      </div>`;
  },

  descuento() {
    const place = getPlaces().find(p => p.id === state.detailPlaceId);
    if (!place) return `<div class="empty-state"><div class="empty-state-title">Local no encontrado</div></div>`;

    const studentId = 'GC-2026-00847';
    const code      = genVerifyCode(studentId, place.id);
    const coverSrc  = place.imageData || place.imageUrl;
    const logoSrc   = place.logoData;

    let visualContent;
    if (coverSrc) {
      visualContent = `<img src="${coverSrc}" alt="${place.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6"/>`;
    } else if (logoSrc) {
      visualContent = `<img class="descuento-visual-logo" src="${logoSrc}" alt="${place.name}"/>`;
    } else {
      visualContent = `<div class="descuento-visual-emoji">${place.emoji || '🏠'}</div>`;
    }

    return `
      <div class="descuento-overlay">
        <div class="descuento-header">
          <span class="descuento-header-logo">Global Connect</span>
          <span class="descuento-header-place">${place.name}</span>
          <span class="descuento-close" id="descuento-close">✕ Cerrar</span>
        </div>

        <div class="descuento-visual">
          ${visualContent}
        </div>

        <div class="descuento-offer">
          <div class="descuento-offer-badge">🎫 Oferta GCPass</div>
          <div class="descuento-offer-text">${place.offer?.text || ''}</div>
          <div class="descuento-offer-place">${place.name}</div>
        </div>

        <div class="descuento-student">
          <div class="descuento-avatar">LG</div>
          <div>
            <div class="descuento-student-name">Lautaro García</div>
            <div class="descuento-student-id">${studentId}</div>
            <div class="descuento-student-uni">UBA · Erasmus Roma · Feb–Jul 2026</div>
          </div>
        </div>

        <div class="descuento-code-box">
          <div class="descuento-code-label">Código de verificación</div>
          <div class="descuento-code">${code}</div>
          <div class="descuento-code-status">
            <span class="descuento-code-dot"></span>
            <span>Activo</span>
          </div>
          <div class="descuento-code-note">Código único para vos en este local</div>
        </div>

        <div class="descuento-footer">Mostrá esta pantalla al personal del local</div>
      </div>`;
  },
};

// ─── LISTENERS ────────────────────────────────────────────────────────────────
function attachListeners() {
  const content = document.getElementById('app-content');

  // Neighborhood chips
  content.querySelectorAll('[data-neighborhood]').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedNeighborhood = el.dataset.neighborhood;
      navigate(state.currentView);
    });
  });

  // Category chips
  content.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedCategory = el.dataset.category || null;
      navigate('explorar');
    });
  });

  // Search input — partial re-render
  const searchInput = content.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      const places = getPlaces().filter(p => p.active !== false);
      const saved  = getSaved();
      let filtered = places;
      if (state.selectedCategory) filtered = filtered.filter(p => p.category === state.selectedCategory);
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.neighborhood.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      }
      const countEl   = document.getElementById('result-count');
      const resultsEl = document.getElementById('search-results');
      if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}`;
      if (resultsEl) {
        resultsEl.innerHTML = filtered.length === 0
          ? `<div class="empty-state"><div class="empty-state-title">Sin resultados</div></div>`
          : `<div class="cards-grid">${filtered.map(p => renderPlaceCard(p, saved)).join('')}</div>`;
        attachSaveBtns(resultsEl);
        attachCompareBtns(resultsEl);
        attachPlaceCardListeners(resultsEl);
        attachIrBtns(resultsEl);
        // Instant show for search results (no stagger)
        resultsEl.querySelectorAll('.place-card').forEach(el => el.classList.add('card-visible'));
      }
    });
  }

  // Back button
  const detailBack = content.querySelector('#detail-back');
  if (detailBack) detailBack.addEventListener('click', () => navigate(state.prevView));

  // Menu close
  const menuClose = document.querySelector('#menu-close');
  if (menuClose) menuClose.addEventListener('click', () => navigate('detalle'));

  // Open menu
  const openMenuBtn = content.querySelector('#open-menu-btn');
  if (openMenuBtn) openMenuBtn.addEventListener('click', () => navigate('menuViewer'));

  // PDF iframe
  const menuFrame = document.querySelector('#menu-frame');
  if (menuFrame) {
    const place = getPlaces().find(p => p.id === state.detailPlaceId);
    if (place?.menuData) {
      try {
        const blob = dataURLtoBlob(place.menuData);
        menuFrame.src = URL.createObjectURL(blob);
      } catch(e) {}
    }
  }

  // Show descuento from detalle
  const showDescuentoBtn = content.querySelector('#show-descuento-btn');
  if (showDescuentoBtn) showDescuentoBtn.addEventListener('click', () => navigate('descuento'));

  // Close descuento
  const descuentoClose = document.querySelector('#descuento-close');
  if (descuentoClose) descuentoClose.addEventListener('click', () => navigate('detalle'));

  // Descuento buttons in guardados
  content.querySelectorAll('[data-descuento]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      navigate('descuento', { detailPlaceId: parseInt(el.dataset.descuento) });
    });
  });

  // Featured card tap → detail
  const featuredCard = content.querySelector('.featured-card[data-place]');
  if (featuredCard) {
    featuredCard.addEventListener('click', e => {
      if (e.target.closest('[data-save]') || _heroIsDragging || _heroDidDrag) return;
      navigate('detalle', { detailPlaceId: parseInt(featuredCard.dataset.place), prevView: state.currentView });
    });
  }

  // Place card tap → detail
  attachPlaceCardListeners(content);

  // Save / unsave
  attachSaveBtns(content);

  // Compare buttons
  attachCompareBtns(content);

  // IR → buttons
  attachIrBtns(content);

  // Floating compare bar
  const goCompare = document.querySelector('#go-compare');
  if (goCompare) goCompare.addEventListener('click', () => navigate('comparar', { prevView: state.currentView }));
  const clearCompare = document.querySelector('#clear-compare');
  if (clearCompare) {
    clearCompare.addEventListener('click', () => {
      state.compareList = [];
      navigate(state.currentView === 'comparar' ? state.prevView : state.currentView);
    });
  }

  // Compare view → detail
  content.querySelectorAll('[data-compare-view]').forEach(el => {
    el.addEventListener('click', () => {
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.compareView), prevView: 'comparar' });
    });
  });

  // Event filter tabs
  content.querySelectorAll('[data-event-filter]').forEach(el => {
    el.addEventListener('click', () => {
      state.eventFilter = el.dataset.eventFilter;
      navigate('eventos');
    });
  });

  // Attend / unattend
  content.querySelectorAll('[data-attend]').forEach(el => {
    el.addEventListener('click', () => {
      const id   = parseInt(el.dataset.attend);
      const list = getAttending();
      const idx  = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1); else list.push(id);
      setAttending(list);
      navigate('eventos');
    });
  });

  // Internal navigation (data-view)
  content.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  // Benefit items in pass → detail
  content.querySelectorAll('.benefit-item[data-place]').forEach(el => {
    el.addEventListener('click', () => {
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.place), prevView: 'pass' });
    });
  });

  // Share GCPass
  const shareBtn = content.querySelector('#share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: 'Mi GCPass', text: 'GC-2026-00847 · Lautaro García · Global Connect', url: location.href });
      } else {
        navigator.clipboard.writeText('GC-2026-00847').then(() => {
          shareBtn.textContent = 'ID copiado ✓';
          setTimeout(() => { shareBtn.textContent = 'Compartir mi GCPass'; }, 2200);
        });
      }
    });
  }

  // Hero prev/next buttons
  const heroPrev = content.querySelector('#hero-prev');
  if (heroPrev) {
    heroPrev.addEventListener('click', e => {
      e.stopPropagation();
      const trending = [...getPlaces().filter(p => p.active !== false)]
        .sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0));
      state.featuredIndex = (state.featuredIndex - 1 + trending.length) % Math.max(trending.length, 1);
      navigate('feed');
    });
  }
  const heroNext = content.querySelector('#hero-next');
  if (heroNext) {
    heroNext.addEventListener('click', e => {
      e.stopPropagation();
      const trending = [...getPlaces().filter(p => p.active !== false)]
        .sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0));
      state.featuredIndex = (state.featuredIndex + 1) % Math.max(trending.length, 1);
      navigate('feed');
    });
  }

  // Init hero swipe + card scroll animations
  initHeroSwipe();
  initCardObserver();
  attachMiniCardListeners(content);
  initSmartChips();
  initInfiniteScroll();
  initHeroParallax();
}

function attachPlaceCardListeners(container) {
  container.querySelectorAll('.place-card[data-place]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-save]') || e.target.closest('[data-compare]') || e.target.closest('[data-ir]') || e.target.closest('[data-descuento]')) return;
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.place), prevView: state.currentView });
    });
  });
}

function attachSaveBtns(container) {
  container.querySelectorAll('[data-save]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id      = parseInt(el.dataset.save);
      const list    = getSaved();
      const idx     = list.indexOf(id);
      const adding  = idx < 0;
      if (idx >= 0) list.splice(idx, 1); else list.push(id);
      setSaved(list);
      if (adding) launchConfetti(el);
      if (state.currentView !== 'explorar' || !document.querySelector('#search-input')) {
        navigate(state.currentView);
      } else {
        el.classList.toggle('saved', list.includes(id));
        updateHeader();
      }
    });
  });
}

function attachCompareBtns(container) {
  container.querySelectorAll('[data-compare]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(el.dataset.compare);
      if (state.compareList.includes(id)) {
        state.compareList = state.compareList.filter(x => x !== id);
      } else if (state.compareList.length < 3) {
        state.compareList = [...state.compareList, id];
      }
      navigate(state.currentView);
    });
  });
}

function attachIrBtns(container) {
  container.querySelectorAll('[data-ir]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.ir), prevView: state.currentView });
    });
  });
}

// ─── BOTTOM NAV (attached once) ───────────────────────────────────────────────
document.querySelectorAll('#bottom-nav .nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.view));
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
navigate('feed');
