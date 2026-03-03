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
};

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

// ─── GC SCORE ─────────────────────────────────────────────────────────────────
function calcGCScore(p) {
  let s = 0;
  s += Math.min((p.stats?.going || 0) / 20 * 40, 40);
  s += ({ '< €10': 25, '€10–20': 18, '€20–40': 10, '> €40': 5 }[p.priceRange] ?? 12);
  s += p.offer?.text ? 20 : 0;
  s += ({ premium: 15, partner: 10, free: 5 }[p.plan] ?? 5);
  return Math.round(Math.min(s, 100));
}

// ─── VERIFY CODE (deterministic per student+place) ────────────────────────────
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

// ─── DATA URL → BLOB (for PDF iframe) ─────────────────────────────────────────
function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return new Blob([buf], { type: mime });
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

  let imageHtml;
  if (coverSrc) {
    imageHtml = `<img class="place-card-img" src="${coverSrc}" alt="${place.name}" onerror="this.style.display='none'"/>`;
  } else if (logoSrc) {
    imageHtml = `<div class="place-card-icon-bg" style="background:${place.bgColor || '#F8FAFC'}"><img class="place-card-logo" src="${logoSrc}" alt="${place.name}"/></div>`;
  } else {
    imageHtml = `<div class="place-card-icon-bg" style="background:${place.bgColor || '#F8FAFC'}">${place.emoji || '●'}</div>`;
  }

  return `
    <div class="place-card" data-place="${place.id}">
      <div class="place-card-media">${imageHtml}</div>
      <div class="place-card-body">
        <div class="place-card-row">
          <div>
            <div class="place-name">${place.name}</div>
            <div class="place-sub">${place.category} · ${place.neighborhood}</div>
          </div>
          <div class="place-card-actions">
            <button class="compare-btn${isCompare ? ' active' : ''}" data-compare="${place.id}" title="Comparar">⇄</button>
            <button class="save-btn${isSaved ? ' saved' : ''}" data-save="${place.id}" title="${isSaved ? 'Quitar' : 'Guardar'}">♥</button>
          </div>
        </div>
        ${place.offer?.text ? `<div class="place-offer">${place.offer.text}</div>` : ''}
        ${going > 0 ? `<div class="place-stats">${going >= 15 ? '<span class="badge-popular">Popular</span>' : ''} ${going} estudiantes estuvieron</div>` : ''}
        ${showDescuentoBtn && place.offer?.text ? `<button class="btn-descuento-sm" data-descuento="${place.id}">🎫 Mi descuento</button>` : ''}
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
    const places = getPlaces().filter(p => p.active !== false);
    const saved  = getSaved();
    const neighborhoods = ['Todos', ...new Set(places.map(p => p.neighborhood))];
    const filtered = state.selectedNeighborhood === 'Todos'
      ? places
      : places.filter(p => p.neighborhood === state.selectedNeighborhood);

    const xp    = calcXP();
    const level = calcLevel(xp);

    const featured = places.length > 0
      ? [...places].sort((a, b) => (b.stats?.going || 0) - (a.stats?.going || 0))[0]
      : null;

    const featuredCover = featured ? (featured.imageData || featured.imageUrl) : null;

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
        <div class="featured-wrap">
          <div class="featured-label">⭐ Trending</div>
          <div class="featured-card" data-place="${featured.id}">
            ${featuredCover
              ? `<img class="featured-card-img" src="${featuredCover}" alt="${featured.name}" onerror="this.style.display='none'"/>`
              : `<div class="featured-card-icon-bg" style="background:${featured.bgColor || '#DBEAFE'}">${featured.emoji || '🏠'}</div>`
            }
            <div class="featured-card-overlay"></div>
            <div class="featured-card-info">
              <div class="featured-card-name">${featured.name}</div>
              <div class="featured-card-sub">${featured.category} · ${featured.neighborhood}</div>
            </div>
            ${(featured.stats?.going || 0) >= 15 ? '<span class="featured-card-badge">Popular</span>' : ''}
            <button class="featured-card-save${saved.includes(featured.id) ? ' saved' : ''}" data-save="${featured.id}">♥</button>
          </div>
        </div>` : ''}

        <div class="section-head">
          <span class="section-head-title">Lugares en Roma${state.selectedNeighborhood !== 'Todos' ? ' · ' + state.selectedNeighborhood : ''}</span>
          <span class="section-head-sub">${places.length} registrado${places.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="chips-row">
          ${neighborhoods.map(n => `
            <div class="chip${n === state.selectedNeighborhood ? ' active' : ''}" data-neighborhood="${n}">${n}</div>
          `).join('')}
        </div>

        ${renderCompareBar()}

        ${filtered.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-title">${places.length === 0 ? 'Sin lugares aún' : 'Sin lugares en ' + state.selectedNeighborhood}</div>
              <div class="empty-state-desc">${places.length === 0 ? 'Pronto habrá lugares disponibles.' : 'Probá con otro barrio.'}</div>
             </div>`
          : `<div class="cards-grid">${filtered.map(p => renderPlaceCard(p, saved)).join('')}</div>`
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
    const saved   = getSaved();
    const isSaved = saved.includes(place.id);
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
            <div class="empty-state-desc">Usá el botón ⇄ en las tarjetas para agregar lugares a la comparación</div>
          </div>
        </div>`;
    }

    const scores = places.map(p => calcGCScore(p));
    const maxScore = Math.max(...scores);
    const CIRC = 175.93; // 2π×28
    const PRICE_RANK = { '< €10': 1, '€10–20': 2, '€20–40': 3, '> €40': 4 };
    const priceRanks = places.map(p => PRICE_RANK[p.priceRange] || 5);
    const minPriceRank = Math.min(...priceRanks);
    const maxGoing = Math.max(...places.map(p => p.stats?.going || 0));

    const rows = [
      {
        label: 'Popularidad',
        fn: p => `${p.stats?.going || 0} estudiantes`,
        winner: p => (p.stats?.going || 0) === maxGoing && maxGoing > 0,
      },
      {
        label: 'Precio',
        fn: p => p.priceRange || '—',
        winner: p => !!p.priceRange && (PRICE_RANK[p.priceRange] || 5) === minPriceRank,
      },
      {
        label: 'Oferta GC',
        fn: p => p.offer?.text || '—',
        winner: p => !!p.offer?.text,
      },
      {
        label: 'Horario',
        fn: p => p.hours || '—',
        winner: () => false,
      },
      {
        label: 'Barrio',
        fn: p => p.neighborhood,
        winner: () => false,
      },
    ];

    return `
      <div class="view">
        <div class="btn-back" id="detail-back">← Volver</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#fff">
          <span style="font-size:14px;font-weight:900;color:#0F172A">Comparando ${places.length} lugares</span>
          <span id="clear-compare" style="font-size:12px;font-weight:600;color:#94A3B8;cursor:pointer">Limpiar</span>
        </div>

        <div class="compare-scores-row">
          ${places.map((p, i) => {
            const score = scores[i];
            const isWinner = score === maxScore;
            const color = isWinner ? '#22C55E' : '#1D4ED8';
            const dashOffset = (CIRC * (1 - score / 100)).toFixed(2);
            return `
              <div class="compare-score-card${isWinner ? ' winner' : ''}">
                <div class="compare-score-ring">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="28" fill="none" stroke="#E2E8F0" stroke-width="8"/>
                    <circle cx="36" cy="36" r="28" fill="none" stroke="${color}" stroke-width="8"
                      stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${dashOffset}"
                      stroke-linecap="round" transform="rotate(-90 36 36)"/>
                  </svg>
                  <span class="compare-score-ring-val">${score}</span>
                </div>
                <div class="compare-score-name">${p.name}</div>
                ${isWinner ? '<div class="gc-recommend">GC Recomienda</div>' : ''}
              </div>`;
          }).join('')}
        </div>

        <div class="compare-wrap">
          <div style="border:1px solid #EAECEF;border-radius:14px;overflow:hidden">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#F8FAFC;border-bottom:2px solid #1D4ED8">
                  <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;width:28%">Criterio</th>
                  ${places.map(p => `<th style="padding:10px 12px;text-align:center;font-size:13px;font-weight:800;color:#0F172A">${p.name}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr style="border-bottom:1px solid #F1F5F9">
                    <td style="padding:11px 12px;font-size:11px;font-weight:700;color:#64748B">${row.label}</td>
                    ${places.map(p => {
                      const isW = row.winner(p);
                      return `<td style="padding:11px 12px;text-align:center;${isW ? 'background:#F0FDF4;color:#16A34A;font-weight:700' : 'color:#374151'}">${row.fn(p)}</td>`;
                    }).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            ${places.map(p => `<button class="btn-primary-sm" style="flex:1;min-width:120px;font-size:12px" data-compare-view="${p.id}">Ver ${p.name}</button>`).join('')}
          </div>
        </div>
      </div>`;
  },

  descuento() {
    const place = getPlaces().find(p => p.id === state.detailPlaceId);
    if (!place) return `<div class="empty-state"><div class="empty-state-title">Local no encontrado</div></div>`;

    const studentId = 'GC-2026-00847';
    const code = genVerifyCode(studentId, place.id);
    const coverSrc = place.imageData || place.imageUrl;
    const logoSrc  = place.logoData;

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

  // Search input — partial re-render to keep focus
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
      }
    });
  }

  // Back button from detail / compare / menuViewer
  const detailBack = content.querySelector('#detail-back');
  if (detailBack) {
    detailBack.addEventListener('click', () => navigate(state.prevView));
  }

  // Menu close button (menuViewer overlay)
  const menuClose = document.querySelector('#menu-close');
  if (menuClose) {
    menuClose.addEventListener('click', () => navigate('detalle'));
  }

  // Open menu button in detalle → always navigate to menuViewer (handles both image and PDF)
  const openMenuBtn = content.querySelector('#open-menu-btn');
  if (openMenuBtn) {
    openMenuBtn.addEventListener('click', () => navigate('menuViewer'));
  }

  // Inject blob URL into PDF iframe after render
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
  if (showDescuentoBtn) {
    showDescuentoBtn.addEventListener('click', () => navigate('descuento'));
  }

  // Close descuento overlay → back to detalle
  const descuentoClose = document.querySelector('#descuento-close');
  if (descuentoClose) {
    descuentoClose.addEventListener('click', () => navigate('detalle'));
  }

  // Descuento buttons in guardados cards
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
      if (e.target.closest('[data-save]')) return;
      navigate('detalle', { detailPlaceId: parseInt(featuredCard.dataset.place), prevView: state.currentView });
    });
  }

  // Place card tap → detail
  attachPlaceCardListeners(content);

  // Save / unsave
  attachSaveBtns(content);

  // Compare buttons
  attachCompareBtns(content);

  // Floating compare bar — search document since position:fixed
  const goCompare = document.querySelector('#go-compare');
  if (goCompare) {
    goCompare.addEventListener('click', () => navigate('comparar', { prevView: state.currentView }));
  }
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

  // Attend / unattend event
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
          shareBtn.textContent = 'ID copiado';
          setTimeout(() => { shareBtn.textContent = 'Compartir mi GCPass'; }, 2200);
        });
      }
    });
  }
}

function attachPlaceCardListeners(container) {
  container.querySelectorAll('.place-card[data-place]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-save]') || e.target.closest('[data-compare]')) return;
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.place), prevView: state.currentView });
    });
  });
}

function attachSaveBtns(container) {
  container.querySelectorAll('[data-save]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id   = parseInt(el.dataset.save);
      const list = getSaved();
      const idx  = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1); else list.push(id);
      setSaved(list);
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

// ─── BOTTOM NAV (attached once) ───────────────────────────────────────────────
document.querySelectorAll('#bottom-nav .nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.view));
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
navigate('feed');
