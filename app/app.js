// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://hiokmuvqwosipgzvkqoo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4SNcRuP6ig9jFYVe4u8bpQ_BseeKIvq';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── IN-MEMORY CACHE ──────────────────────────────────────────────────────────
const _cache = {
  session:   null,
  profile:   null,
  places:    [],
  events:    [],
  saved:     new Set(),
  attending: new Set(),
};

// Temporary storage for email-verify flow
let _pendingEmail = '';

// ─── STATE ────────────────────────────────────────────────────────────────────
let _heroAutoTimer = null;
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
  onboardingSlide: 0,
};

const FEED_PAGE_SIZE = 12;

// ─── CACHE HELPERS (sync, for views) ──────────────────────────────────────────
function getSaved()     { return [..._cache.saved]; }
function getAttending() { return [..._cache.attending]; }
function getPlaces()    { return _cache.places; }
function getEvents()    { return _cache.events; }
function getUser()      {
  return _cache.profile || {
    name: '', lastName: '', initials: '?', avatarColor: '#0066FF',
    uni: '', exchange: '', studentId: 'GC-0000-00000',
    validFrom: '', validTo: '', email: '',
  };
}

// ─── DATA NORMALIZERS ─────────────────────────────────────────────────────────
function normalizePlace(p) {
  const data = (p && p.data) ? p.data : {};
  return { ...data, id: p.id, name: p.name, emoji: p.emoji, category: p.category,
    plan: p.plan, active: p.active, stats: p.stats || { views: 0, going: 0 } };
}
function normalizeEvent(e) {
  const data = (e && e.data) ? e.data : {};
  return { ...data, id: e.id, name: e.name, emoji: e.emoji, placeId: e.place_id,
    plan: e.plan, active: e.active };
}

// ─── ASYNC DATA LOADERS ───────────────────────────────────────────────────────
async function loadUserData(userId) {
  const [profileRes, savedRes, attendingRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).single(),
    sb.from('saved_places').select('place_id').eq('user_id', userId),
    sb.from('attending_events').select('event_id').eq('user_id', userId),
  ]);
  if (profileRes.data) {
    const p = profileRes.data;
    _cache.profile = {
      ...p,
      lastName:    p.last_name,
      avatarColor: p.avatar_color || '#0066FF',
      studentId:   p.student_id,
      validFrom:   p.valid_from,
      validTo:     p.valid_to,
      uni:         p.university,
      exchange:    p.exchange_period,
    };
  }
  _cache.saved     = new Set((savedRes.data     || []).map(r => r.place_id));
  _cache.attending = new Set((attendingRes.data || []).map(r => r.event_id));
}

async function loadAppData() {
  const [placesRes, eventsRes] = await Promise.all([
    sb.from('places').select('*').eq('active', true).order('id'),
    sb.from('events').select('*').eq('active', true).order('id'),
  ]);
  _cache.places = (placesRes.data || []).map(normalizePlace);
  _cache.events = (eventsRes.data || []).map(normalizeEvent);
}

async function createProfileFromMetadata(user) {
  const meta   = user.user_metadata || {};
  const name   = meta.name     || '';
  const lname  = meta.last_name || '';
  const period = EXCHANGE_PERIODS[meta.exchange_period] || EXCHANGE_PERIODS.feb26;
  const sid    = 'GC-' + new Date().getFullYear() + '-' + String(Math.floor(10000 + Math.random() * 90000));
  await sb.from('profiles').insert({
    id:              user.id,
    email:           user.email || '',
    name,
    last_name:       lname,
    initials:        ((name[0] || '') + (lname[0] || '')).toUpperCase() || name.slice(0, 2).toUpperCase(),
    avatar_color:    '#0066FF',
    university:      meta.university || '',
    exchange_period: period.tag,
    student_id:      sid,
    valid_from:      period.from,
    valid_to:        period.to,
  });
}

// ─── ASYNC MUTATIONS ──────────────────────────────────────────────────────────
async function trackPlaceView(placeId) {
  if (!_cache.session) return;
  await sb.from('place_views').insert({ user_id: _cache.session.user.id, place_id: placeId });
}

async function toggleSave(placeId) {
  if (!_cache.session) return;
  const uid = _cache.session.user.id;
  if (_cache.saved.has(placeId)) {
    _cache.saved.delete(placeId);
    await sb.from('saved_places').delete().eq('user_id', uid).eq('place_id', placeId);
  } else {
    _cache.saved.add(placeId);
    await sb.from('saved_places').insert({ user_id: uid, place_id: placeId });
  }
}

async function toggleAttend(eventId) {
  if (!_cache.session) return;
  const uid = _cache.session.user.id;
  if (_cache.attending.has(eventId)) {
    _cache.attending.delete(eventId);
    await sb.from('attending_events').delete().eq('user_id', uid).eq('event_id', eventId);
  } else {
    _cache.attending.add(eventId);
    await sb.from('attending_events').insert({ user_id: uid, event_id: eventId });
  }
}

// ─── GLOBAL LOADER ────────────────────────────────────────────────────────────
function showGlobalLoader() {
  let el = document.getElementById('gc-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gc-loader';
    el.className = 'gc-loader';
    el.innerHTML = '<div class="gc-loader-spinner"></div>';
    document.body.appendChild(el);
  }
  el.classList.add('visible');
}
function hideGlobalLoader() {
  const el = document.getElementById('gc-loader');
  if (el) el.classList.remove('visible');
}

