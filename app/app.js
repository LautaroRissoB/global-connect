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

// ─── PLACE CARD ───────────────────────────────────────────────────────────────
function renderPlaceCard(place, saved) {
  const isSaved = saved.includes(place.id);
  return `
    <div class="place-card" data-place="${place.id}">
      <div class="place-card-top">
        <div class="place-name">${place.name}</div>
        <button class="save-btn${isSaved ? ' saved' : ''}" data-save="${place.id}" title="${isSaved ? 'Quitar' : 'Guardar'}">♥</button>
      </div>
      <div class="place-sub">${place.category} · ${place.neighborhood}</div>
      ${place.offer?.text ? `<div class="place-offer">${place.offer.text}</div>` : ''}
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

    return `
      <div class="view">
        <div class="section-head">
          <span class="section-head-title">Lugares${state.selectedNeighborhood !== 'Todos' ? ' · ' + state.selectedNeighborhood : ''}</span>
          <span class="section-head-sub">${places.length} registrado${places.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="chips-row">
          ${neighborhoods.map(n => `
            <div class="chip${n === state.selectedNeighborhood ? ' active' : ''}" data-neighborhood="${n}">${n}</div>
          `).join('')}
        </div>

        ${filtered.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-title">${places.length === 0 ? 'Sin lugares aún' : 'Sin lugares en ' + state.selectedNeighborhood}</div>
              <div class="empty-state-desc">${places.length === 0 ? 'Pronto habrá lugares disponibles.' : 'Probá con otro barrio.'}</div>
             </div>`
          : filtered.map(p => renderPlaceCard(p, saved)).join('')
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

        <div class="result-count" id="result-count">${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}</div>

        <div id="search-results">
          ${filtered.length === 0
            ? `<div class="empty-state">
                <div class="empty-state-title">Sin resultados</div>
                <div class="empty-state-desc">Probá con otro término o filtro</div>
               </div>`
            : filtered.map(p => renderPlaceCard(p, saved)).join('')
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
          : filtered.map(ev => {
              const place = places.find(p => p.id === ev.placeId);
              const isAttending = attending.includes(ev.id);
              const count = ev.going + (isAttending ? 1 : 0);
              return `
                <div class="event-card">
                  <div class="event-card-head">
                    <div>
                      <div class="event-name">${ev.name}</div>
                      <div class="event-place-name">${place ? place.name + ' · ' + place.neighborhood : '—'}</div>
                    </div>
                    <div class="event-date">${ev.displayDate}</div>
                  </div>
                  <div class="event-price-tag">${ev.time} · ${ev.price}</div>
                  <div class="event-footer">
                    <span class="event-going">${count} confirmados</span>
                    <button class="btn-attend${isAttending ? ' attending' : ''}" data-attend="${ev.id}">
                      ${isAttending ? 'Apuntado' : 'Me apunto'}
                    </button>
                  </div>
                </div>`;
            }).join('')
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
        ${places.length === 0
          ? `<div class="empty-state">
              <div class="empty-state-title">Nada guardado todavía</div>
              <div class="empty-state-desc">Guardá lugares para encontrarlos fácilmente</div>
              <button class="btn-primary-sm" data-view="feed">Ver lugares</button>
             </div>`
          : places.map(p => renderPlaceCard(p, saved)).join('')
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
        <button class="btn-primary-full" data-save="${place.id}" style="${isSaved ? 'background:#F8FAFC;color:#64748B;border:1px solid #EAECEF;' : ''}">
          ${isSaved ? 'Guardado' : 'Guardar lugar'}
        </button>
        ${place.mapsUrl ? `<a href="${place.mapsUrl}" target="_blank" style="display:block;text-align:center;padding:12px;border:1px solid #EAECEF;border-radius:12px;font-size:13px;font-weight:700;color:#1D4ED8;text-decoration:none">Cómo llegar</a>` : ''}
      </div>`;
  }
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
      if (countEl)   countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'lugar' : 'lugares'}`;
      if (resultsEl) {
        resultsEl.innerHTML = filtered.length === 0
          ? `<div class="empty-state"><div class="empty-state-title">Sin resultados</div></div>`
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

  // Place card tap → detail
  attachPlaceCardListeners(content);

  // Save / unsave
  attachSaveBtns(content);

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
      if (e.target.closest('[data-save]')) return;
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
