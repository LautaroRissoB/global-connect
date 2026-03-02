// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  currentView: 'feed',
  selectedNeighborhood: 'Todos',
  selectedCategory: null,
  searchQuery: '',
  eventFilter: 'all',
  detailPlaceId: null,
  prevView: 'feed',
};

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
function getSaved()     { return JSON.parse(localStorage.getItem('gc_saved_places') || '[]'); }
function setSaved(ids)  { localStorage.setItem('gc_saved_places', JSON.stringify(ids)); }
function getAttending() { return JSON.parse(localStorage.getItem('gc_attending_events') || '[]'); }
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

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigate(view, params) {
  if (params) Object.assign(state, params);
  state.currentView = view;
  document.querySelectorAll('#bottom-nav .nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const content = document.getElementById('app-content');
  content.innerHTML = VIEWS[view]();
  content.scrollTop = 0;
  attachListeners();
}

// ─── SHARED RENDERER ──────────────────────────────────────────────────────────
function renderPlaceCard(place, saved) {
  const isSaved = saved.includes(place.id);
  const planBadge = place.plan === 'premium'
    ? '<span class="tag tag-premium">⭐ Premium</span>'
    : place.plan === 'partner'
    ? '<span class="tag tag-premium">⭐ Partner</span>'
    : '<span class="tag tag-free">Free</span>';

  return `
    <div class="place-card" data-place="${place.id}">
      <div class="place-card-header">
        <div class="place-icon" style="background:${place.bgColor || '#F8FAFC'}">${place.emoji || '🏠'}</div>
        <div class="place-body">
          <div class="place-name-row">
            <div class="place-name">${place.name}</div>
            <button class="save-btn" data-save="${place.id}" title="${isSaved ? 'Quitar' : 'Guardar'}">${isSaved ? '❤️' : '🤍'}</button>
          </div>
          <div class="place-meta">${place.neighborhood} · ${place.category} · ${place.distance || '—'}</div>
          <div class="place-tags">
            ${place.offer?.badge ? `<span class="tag tag-offer">${place.offer.badge}</span>` : ''}
            ${planBadge}
          </div>
        </div>
      </div>
      <div class="place-desc">${place.description}</div>
    </div>`;
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
const VIEWS = {

  feed() {
    const places = getPlaces().filter(p => p.active !== false);
    const events  = getEvents();
    const saved   = getSaved();
    const neighborhoods = ['Todos', ...new Set(places.map(p => p.neighborhood))];
    const filtered = state.selectedNeighborhood === 'Todos'
      ? places
      : places.filter(p => p.neighborhood === state.selectedNeighborhood);

    return `
      <div style="padding:12px 16px 0">
        <div class="pass-strip" data-view="pass" style="cursor:pointer">
          <div class="pass-info">
            <div class="pass-label">Tu GCPass</div>
            <div class="pass-name">Lautaro García</div>
            <div class="pass-id">GC-2026-00847</div>
          </div>
          <div class="pass-badge">
            <div class="pass-badge-icon">🎫</div>
            <div class="pass-badge-text">Ver Pass</div>
          </div>
        </div>
      </div>

      <div class="filter-row">
        ${neighborhoods.map(n => `
          <div class="filter-chip${n === state.selectedNeighborhood ? ' active' : ''}" data-neighborhood="${n}">${n}</div>
        `).join('')}
      </div>

      <div class="section-head">
        <span class="section-head-title">Próximos planes</span>
        <span class="section-head-link" data-view="eventos">Ver todos →</span>
      </div>
      <div class="hscroll">
        ${events.slice(0, 3).map(ev => {
          const place = places.find(p => p.id === ev.placeId);
          return `
            <div class="event-card">
              <div class="event-date">${ev.displayDate} · ${ev.time}</div>
              <div class="event-name">${ev.emoji} ${ev.name}</div>
              <div class="event-place">${place ? place.name : '—'} · ${place ? place.neighborhood : ''}</div>
              <div class="event-footer">
                <span class="event-price">${ev.price}</span>
                <span class="event-going">${ev.going} van</span>
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="spacer"></div>

      <div class="section-head">
        <span class="section-head-title">Para vos${state.selectedNeighborhood !== 'Todos' ? ' · ' + state.selectedNeighborhood : ''}</span>
        <span class="section-head-link" data-view="explorar">Ver todos →</span>
      </div>

      ${filtered.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">📍</div>
            <div class="empty-state-title">Sin lugares en ${state.selectedNeighborhood}</div>
            <div class="empty-state-desc">Probá con otro barrio</div>
           </div>`
        : filtered.map(p => renderPlaceCard(p, saved)).join('')
      }
      <div style="height:16px"></div>`;
  },

  explorar() {
    const places = getPlaces().filter(p => p.active !== false);
    const saved  = getSaved();
    const categories   = [...new Set(places.map(p => p.category))];
    const neighborhoods = ['Todos', ...new Set(places.map(p => p.neighborhood))];

    let filtered = places;
    if (state.selectedCategory)                  filtered = filtered.filter(p => p.category === state.selectedCategory);
    if (state.selectedNeighborhood !== 'Todos')  filtered = filtered.filter(p => p.neighborhood === state.selectedNeighborhood);
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return `
      <div style="padding:10px 16px 0">
        <div class="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-input" class="search-input" placeholder="Buscar lugares, barrios..." value="${state.searchQuery.replace(/"/g,'&quot;')}"/>
        </div>
      </div>

      <div class="filter-row" style="padding-top:8px">
        <div class="filter-chip${!state.selectedCategory ? ' active' : ''}" data-category="">Todas</div>
        ${categories.map(c => `
          <div class="filter-chip${state.selectedCategory === c ? ' active' : ''}" data-category="${c}">${c}</div>
        `).join('')}
      </div>

      <div class="filter-row">
        ${neighborhoods.map(n => `
          <div class="filter-chip${n === state.selectedNeighborhood ? ' active' : ''}" data-neighborhood="${n}">${n}</div>
        `).join('')}
      </div>

      <div style="padding:4px 16px 2px;font-size:11px;color:#94A3B8;font-weight:600" id="result-count">
        ${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}
      </div>

      <div id="search-results">
        ${filtered.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <div class="empty-state-title">Sin resultados</div>
              <div class="empty-state-desc">Probá con otro término o filtro</div>
             </div>`
          : filtered.map(p => renderPlaceCard(p, saved)).join('')
        }
      </div>
      <div style="height:16px"></div>`;
  },

  eventos() {
    const events  = getEvents();
    const places  = getPlaces();
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

      <div style="padding:8px 0">
        ${filtered.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-icon">📅</div>
              <div class="empty-state-title">Sin eventos en este período</div>
             </div>`
          : filtered.map(ev => {
              const place = places.find(p => p.id === ev.placeId);
              const isAttending = attending.includes(ev.id);
              const count = ev.going + (isAttending ? 1 : 0);
              return `
                <div class="event-card-full">
                  <div class="event-card-full-top">
                    <div class="event-icon">${ev.emoji}</div>
                    <div class="event-card-full-body">
                      <div class="event-card-full-name">${ev.name}</div>
                      <div class="event-card-full-meta">${place ? place.name + ' · ' + place.neighborhood : '—'}</div>
                      <div class="event-card-full-date">📅 ${ev.displayDate} · ${ev.time}</div>
                      <div class="event-card-full-price">💶 ${ev.price}</div>
                    </div>
                  </div>
                  <div class="event-card-full-footer">
                    <span class="event-going-count">${count} confirmados</span>
                    <button class="btn-attend${isAttending ? ' attending' : ''}" data-attend="${ev.id}">
                      ${isAttending ? '✓ Ya estás' : 'Me apunto'}
                    </button>
                  </div>
                </div>`;
            }).join('')
        }
      </div>
      <div style="height:16px"></div>`;
  },

  guardados() {
    const saved  = getSaved();
    const places = getPlaces().filter(p => saved.includes(p.id));

    return `
      <div class="section-head">
        <span class="section-head-title">Guardados</span>
        <span style="font-size:11px;color:#94A3B8">${places.length} lugar${places.length !== 1 ? 'es' : ''}</span>
      </div>

      ${places.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">💾</div>
            <div class="empty-state-title">Nada guardado todavía</div>
            <div class="empty-state-desc">Tocá ❤️ en cualquier lugar para guardarlo acá</div>
            <button class="btn-primary-sm" data-view="feed">Explorar lugares</button>
           </div>`
        : places.map(p => renderPlaceCard(p, saved)).join('')
      }
      <div style="height:16px"></div>`;
  },

  pass() {
    const places = getPlaces().filter(p => p.plan !== 'free' && p.active !== false);
    return `
      <div style="padding:16px">
        <div class="pass-full">
          <div class="pass-full-header">
            <span class="pass-full-logo">🌐 Global Connect</span>
            <span class="pass-full-type">Student Pass</span>
          </div>
          <div class="pass-full-name">Lautaro García</div>
          <div class="pass-full-uni">UBA · Erasmus Roma 2026</div>
          <div class="pass-full-id-box">
            <div class="pass-full-id-label">Tu ID de estudiante</div>
            <div class="pass-full-id">GC-2026-00847</div>
          </div>
          <div class="pass-full-footer">
            <span>Válido: Feb – Jul 2026</span>
            <span>Partner Premium</span>
          </div>
        </div>

        <div style="margin-top:16px">
          <div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">
            Beneficios activos (${places.length})
          </div>
          ${places.map(p => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9">
              <div style="width:36px;height:36px;background:${p.bgColor || '#F8FAFC'};border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${p.emoji || '🏠'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:#0F172A">${p.name}</div>
                <div style="font-size:11px;color:#1D4ED8;font-weight:600;margin-top:1px">${p.offer.badge}</div>
              </div>
            </div>`).join('')}
        </div>

        <button class="btn-primary-full" id="share-btn" style="margin-top:16px">Compartir mi GCPass</button>
      </div>
      <div style="height:16px"></div>`;
  },

  detalle() {
    const place = getPlaces().find(p => p.id === state.detailPlaceId);
    if (!place) return `<div class="empty-state"><div class="empty-state-icon">❓</div><div class="empty-state-title">Local no encontrado</div></div>`;
    const saved   = getSaved();
    const isSaved = saved.includes(place.id);

    const rows = [];
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

    return `
      <div class="btn-back" id="detail-back">← Volver</div>
      <div class="place-detail">
        <div class="detail-hero">
          <div class="detail-icon-lg" style="background:${place.bgColor || '#F8FAFC'}">${place.emoji || '🏠'}</div>
          <div class="detail-name">${place.name}</div>
          <div class="detail-cat">${place.category} · ${place.neighborhood}</div>
        </div>

        ${place.offer?.text ? `
        <div class="detail-offer">
          <div class="detail-offer-label">Oferta GCPass</div>
          <div class="detail-offer-text">🎫 ${place.offer.text}</div>
        </div>` : ''}

        ${rows.length > 0 ? `<div class="detail-info">${rows.join('')}</div>` : ''}

        ${place.description ? `<div class="detail-desc">${place.description}</div>` : ''}

        <div class="detail-actions">
          <button class="btn-primary-full" data-save="${place.id}" style="${isSaved ? 'background:#F8FAFC;color:#64748B;border:1px solid #EAECEF' : ''}">
            ${isSaved ? '❤️ Guardado' : '🤍 Guardar lugar'}
          </button>
          ${place.mapsUrl ? `<a href="${place.mapsUrl}" target="_blank" style="display:block;text-align:center;padding:12px;border:1px solid #EAECEF;border-radius:12px;font-size:13px;font-weight:700;color:#1D4ED8;text-decoration:none">📍 Cómo llegar</a>` : ''}
        </div>
      </div>`;
  }
};

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
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

  // Search input (partial re-render of results only)
  const searchInput = content.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      const places = getPlaces().filter(p => p.active !== false);
      const saved  = getSaved();
      let filtered = places;
      if (state.selectedCategory)                 filtered = filtered.filter(p => p.category === state.selectedCategory);
      if (state.selectedNeighborhood !== 'Todos') filtered = filtered.filter(p => p.neighborhood === state.selectedNeighborhood);
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
      if (countEl)   countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}`;
      if (resultsEl) {
        resultsEl.innerHTML = filtered.length === 0
          ? `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Sin resultados</div></div>`
          : filtered.map(p => renderPlaceCard(p, saved)).join('');
        attachSaveBtns(resultsEl);
        attachPlaceCardListeners(resultsEl);
      }
    });
  }

  // Back button from detail view
  const detailBack = content.querySelector('#detail-back');
  if (detailBack) {
    detailBack.addEventListener('click', () => navigate(state.prevView));
  }

  // Place card tap → detail view
  attachPlaceCardListeners(content);

  // Save/unsave place
  attachSaveBtns(content);

  // Event filter tabs
  content.querySelectorAll('[data-event-filter]').forEach(el => {
    el.addEventListener('click', () => {
      state.eventFilter = el.dataset.eventFilter;
      navigate('eventos');
    });
  });

  // Attend/unattend event
  content.querySelectorAll('[data-attend]').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.attend);
      const list = getAttending();
      const idx  = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1); else list.push(id);
      setAttending(list);
      navigate('eventos');
    });
  });

  // Internal navigation (data-view on any element)
  content.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  // Share / copy GCPass
  const shareBtn = content.querySelector('#share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: 'Mi GCPass', text: 'GC-2026-00847 · Lautaro García · Global Connect', url: location.href });
      } else {
        navigator.clipboard.writeText('GC-2026-00847').then(() => {
          shareBtn.textContent = '✓ ID copiado al portapapeles';
          setTimeout(() => { shareBtn.textContent = 'Compartir mi GCPass'; }, 2200);
        });
      }
    });
  }
}

function attachPlaceCardListeners(container) {
  container.querySelectorAll('.place-card[data-place]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-save]')) return;
      navigate('detalle', { detailPlaceId: parseInt(el.dataset.place), prevView: state.currentView });
    });
  });
}

function attachSaveBtns(container) {
  container.querySelectorAll('[data-save]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id  = parseInt(el.dataset.save);
      const list = getSaved();
      const idx  = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1); else list.push(id);
      setSaved(list);
      // Re-render current view only if not inside a partial search update
      if (state.currentView !== 'explorar' || !document.querySelector('#search-input')) {
        navigate(state.currentView);
      } else {
        // Toggle icon in place without full re-render
        el.textContent = list.includes(id) ? '❤️' : '🤍';
        el.title       = list.includes(id) ? 'Quitar' : 'Guardar';
      }
    });
  });
}

// ─── BOTTOM NAV (attached once) ───────────────────────────────────────────────
document.querySelectorAll('#bottom-nav .nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.view));
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
navigate('feed');