// ─── APP INIT ─────────────────────────────────────────────────────────────────
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

async function initApp() {
  showGlobalLoader();
  try {
    const { data: { session } } = await withTimeout(sb.auth.getSession(), 6000);
    if (session) {
      _cache.session = session;
      await withTimeout(loadUserData(session.user.id), 6000);
      await withTimeout(loadAppData(), 6000);
      navigate('feed');
    } else {
      navigate('onboarding');
    }
  } catch (e) {
    console.error('initApp error:', e);
    navigate('onboarding');
  } finally {
    hideGlobalLoader();
  }
}

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    try {
      _cache.session = session;
      const { data: profile } = await sb.from('profiles').select('id').eq('id', session.user.id).single();
      if (!profile) await createProfileFromMetadata(session.user);
      await loadUserData(session.user.id);
      await loadAppData();
      navigate('feed');
    } catch (e) {
      console.error('onAuthStateChange error:', e);
    } finally {
      hideGlobalLoader();
    }
  } else if (event === 'SIGNED_OUT') {
    Object.assign(_cache, { session: null, profile: null, places: [], events: [],
      saved: new Set(), attending: new Set() });
    navigate('onboarding');
  }
});

// ─── XP / LEVEL ───────────────────────────────────────────────────────────────
function calcXP() {
  return _cache.saved.size * 5 + _cache.attending.size * 15;
}
function calcLevel(xp) {
  const levels = [
    { min: 0,   max: 49,  name: 'Turista',    icon: '🗺️',  color: '#94A3B8' },
    { min: 50,  max: 149, name: 'Explorador', icon: '🚶',  color: '#22C55E' },
    { min: 150, max: 299, name: 'Vecino',     icon: '🏘️',  color: '#3B82F6' },
    { min: 300, max: 499, name: 'Insider',    icon: '⭐',  color: '#F59E0B' },
    { min: 500, max: Infinity, name: 'Leyenda', icon: '👑', color: '#EC4899' },
  ];
  const l = levels.find(l => xp >= l.min && xp <= l.max) || levels[0];
  const isMax = l.min === 500;
  const progress = isMax ? 100 : ((xp - l.min) / (l.max + 1 - l.min)) * 100;
  return { ...l, next: isMax ? null : l.max + 1, progress: Math.min(100, Math.round(progress)) };
}
function getBadges() {
  const saved = _cache.saved.size;
  const att   = _cache.attending.size;
  const badges = [];
  if (saved >= 1)  badges.push({ icon: '💾', label: 'Primera guardia', desc: 'Guardaste tu 1er lugar' });
  if (saved >= 5)  badges.push({ icon: '❤️', label: 'Coleccionista', desc: '5 lugares guardados' });
  if (saved >= 10) badges.push({ icon: '🗂️', label: 'Curador', desc: '10 lugares guardados' });
  if (att >= 1)    badges.push({ icon: '🎉', label: 'Social', desc: 'Primer evento confirmado' });
  if (att >= 3)    badges.push({ icon: '🎊', label: 'Animador', desc: '3 eventos confirmados' });
  return badges;
}

function updateHeader() {
  const level  = calcLevel(calcXP());
  const badge  = document.getElementById('level-badge');
  if (badge) badge.textContent = level.name;
  const avatar = document.getElementById('app-avatar');
  if (avatar) avatar.textContent = getUser().initials;
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
      // Swipe right = save (optimistic cache update, fire-and-forget DB)
      const placeId = parseInt(hero.dataset.place);
      if (!_cache.saved.has(placeId)) {
        _cache.saved.add(placeId);
        if (_cache.session) {
          sb.from('saved_places').insert({ user_id: _cache.session.user.id, place_id: placeId });
        }
        updateHeader();
      }
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
    let autoFlipTimer = null;
    let hoverTimer    = null;

    function flipOpen() {
      inner.classList.add('is-flipped');
      clearTimeout(autoFlipTimer);
      autoFlipTimer = setTimeout(() => inner.classList.remove('is-flipped'), 6000);
    }
    function flipClose() {
      clearTimeout(autoFlipTimer);
      inner.classList.remove('is-flipped');
    }

    // ℹ button → flip (mobile & desktop)
    const flipTrigger = card.querySelector('[data-flip]');
    if (flipTrigger) {
      flipTrigger.addEventListener('click', e => { e.stopPropagation(); flipOpen(); });
    }

    // ✕ close button → unflip
    const flipBackBtn = card.querySelector('[data-flip-back]');
    if (flipBackBtn) {
      flipBackBtn.addEventListener('click', e => { e.stopPropagation(); flipClose(); });
    }

    if (!isTouchOnly) {
      // Desktop: hover with 400ms delay → flip; leave → unflip
      card.addEventListener('mouseenter', () => {
        hoverTimer = setTimeout(() => inner.classList.add('is-flipped'), 400);
      });
      card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        flipClose();
      });
    }

    // Tap/click on card body → navigate to detail (not on any interactive button)
    card.addEventListener('click', e => {
      if (e.target.closest('[data-save]') || e.target.closest('[data-ir]') ||
          e.target.closest('[data-flip]') || e.target.closest('[data-flip-back]')) return;
      navigate('detalle', { detailPlaceId: parseInt(card.dataset.place), prevView: state.currentView });
    });
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const MAIN_VIEWS = ['feed', 'explorar', 'eventos', 'guardados', 'pass'];

function navigate(view, params) {
  clearTimeout(_heroAutoTimer);
  if (params) Object.assign(state, params);
  state.currentView = view;
  // Show/hide app chrome for auth views
  const appEl = document.querySelector('.app');
  const isAuth = ['onboarding', 'signup', 'login', 'email-verify'].includes(view);
  if (appEl) appEl.classList.toggle('auth-mode', isAuth);
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
  if (view === 'detalle' && state.detailPlaceId) trackPlaceView(state.detailPlaceId);
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
  const desc     = (place.description || '').slice(0, 110) + ((place.description || '').length > 110 ? '…' : '');

  const imgHtml = coverSrc
    ? `<img src="${coverSrc}" alt="${place.name}" loading="lazy" onerror="this.style.display='none'"/>`
    : `<div class="mini-img-wrap-icon" style="background:${place.bgColor || '#F3F4F6'}">${place.emoji || '●'}</div>`;

  const offerText = place.offer?.text || '';

  return `
    <div class="mini-card" data-place="${place.id}" style="--cat-color:${catColor}">
      <div class="mini-card-inner">

        <!-- FRONT -->
        <div class="mini-card-front">
          <div class="mini-img-wrap">
            ${imgHtml}
            <button class="mini-flip-trigger" data-flip title="Ver info rápida">ℹ</button>
            ${isSaved ? '<div class="mini-saved-badge">❤️</div>' : ''}
          </div>
          <div class="mini-info-body">
            <div class="mini-place-name">${place.name}</div>
            <div class="mini-place-meta">
              <span class="mini-cat-chip">${place.category}</span>
              ${location ? `<span class="mini-place-loc">📍 ${location}</span>` : ''}
            </div>
            ${offerText ? `<div class="mini-offer-chip">🎫 ${offerText}</div>` : going >= 8 ? `<div class="mini-offer-chip" style="color:#F97316">🔥 Se llena rápido</div>` : ''}
          </div>
          <div class="mini-actions-bar">
            <button class="mini-save-pill${isSaved ? ' saved' : ''}" data-save="${place.id}">
              ${isSaved ? '❤️' : '🤍'} ${isSaved ? 'Guardado' : 'Guardar'}
            </button>
            <button class="mini-ir-pill" data-ir="${place.id}">Ver <span class="mini-ir-arr">→</span></button>
          </div>
        </div>

        <!-- BACK -->
        <div class="mini-card-back">
          <div class="mini-back-top">
            <span class="mini-back-title">${place.name}</span>
            <button class="mini-close-btn" data-flip-back>✕</button>
          </div>
          <div class="mini-back-content">
            <div class="mini-back-desc">${desc || place.category + ' en ' + place.neighborhood}</div>
            <div class="mini-back-rows">
              ${place.hours   ? `<div class="mini-back-row">🕐 <span>${place.hours}</span></div>`                    : ''}
              ${place.address ? `<div class="mini-back-row">📍 <span>${place.address}</span></div>`                  : ''}
              ${offerText     ? `<div class="mini-back-row offer">🎫 <span>${offerText}</span></div>`                : ''}
              ${going > 0     ? `<div class="mini-back-row going">👥 <span>${going} estudiantes van</span></div>`   : ''}
            </div>
          </div>
          <div class="mini-back-actions">
            <button class="mini-back-save-pill${isSaved ? ' saved' : ''}" data-save="${place.id}">${isSaved ? '❤️ Guardado' : '🤍 Guardar'}</button>
            <button class="mini-back-ir-pill" data-ir="${place.id}">Ir al lugar →</button>
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

// ─── AUTH EXCHANGE PERIODS ────────────────────────────────────────────────────
const EXCHANGE_PERIODS = {
  feb26:  { label: 'Feb – Jul 2026',       from: 'Feb',      to: 'Jul 2026',  tag: 'Erasmus Roma 2026' },
  sep26:  { label: 'Sep 2026 – Feb 2027',  from: 'Sep 2026', to: 'Feb 2027', tag: 'Erasmus Roma 2026–27' },
  feb27:  { label: 'Feb – Jul 2027',       from: 'Feb',      to: 'Jul 2027',  tag: 'Erasmus Roma 2027' },
  other:  { label: 'Otro período',          from: '—',        to: '—',         tag: 'Intercambio Roma' },
};

// ─── VIEWS ────────────────────────────────────────────────────────────────────
const VIEWS = {

  onboarding() {
    const slide = state.onboardingSlide;
    const SLIDES = [
      {
        bg: 'linear-gradient(160deg,#003D99 0%,#0066FF 55%,#4F46E5 100%)',
        emoji: '🌍',
        title: 'Roma te está esperando',
        desc: 'Descubrí los mejores restaurantes, bares y actividades pensados para estudiantes de intercambio.',
      },
      {
        bg: 'linear-gradient(160deg,#5B21B6 0%,#7C3AED 55%,#EC4899 100%)',
        emoji: '🎫',
        title: 'Descuentos solo para vos',
        desc: 'Mostrá tu GCPass en locales partner y ahorrá en cada visita con tu carnet de estudiante.',
      },
      {
        bg: 'linear-gradient(160deg,#B45309 0%,#F97316 55%,#FBBF24 100%)',
        emoji: '🏆',
        title: 'Ganá XP explorando',
        desc: 'Guardá lugares, anotate a eventos y subí de nivel: Rookie → Explorer → Globetrotter.',
      },
    ];
    const s = SLIDES[slide];
    return `
      <div class="onb-view" style="background:${s.bg}">
        ${slide < SLIDES.length - 1 ? '<span class="onb-skip" id="onb-skip">Saltar</span>' : ''}
        <div class="onb-content">
          <span class="onb-emoji">${s.emoji}</span>
          <div class="onb-title">${s.title}</div>
          <div class="onb-desc">${s.desc}</div>
        </div>
        <div class="onb-bottom">
          <div class="onb-dots">
            ${SLIDES.map((_, i) => `<div class="onb-dot${i === slide ? ' active' : ''}"></div>`).join('')}
          </div>
          ${slide < SLIDES.length - 1
            ? `<button class="onb-btn" id="onb-next">Siguiente →</button>`
            : `<button class="onb-btn" id="onb-start">Empezar gratis →</button>`
          }
          <div class="onb-login">¿Ya tenés cuenta? <span id="onb-login-link">Iniciá sesión</span></div>
        </div>
      </div>`;
  },

  signup() {
    const partnerCount = getPlaces().filter(p => p.plan !== 'free' && p.active !== false).length;
    return `
      <div class="auth-view">
        <div class="auth-topbar">
          <div class="auth-topbar-logo">
            <div class="auth-topbar-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <span class="auth-topbar-logo-text">Global Connect</span>
          </div>
          <span class="auth-back-btn" id="auth-back">← Volver</span>
        </div>
        <div class="auth-body">
          <div class="auth-value-banner">
            <span class="auth-value-icon">🎫</span>
            <div class="auth-value-text"><strong>¡Es gratis!</strong> Registrate y accedé a descuentos exclusivos en ${partnerCount || '10'}+ locales en Roma.</div>
          </div>
          <div class="auth-heading">Creá tu cuenta</div>
          <div class="auth-subhead">Solo toma un minuto. Necesitás un email universitario autorizado.</div>
          <div class="auth-field">
            <label>Nombre *</label>
            <input type="text" id="f-name" placeholder="Tu nombre" autocomplete="given-name"/>
            <div class="auth-error" id="err-name">Ingresá tu nombre</div>
          </div>
          <div class="auth-field">
            <label>Apellido</label>
            <input type="text" id="f-lastname" placeholder="Tu apellido" autocomplete="family-name"/>
          </div>
          <div class="auth-field">
            <label>Universidad de origen *</label>
            <input type="text" id="f-uni" placeholder="Ej: UBA, UNC, UAM…" autocomplete="organization"/>
            <div class="auth-error" id="err-uni">Ingresá tu universidad</div>
          </div>
          <div class="auth-field">
            <label>Email *</label>
            <input type="email" id="f-email" placeholder="tu@email.com" autocomplete="email"/>
            <div class="auth-error" id="err-email">Ingresá un email válido</div>
          </div>
          <div class="auth-field">
            <label>Contraseña * <span style="font-size:11px;font-weight:400;color:#94A3B8">Mínimo 8 caracteres</span></label>
            <input type="password" id="f-password" placeholder="Mínimo 8 caracteres" autocomplete="new-password"/>
            <div class="auth-error" id="err-password">Mínimo 8 caracteres</div>
          </div>
          <div class="auth-field">
            <label>Período de intercambio</label>
            <select id="f-period">
              ${Object.entries(EXCHANGE_PERIODS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}
            </select>
          </div>
          <button class="auth-submit" id="signup-submit">Crear mi cuenta →</button>
          <div class="auth-alt">¿Ya tenés cuenta? <span id="go-login">Iniciá sesión</span></div>
        </div>
      </div>`;
  },

  login() {
    return `
      <div class="auth-view">
        <div class="auth-topbar">
          <div class="auth-topbar-logo">
            <div class="auth-topbar-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <span class="auth-topbar-logo-text">Global Connect</span>
          </div>
          <span class="auth-back-btn" id="auth-back">← Volver</span>
        </div>
        <div class="auth-body">
          <div class="auth-heading">Bienvenido de vuelta 👋</div>
          <div class="auth-subhead">Ingresá con el email con el que te registraste.</div>
          <div class="auth-field">
            <label>Email</label>
            <input type="email" id="l-email" placeholder="tu@email.com" autocomplete="email"/>
          </div>
          <div class="auth-field">
            <label>Contraseña</label>
            <input type="password" id="l-password" placeholder="Tu contraseña" autocomplete="current-password"/>
            <div class="auth-error" id="err-login">Email o contraseña incorrectos.</div>
          </div>
          <button class="auth-submit" id="login-submit">Entrar →</button>
          <div class="auth-alt">¿No tenés cuenta? <span id="go-signup">Registrate gratis</span></div>
        </div>
      </div>`;
  },

  'email-verify'() {
    return `
      <div class="auth-view">
        <div class="auth-topbar">
          <div class="auth-topbar-logo">
            <div class="auth-topbar-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <span class="auth-topbar-logo-text">Global Connect</span>
          </div>
        </div>
        <div class="auth-body email-verify-body">
          <div class="verify-icon">📬</div>
          <div class="auth-heading">Revisá tu email</div>
          <div class="auth-subhead">Enviamos un link de verificación a <strong>${_pendingEmail}</strong>. Hacé click en él para activar tu cuenta.</div>
          <button class="auth-submit" id="resend-verify-btn" style="margin-top:24px">Reenviar email</button>
          <div class="auth-alt" style="margin-top:16px">¿Ya verificaste? <span id="go-login">Iniciá sesión</span></div>
          <div class="auth-error" id="err-verify" style="text-align:center;margin-top:8px"></div>
        </div>
      </div>`;
  },

  feed() {
    state.feedPage = 0;
    const allPlaces = getPlaces().filter(p => p.active !== false);
    const saved  = getSaved();
    const attending = getAttending();

    // Category filter
    const cats = ['Todos', ...new Set(allPlaces.map(p => p.category).filter(Boolean))];
    const catFilter = state.selectedCategory || 'Todos';
    const nbFilter  = state.selectedNeighborhood || 'Todos';

    let filtered = allPlaces;
    if (catFilter !== 'Todos') filtered = filtered.filter(p => p.category === catFilter);
    if (nbFilter  !== 'Todos') filtered = filtered.filter(p => p.neighborhood === nbFilter);

    const xp    = calcXP();
    const level = calcLevel(xp);
    const user  = getUser();

    // Upcoming events (next 30 days)
    const today = new Date().toISOString().slice(0,10);
    const upcomingEvents = getEvents()
      .filter(e => e.active !== false && e.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    const trending = [...allPlaces].sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0));
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

    // Get hours of day for greeting
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';

    return `
      <div class="view">

        <!-- GREETING + XP -->
        <div class="feed-greeting">
          <div class="feed-greeting-top">
            <div>
              <div class="feed-greeting-name">${greeting}, ${user.name || 'estudiante'}!</div>
              <div class="feed-greeting-sub">${level.icon} ${level.name} · ${xp} XP</div>
            </div>
            <div class="feed-level-badge" style="background:${level.color}20;border-color:${level.color}40;color:${level.color}">${level.icon} ${level.name}</div>
          </div>
          <div class="xp-bar-track">
            <div class="xp-bar-fill" style="width:${level.progress}%;background:${level.color}"></div>
          </div>
          ${level.next ? `<div class="xp-next-label">${level.next - xp} XP para ${calcLevel(level.next).name}</div>` : `<div class="xp-next-label">👑 Nivel máximo</div>`}
        </div>

        <!-- EVENTS STRIP (Instagram stories style) -->
        ${upcomingEvents.length > 0 ? `
        <div class="events-strip-wrap">
          <div class="events-strip-header">
            <span class="events-strip-title">Próximos eventos</span>
            <span class="events-strip-see-all" data-view="eventos">Ver todos →</span>
          </div>
          <div class="events-strip" id="events-strip">
            ${upcomingEvents.map(ev => {
              const isAtt = attending.includes(ev.id);
              const evDate = ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'}) : '';
              const place  = allPlaces.find(p => p.id === ev.placeId);
              return `
              <div class="event-story" data-attend-story="${ev.id}">
                <div class="event-story-bubble${isAtt ? ' attending' : ''}" style="background:${place ? place.bgColor || '#EFF6FF' : '#EFF6FF'}">
                  <span class="event-story-emoji">${ev.emoji || place?.emoji || '🎉'}</span>
                  ${isAtt ? '<div class="event-story-check">✓</div>' : ''}
                </div>
                <div class="event-story-name">${ev.name.slice(0,14)}</div>
                <div class="event-story-date">${evDate}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- FEATURED HERO CARD -->
        ${featured ? `
        <div class="featured-wrap">
          <div class="hero-card-area">
            ${trending.length > 1 ? `<button class="hero-nav-btn hero-prev" id="hero-prev">&#8249;</button>` : ''}
            <div class="featured-card" data-place="${featured.id}" style="--cat-color:${catColor}">
              ${featuredCover
                ? `<img class="featured-card-img" src="${featuredCover}" alt="${featured.name}" onerror="this.style.display='none'"/>`
                : `<div class="featured-card-icon-bg" style="background:${featured.bgColor || '#DBEAFE'}">${featured.emoji || '🏠'}</div>`
              }
              <div class="featured-card-overlay"></div>
              <div class="featured-card-info">
                <div class="featured-card-chips">
                  <span class="featured-chip">${featured.neighborhood}</span>
                  ${featured.plan === 'premium' ? '<span class="featured-chip chip-premium">★ Premium</span>' : ''}
                </div>
                <div class="featured-card-name">${featured.name}</div>
                <div class="featured-card-sub">${featured.category}</div>
                ${going > 0 ? `
                <div class="featured-card-social">
                  ${renderAvatarStack(going, featured.id)}
                  <span class="featured-card-social-text">${going} van hoy</span>
                </div>` : ''}
                <button class="featured-cta-btn" data-ir="${featured.id}">
                  ${featured.offer?.text ? `🎫 ${featured.offer.text.slice(0,28)}` : 'Explorar →'}
                </button>
              </div>
              ${(featured.stats?.going || 0) >= 5 ? '<span class="featured-card-badge">🔥 Popular</span>' : ''}
              <button class="featured-card-save${saved.includes(featured.id) ? ' saved' : ''}" data-save="${featured.id}">
                ${saved.includes(featured.id) ? '♥' : '♡'}
              </button>
            </div>
            ${trending.length > 1 ? `<button class="hero-nav-btn hero-next" id="hero-next">&#8250;</button>` : ''}
          </div>
          ${dotsHtml}
        </div>` : ''}

        <!-- CATEGORY FILTER CHIPS -->
        <div class="chips-smart-wrap">
          <div class="chips-row">
            ${cats.map(c => {
              const isActive = c === catFilter;
              const color = c === 'Todos' ? '#0F172A' : getCatColor(c);
              return `<div class="chip${isActive ? ' active' : ''}" data-category="${c}" style="${isActive ? `--chip-color:${color}` : ''}">${c === 'Todos' ? '✦ Todos' : c}</div>`;
            }).join('')}
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
    const benefitPlaces = getPlaces().filter(p => p.plan !== 'free' && p.active !== false);
    const user   = getUser();
    const xp     = calcXP();
    const level  = calcLevel(xp);
    const badges = getBadges();

    return `
      <div class="view">

        <!-- PASS CARD -->
        <div class="pass-card" style="--pass-level-color:${level.color}">
          <div class="pass-card-shine"></div>
          <div class="pass-header">
            <div class="pass-header-left">
              <div class="pass-gc-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke:rgba(255,255,255,.9);width:16px;height:16px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <span class="pass-brand">Global Connect</span>
            </div>
            <span class="pass-level-chip">${level.icon} ${level.name}</span>
          </div>

          <div class="pass-avatar-row">
            <div class="pass-avatar" style="background:${user.avatarColor || '#0066FF'}">${user.initials || '?'}</div>
            <div class="pass-avatar-info">
              <div class="pass-name">${user.name} ${user.lastName}</div>
              <div class="pass-uni">${user.uni}${user.exchange ? ' · ' + user.exchange : ''}</div>
            </div>
          </div>

          <div class="pass-xp-section">
            <div class="pass-xp-row">
              <span class="pass-xp-label">${xp} XP</span>
              <span class="pass-xp-next">${level.next ? level.next + ' XP →' : '👑 Máximo'}</span>
            </div>
            <div class="pass-xp-track">
              <div class="pass-xp-fill" style="width:${level.progress}%"></div>
            </div>
          </div>

          <div class="pass-id-row">
            <div class="pass-id-block">
              <div class="pass-id-label">Student ID</div>
              <div class="pass-id">${user.studentId}</div>
            </div>
            <div class="pass-id-block" style="text-align:right">
              <div class="pass-id-label">Válido hasta</div>
              <div class="pass-id">${user.validTo || '—'}</div>
            </div>
          </div>
        </div>

        <!-- BADGES -->
        ${badges.length > 0 ? `
        <div class="section-head">
          <span class="section-head-title">Logros</span>
          <span class="section-head-sub">${badges.length} desbloqueado${badges.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="badges-scroll">
          ${badges.map(b => `
            <div class="badge-pill">
              <span class="badge-pill-icon">${b.icon}</span>
              <div>
                <div class="badge-pill-name">${b.label}</div>
                <div class="badge-pill-desc">${b.desc}</div>
              </div>
            </div>`).join('')}
          <div class="badge-pill badge-pill-locked">
            <span class="badge-pill-icon" style="filter:grayscale(1)">🗂️</span>
            <div>
              <div class="badge-pill-name" style="color:#94A3B8">Curador</div>
              <div class="badge-pill-desc">Guardá 10 lugares</div>
            </div>
          </div>
        </div>` : `
        <div class="badges-empty">
          <div class="badges-empty-icon">🏅</div>
          <div class="badges-empty-title">Empezá a ganar logros</div>
          <div class="badges-empty-desc">Guardá lugares y confirmá eventos para desbloquear badges</div>
        </div>`}

        <!-- XP SOURCE INFO -->
        <div class="xp-how-works">
          <div class="xp-how-title">¿Cómo ganar XP?</div>
          <div class="xp-how-row"><span>💾</span><span>Guardar un lugar</span><span class="xp-how-pts">+5 XP</span></div>
          <div class="xp-how-row"><span>✅</span><span>Confirmar asistencia a un evento</span><span class="xp-how-pts">+15 XP</span></div>
        </div>

        <!-- BENEFITS -->
        ${benefitPlaces.length > 0 ? `
        <div class="section-head">
          <span class="section-head-title">Beneficios GCPass</span>
          <span class="section-head-sub">${benefitPlaces.length} lugar${benefitPlaces.length !== 1 ? 'es' : ''}</span>
        </div>
        <div class="benefits-list">
          ${benefitPlaces.map(p => `
            <div class="benefit-item" data-place="${p.id}">
              <div class="benefit-icon" style="background:${p.bgColor || '#F8FAFC'}">${p.emoji || '●'}</div>
              <div class="benefit-body">
                <div class="benefit-name">${p.name}</div>
                ${p.offer?.text ? `<div class="benefit-offer">🎫 ${p.offer.text}</div>` : ''}
              </div>
              <div class="benefit-arrow">›</div>
            </div>`).join('')}
        </div>` : ''}

        <div style="padding:0 16px 24px">
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

    const user      = getUser();
    const studentId = user.studentId;
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
          <div class="descuento-avatar">${user.initials}</div>
          <div>
            <div class="descuento-student-name">${user.name} ${user.lastName}</div>
            <div class="descuento-student-id">${studentId}</div>
            <div class="descuento-student-uni">${user.uni} · ${user.exchange}</div>
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

  perfil() {
    const user  = getUser();
    const xp    = calcXP();
    const level = calcLevel(xp);
    const saved = getSaved().length;
    const att   = getAttending().length;
    return `
      <div class="view perfil-view">
        <div class="perfil-hero" style="background:${user.avatarColor || '#0066FF'}">
          <div class="perfil-avatar-lg">${user.initials}</div>
          <div class="perfil-name">${user.name} ${user.lastName}</div>
          <div class="perfil-uni">${user.uni} · ${user.exchange}</div>
        </div>

        <div class="perfil-id-strip">
          <span class="perfil-id-label">Student ID</span>
          <span class="perfil-id-value">${user.studentId}</span>
        </div>

        <div class="perfil-stats-row">
          <div class="perfil-stat">
            <div class="perfil-stat-val">${saved}</div>
            <div class="perfil-stat-lbl">Guardados</div>
          </div>
          <div class="perfil-stat-divider"></div>
          <div class="perfil-stat">
            <div class="perfil-stat-val">${att}</div>
            <div class="perfil-stat-lbl">Eventos</div>
          </div>
          <div class="perfil-stat-divider"></div>
          <div class="perfil-stat">
            <div class="perfil-stat-val">${xp}</div>
            <div class="perfil-stat-lbl">XP</div>
          </div>
        </div>

        <div class="perfil-level-box">
          <div class="perfil-level-row">
            <span class="perfil-level-name">⭐ ${level.name}</span>
            <span class="perfil-level-xp">${xp} XP${level.next ? ' · próximo: ' + level.next + ' XP' : ' · Máximo nivel'}</span>
          </div>
          <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${level.progress}%"></div></div>
        </div>

        <div class="perfil-section">
          <div class="perfil-info-row">
            <span class="perfil-info-icon">✉️</span>
            <span class="perfil-info-text">${user.email || 'Sin email registrado'}</span>
          </div>
          <div class="perfil-info-row">
            <span class="perfil-info-icon">📅</span>
            <span class="perfil-info-text">Válido ${user.validFrom} – ${user.validTo}</span>
          </div>
        </div>

        <div class="perfil-actions">
          <button class="btn-logout" id="logout-btn">Cerrar sesión</button>
        </div>
      </div>`;
  },
};

// ─── LISTENERS ────────────────────────────────────────────────────────────────
function attachListeners() {
  const content = document.getElementById('app-content');

  // ── Logout ────────────────────────────────────────────────────────────────
  const logoutBtn = content.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      // onAuthStateChange handles navigate('onboarding')
    });
  }

  // ── Onboarding navigation ──────────────────────────────────────────────────
  const onbNext = content.querySelector('#onb-next');
  if (onbNext) onbNext.addEventListener('click', () => { state.onboardingSlide++; navigate('onboarding'); });

  const onbStart = content.querySelector('#onb-start');
  if (onbStart) onbStart.addEventListener('click', () => { state.onboardingSlide = 0; navigate('signup'); });

  const onbSkip = content.querySelector('#onb-skip');
  if (onbSkip) onbSkip.addEventListener('click', () => { state.onboardingSlide = 0; navigate('signup'); });

  const onbLoginLink = content.querySelector('#onb-login-link');
  if (onbLoginLink) onbLoginLink.addEventListener('click', () => navigate('login'));

  // ── Auth back + cross-links ────────────────────────────────────────────────
  const authBack = content.querySelector('#auth-back');
  if (authBack) authBack.addEventListener('click', () => navigate('onboarding'));

  const goLogin = content.querySelector('#go-login');
  if (goLogin) goLogin.addEventListener('click', () => navigate('login'));

  const goSignup = content.querySelector('#go-signup');
  if (goSignup) goSignup.addEventListener('click', () => navigate('signup'));

  // ── Email verify ──────────────────────────────────────────────────────────
  const resendVerifyBtn = content.querySelector('#resend-verify-btn');
  if (resendVerifyBtn) {
    resendVerifyBtn.addEventListener('click', async () => {
      resendVerifyBtn.disabled = true;
      resendVerifyBtn.textContent = 'Enviando...';
      const { error } = await sb.auth.resend({ type: 'signup', email: _pendingEmail });
      if (error) {
        const errEl = document.getElementById('err-verify');
        if (errEl) { errEl.textContent = error.message; errEl.classList.add('visible'); }
        resendVerifyBtn.disabled = false;
        resendVerifyBtn.textContent = 'Reenviar email';
      } else {
        resendVerifyBtn.textContent = 'Email reenviado ✓';
      }
    });
  }

  // ── Sign up form ───────────────────────────────────────────────────────────
  const signupSubmit = content.querySelector('#signup-submit');
  if (signupSubmit) {
    signupSubmit.addEventListener('click', async () => {
      const name     = (document.getElementById('f-name')?.value     || '').trim();
      const lastName = (document.getElementById('f-lastname')?.value || '').trim();
      const uni      = (document.getElementById('f-uni')?.value      || '').trim();
      const email    = (document.getElementById('f-email')?.value    || '').trim();
      const password = (document.getElementById('f-password')?.value || '').trim();
      const period   = document.getElementById('f-period')?.value || 'feb26';

      let valid = true;
      const setErr = (id, show, msg) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('visible', show);
        if (msg) el.textContent = msg;
      };
      if (!name)                          { setErr('err-name', true);    valid = false; } else setErr('err-name', false);
      if (!uni)                           { setErr('err-uni', true);     valid = false; } else setErr('err-uni', false);
      if (!email || !email.includes('@')) { setErr('err-email', true, 'Ingresá un email válido'); valid = false; } else setErr('err-email', false);
      if (!password || password.length < 8) { setErr('err-password', true, 'Mínimo 8 caracteres'); valid = false; } else setErr('err-password', false);
      if (!valid) return;

      // Domain validation
      const domain = email.split('@')[1];
      const { data: domainRow } = await sb.from('allowed_domains').select('university_name').eq('domain', domain).single();
      if (!domainRow) {
        setErr('err-email', true, 'El dominio de tu email no está autorizado. Contactá al administrador.');
        return;
      }

      signupSubmit.disabled = true;
      signupSubmit.textContent = 'Creando cuenta...';

      const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { name, last_name: lastName, university: uni, exchange_period: period } },
      });

      signupSubmit.disabled = false;
      signupSubmit.textContent = 'Crear mi cuenta →';

      if (error) {
        setErr('err-email', true, error.message);
        return;
      }

      _pendingEmail = email;
      navigate('email-verify');
    });
  }

  // ── Log in form ────────────────────────────────────────────────────────────
  const loginSubmit = content.querySelector('#login-submit');
  if (loginSubmit) {
    loginSubmit.addEventListener('click', async () => {
      const email    = (document.getElementById('l-email')?.value    || '').trim();
      const password = (document.getElementById('l-password')?.value || '').trim();
      const errEl    = document.getElementById('err-login');

      if (!email || !email.includes('@') || !password) {
        if (errEl) { errEl.textContent = 'Ingresá tu email y contraseña.'; errEl.classList.add('visible'); }
        return;
      }

      loginSubmit.disabled = true;
      loginSubmit.textContent = 'Entrando...';

      const { error } = await sb.auth.signInWithPassword({ email, password });

      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Entrar →';

      if (error) {
        if (errEl) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            _pendingEmail = email;
            errEl.textContent = 'Verificá tu email primero antes de ingresar.';
          } else {
            errEl.textContent = 'Email o contraseña incorrectos.';
          }
          errEl.classList.add('visible');
        }
      }
      // On success → onAuthStateChange fires and navigates to 'feed'
    });
  }

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
      if (e.target.closest('[data-save]') || e.target.closest('[data-ir]') || _heroIsDragging || _heroDidDrag) return;
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
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.attend);
      await toggleAttend(id);
      navigate('eventos');
    });
  });

  // Events story strip — tap to attend/unattend from feed
  content.querySelectorAll('[data-attend-story]').forEach(el => {
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.attendStory);
      await toggleAttend(id);
      navigate('feed');
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
      const u = getUser();
      if (navigator.share) {
        navigator.share({ title: 'Mi GCPass', text: `${u.studentId} · ${u.name} ${u.lastName} · Global Connect`, url: location.href });
      } else {
        navigator.clipboard.writeText(u.studentId).then(() => {
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
  initHeroAutoAdvance();
}

function initHeroAutoAdvance() {
  clearTimeout(_heroAutoTimer);
  const heroArea = document.querySelector('.hero-card-area');
  if (!heroArea) return;
  const trending = [...getPlaces().filter(p => p.active !== false)]
    .sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0));
  if (trending.length <= 1) return;
  _heroAutoTimer = setTimeout(() => {
    state.featuredIndex = (state.featuredIndex + 1) % trending.length;
    navigate('feed');
  }, 5000);
  heroArea.addEventListener('mouseenter', () => clearTimeout(_heroAutoTimer), { once: true });
  heroArea.addEventListener('touchstart', () => clearTimeout(_heroAutoTimer), { once: true, passive: true });
}

function attachPlaceCardListeners(container) {
  container.querySelectorAll('.place-card[data-place]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-save]') || e.target.closest('[data-compare]') || e.target.closest('[data-ir]') || e.target.closest('[data-descuento]')) return;
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.place), prevView: state.currentView });
    });
  });
}

// Update mini card save state in-place (no full re-render, preserves scroll)
function updateMiniCardSaved(card, isSaved) {
  const savePill = card.querySelector('.mini-save-pill');
  if (savePill) {
    savePill.classList.toggle('saved', isSaved);
    savePill.innerHTML = `${isSaved ? '❤️' : '🤍'} ${isSaved ? 'Guardado' : 'Guardar'}`;
  }
  const backSavePill = card.querySelector('.mini-back-save-pill');
  if (backSavePill) {
    backSavePill.classList.toggle('saved', isSaved);
    backSavePill.textContent = isSaved ? '❤️ Guardado' : '🤍 Guardar';
  }
  const imgWrap = card.querySelector('.mini-img-wrap');
  if (imgWrap) {
    let badge = imgWrap.querySelector('.mini-saved-badge');
    if (isSaved && !badge) {
      badge = document.createElement('div');
      badge.className = 'mini-saved-badge';
      badge.textContent = '❤️';
      imgWrap.appendChild(badge);
    } else if (!isSaved && badge) {
      badge.remove();
    }
  }
}

function attachSaveBtns(container) {
  container.querySelectorAll('[data-save]').forEach(el => {
    el.addEventListener('click', async e => {
      e.stopPropagation();
      const id     = parseInt(el.dataset.save);
      const adding = !_cache.saved.has(id);
      await toggleSave(id);
      if (adding) launchConfetti(el);
      // Mini cards: update in-place to preserve scroll position
      const miniCard = el.closest('.mini-card');
      if (miniCard) {
        updateMiniCardSaved(miniCard, _cache.saved.has(id));
        updateHeader();
        return;
      }
      if (state.currentView !== 'explorar' || !document.querySelector('#search-input')) {
        navigate(state.currentView);
      } else {
        el.classList.toggle('saved', _cache.saved.has(id));
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

// ─── BOTTOM NAV + AVATAR (attached once) ──────────────────────────────────────
document.querySelectorAll('#bottom-nav .nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.view));
});
document.getElementById('app-avatar').addEventListener('click', () => navigate('perfil'));

// ─── INIT ─────────────────────────────────────────────────────────────────────
initApp();
