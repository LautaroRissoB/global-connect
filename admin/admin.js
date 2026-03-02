// ─── STATE ────────────────────────────────────────────────────────────────────
const adminState = {
  currentView: 'dashboard',
  editingPlaceId: null,
  filterPlan: 'all',
  filterActive: 'all',
};

const PLAN_PRICES = { free: 0, partner: 99, premium: 199 };

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────
function getAdminPlaces() {
  const s = localStorage.getItem('gc_admin_places');
  if (s) { try { return JSON.parse(s); } catch(e) {} }
  return window.GC_PLACES.map(p => ({ ...p, active: p.active !== false }));
}
function saveAdminPlaces(places) {
  localStorage.setItem('gc_admin_places', JSON.stringify(places));
}
function getAdminEvents() {
  const s = localStorage.getItem('gc_admin_events');
  if (s) { try { return JSON.parse(s); } catch(e) {} }
  return window.GC_EVENTS.map(e => ({ ...e }));
}
function saveAdminEvents(events) {
  localStorage.setItem('gc_admin_events', JSON.stringify(events));
}
function calcMRR(places) {
  return places.filter(p => p.active).reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0), 0);
}
function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigate(view, params) {
  if (params) Object.assign(adminState, params);
  adminState.currentView = view;
  document.querySelectorAll('#sidebar [data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === view);
  });
  const content = document.getElementById('admin-content');
  content.innerHTML = ADMIN_VIEWS[view]();
  content.scrollTop = 0;
  attachAdminListeners();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const old = document.getElementById('admin-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'admin-toast';
  t.className = 'admin-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ─── PLAN CHIP HELPER ─────────────────────────────────────────────────────────
function planChip(plan) {
  return `<span class="plan-chip plan-${plan}">${plan}</span>`;
}
function statusChip(active) {
  return `<span class="status-chip ${active ? 'active' : 'inactive'}">${active ? 'Activo' : 'Inactivo'}</span>`;
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
const ADMIN_VIEWS = {

  dashboard() {
    const places = getAdminPlaces();
    const events = getAdminEvents();
    const mrr    = calcMRR(places);
    const partners   = places.filter(p => p.plan !== 'free' && p.active).length;
    const totalViews = places.reduce((s, p) => s + (p.stats?.views || 0), 0);
    const totalGoing = events.reduce((s, e) => s + (e.going || 0), 0);

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Resumen global de la plataforma · Feb 2026</p>
          </div>
          <button class="btn-primary" data-nav="agregar">+ Nuevo local</button>
        </div>

        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-label">Partners activos</div>
            <div class="admin-stat-value" style="color:#1D4ED8">${partners}</div>
            <div class="admin-stat-sub">${places.filter(p => p.plan === 'free').length} en plan gratuito</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-label">MRR</div>
            <div class="admin-stat-value" style="color:#22C55E">€${mrr}</div>
            <div class="admin-stat-sub">ingresos mensuales</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-label">Vistas totales</div>
            <div class="admin-stat-value" style="color:#F59E0B">${totalViews}</div>
            <div class="admin-stat-sub">este mes</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-label">Eventos activos</div>
            <div class="admin-stat-value" style="color:#8B5CF6">${events.length}</div>
            <div class="admin-stat-sub">${totalGoing} confirmados</div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <span class="admin-card-title">Todos los locales (${places.length})</span>
            <button class="btn-sm-primary" data-nav="locales">Ver tabla completa</button>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Barrio</th>
                  <th>Plan</th>
                  <th>Vistas</th>
                  <th>Confirmados</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${places.map(p => `
                  <tr>
                    <td>
                      <div class="table-place-name">${p.emoji || '🏠'} ${p.name}</div>
                      <div class="table-place-cat">${p.category}</div>
                    </td>
                    <td>${p.neighborhood}</td>
                    <td>${planChip(p.plan)}</td>
                    <td style="font-weight:700;color:#1D4ED8">${p.stats?.views || 0}</td>
                    <td style="font-weight:700;color:#22C55E">${p.stats?.going || 0}</td>
                    <td>${statusChip(p.active)}</td>
                    <td><button class="btn-table-edit" data-edit="${p.id}">Editar</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  locales() {
    const places = getAdminPlaces();
    let filtered = places;
    if (adminState.filterPlan !== 'all')   filtered = filtered.filter(p => p.plan === adminState.filterPlan);
    if (adminState.filterActive !== 'all') filtered = filtered.filter(p => String(p.active) === adminState.filterActive);

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Partners</h1>
            <p>${places.length} locales registrados</p>
          </div>
          <button class="btn-primary" data-nav="agregar">+ Agregar local</button>
        </div>

        <div class="admin-filter-row">
          <select id="filter-plan" class="admin-select">
            <option value="all"     ${adminState.filterPlan === 'all'     ? 'selected' : ''}>Todos los planes</option>
            <option value="free"    ${adminState.filterPlan === 'free'    ? 'selected' : ''}>Free</option>
            <option value="partner" ${adminState.filterPlan === 'partner' ? 'selected' : ''}>Partner</option>
            <option value="premium" ${adminState.filterPlan === 'premium' ? 'selected' : ''}>Premium</option>
          </select>
          <select id="filter-active" class="admin-select">
            <option value="all"   ${adminState.filterActive === 'all'   ? 'selected' : ''}>Todos</option>
            <option value="true"  ${adminState.filterActive === 'true'  ? 'selected' : ''}>Activos</option>
            <option value="false" ${adminState.filterActive === 'false' ? 'selected' : ''}>Inactivos</option>
          </select>
          <span style="font-size:12px;color:#94A3B8;align-self:center">${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="admin-card">
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Barrio</th>
                  <th>Plan</th>
                  <th>Vistas</th>
                  <th>Confirmados</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0
                  ? `<tr><td colspan="7" style="text-align:center;padding:28px;color:#94A3B8">Sin resultados para este filtro</td></tr>`
                  : filtered.map(p => `
                    <tr>
                      <td>
                        <div class="table-place-name">${p.emoji || '🏠'} ${p.name}</div>
                        <div class="table-place-cat">${p.category}</div>
                      </td>
                      <td>${p.neighborhood}</td>
                      <td>${planChip(p.plan)}</td>
                      <td style="font-weight:700;color:#1D4ED8">${p.stats?.views || 0}</td>
                      <td style="font-weight:700;color:#22C55E">${p.stats?.going || 0}</td>
                      <td>
                        <button class="status-toggle ${p.active ? 'active' : 'inactive'}" data-toggle="${p.id}">
                          ${p.active ? '● Activo' : '○ Inactivo'}
                        </button>
                      </td>
                      <td class="table-actions">
                        <button class="btn-table-edit"   data-edit="${p.id}">Editar</button>
                        <button class="btn-table-delete" data-delete="${p.id}">Eliminar</button>
                      </td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  agregar() {
    const isEditing = adminState.editingPlaceId !== null;
    const places = getAdminPlaces();
    const p = isEditing ? places.find(x => x.id === adminState.editingPlaceId) : null;

    const neighborhoods = ['Trastevere','Prati','Testaccio','Monti','Pigneto','Ghetto','Esquilino','Ostiense','Parioli','EUR','Tiburtino','Garbatella'];
    const categories    = ['Trattoria','Aperitivo bar','Bar histórico','Craft beer bar','Pizza al taglio','Cucina ebraica','Restaurante','Café','Club','Otro'];

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <button class="btn-ghost back-btn" data-nav="locales">← Volver</button>
            <h1 style="margin-top:8px">${isEditing ? 'Editar local' : 'Agregar local'}</h1>
          </div>
        </div>

        <div class="admin-card" style="max-width:640px">
          <div class="admin-card-body">

            <div class="form-group">
              <label>Emoji del local &nbsp;<span id="emoji-preview" style="font-size:22px">${p?.emoji || ''}</span></label>
              <input type="text" id="f-emoji" class="form-input" placeholder="🍝" value="${p?.emoji || ''}" maxlength="2" style="max-width:80px"/>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Nombre del local *</label>
                <input type="text" id="f-name" class="form-input" placeholder="Osteria dell'Angelo" value="${p?.name || ''}"/>
              </div>
              <div class="form-group">
                <label>Categoría *</label>
                <select id="f-category" class="form-input">
                  <option value="">Seleccionar...</option>
                  ${categories.map(c => `<option value="${c}"${p?.category === c ? ' selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Barrio *</label>
              <select id="f-neighborhood" class="form-input">
                <option value="">Seleccionar...</option>
                ${neighborhoods.map(n => `<option value="${n}"${p?.neighborhood === n ? ' selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Descripción</label>
              <textarea id="f-description" class="form-input form-textarea" placeholder="Describí el local para los estudiantes...">${p?.description || ''}</textarea>
            </div>

            <div class="form-group">
              <label>Oferta para estudiantes GC</label>
              <input type="text" id="f-offer" class="form-input" placeholder="Ej: 10% de descuento en almuerzo y cena" value="${p?.offer?.text || ''}"/>
            </div>

            <div class="form-group">
              <label>Plan</label>
              <div class="plan-radio-group">
                <label class="plan-radio-option">
                  <input type="radio" name="plan" value="free" ${(!p || p.plan === 'free') ? 'checked' : ''}/>
                  <span class="plan-radio-label"><strong>Free</strong> — €0/mes · Perfil básico</span>
                </label>
                <label class="plan-radio-option">
                  <input type="radio" name="plan" value="partner" ${p?.plan === 'partner' ? 'checked' : ''}/>
                  <span class="plan-radio-label"><strong>Partner</strong> — €99/mes · Oferta destacada + métricas</span>
                </label>
                <label class="plan-radio-option">
                  <input type="radio" name="plan" value="premium" ${p?.plan === 'premium' ? 'checked' : ''}/>
                  <span class="plan-radio-label"><strong>Premium</strong> — €199/mes · Posición top + exclusividad</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Estado</label>
              <label class="toggle-switch">
                <input type="checkbox" id="f-active" ${!p || p.active ? 'checked' : ''}/>
                <span class="toggle-slider"></span>
                <span id="toggle-label">${!p || p.active ? 'Activo' : 'Inactivo'}</span>
              </label>
            </div>

            <div id="form-error" class="form-error" style="display:none"></div>

            <div class="form-actions">
              <button class="btn-ghost" data-nav="locales">Cancelar</button>
              <button class="btn-primary" id="save-place-btn">${isEditing ? 'Guardar cambios' : 'Agregar local'}</button>
            </div>

          </div>
        </div>
      </div>`;
  },

  eventos() {
    const events = getAdminEvents();
    const places = getAdminPlaces();

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Eventos</h1>
            <p>${events.length} eventos activos</p>
          </div>
        </div>

        <div class="admin-card" style="margin-bottom:24px">
          <div class="admin-card-head">
            <span class="admin-card-title">Eventos actuales</span>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Local</th>
                  <th>Fecha</th>
                  <th>Precio</th>
                  <th>Confirmados</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${events.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;padding:28px;color:#94A3B8">Sin eventos todavía</td></tr>`
                  : events.map(ev => {
                    const place = places.find(p => p.id === ev.placeId);
                    return `
                      <tr>
                        <td><div class="table-place-name">${ev.emoji} ${ev.name}</div></td>
                        <td>${place ? place.name : '<span style="color:#94A3B8">—</span>'}</td>
                        <td style="white-space:nowrap">${ev.displayDate} · ${ev.time}</td>
                        <td>${ev.price}</td>
                        <td style="font-weight:700;color:#22C55E">${ev.going}</td>
                        <td><button class="btn-table-delete" data-delete-event="${ev.id}">Eliminar</button></td>
                      </tr>`;
                  }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-card" style="max-width:600px">
          <div class="admin-card-head">
            <span class="admin-card-title">Crear nuevo evento</span>
          </div>
          <div class="admin-card-body">
            <div class="form-row">
              <div class="form-group" style="flex:0 0 80px">
                <label>Emoji</label>
                <input type="text" id="ev-emoji" class="form-input" placeholder="🎉" maxlength="2"/>
              </div>
              <div class="form-group">
                <label>Nombre del evento *</label>
                <input type="text" id="ev-name" class="form-input" placeholder="Aperitivo GC"/>
              </div>
            </div>
            <div class="form-group">
              <label>Local *</label>
              <select id="ev-place" class="form-input">
                <option value="">Seleccionar local...</option>
                ${places.map(p => `<option value="${p.id}">${p.emoji || '🏠'} ${p.name} · ${p.neighborhood}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Fecha (ej: Sáb 15 Mar) *</label>
                <input type="text" id="ev-date" class="form-input" placeholder="Sáb 15 Mar"/>
              </div>
              <div class="form-group">
                <label>Hora</label>
                <input type="text" id="ev-time" class="form-input" placeholder="19:00"/>
              </div>
            </div>
            <div class="form-group">
              <label>Precio / descripción</label>
              <input type="text" id="ev-price" class="form-input" placeholder="€8 copa incl."/>
            </div>
            <div id="ev-form-error" class="form-error" style="display:none"></div>
            <div class="form-actions">
              <button class="btn-primary" id="save-event-btn">Crear evento</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  planes() {
    const places = getAdminPlaces();
    const mrr    = calcMRR(places);
    const byPlan = { free: 0, partner: 0, premium: 0 };
    places.forEach(p => { if (byPlan[p.plan] !== undefined) byPlan[p.plan]++; });

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Planes & MRR</h1>
            <p>Gestión de suscripciones</p>
          </div>
        </div>

        <div class="admin-stats-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="admin-stat-card">
            <div class="admin-stat-label">MRR Total</div>
            <div class="admin-stat-value" style="color:#22C55E">€${mrr}</div>
            <div class="admin-stat-sub">/mes</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-label">Partner (€99)</div>
            <div class="admin-stat-value" style="color:#1D4ED8">${byPlan.partner}</div>
            <div class="admin-stat-sub">€${byPlan.partner * 99}/mes</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-label">Premium (€199)</div>
            <div class="admin-stat-value" style="color:#8B5CF6">${byPlan.premium}</div>
            <div class="admin-stat-sub">€${byPlan.premium * 199}/mes</div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <span class="admin-card-title">Suscripciones · cambiar plan en tiempo real</span>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Plan actual</th>
                  <th>Valor/mes</th>
                  <th>Estado</th>
                  <th>Cambiar plan</th>
                </tr>
              </thead>
              <tbody>
                ${places.map(p => `
                  <tr>
                    <td>
                      <div class="table-place-name">${p.emoji || '🏠'} ${p.name}</div>
                      <div class="table-place-cat">${p.neighborhood}</div>
                    </td>
                    <td>${planChip(p.plan)}</td>
                    <td style="font-weight:700;color:#22C55E">€${PLAN_PRICES[p.plan] || 0}</td>
                    <td>${statusChip(p.active)}</td>
                    <td>
                      <select class="admin-select-sm plan-change-select" data-place-id="${p.id}">
                        <option value="free"    ${p.plan === 'free'    ? 'selected' : ''}>Free — €0</option>
                        <option value="partner" ${p.plan === 'partner' ? 'selected' : ''}>Partner — €99</option>
                        <option value="premium" ${p.plan === 'premium' ? 'selected' : ''}>Premium — €199</option>
                      </select>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }
};

// ─── CONTENT-LEVEL LISTENERS (re-attached on every navigate) ──────────────────
function attachAdminListeners() {
  const content = document.getElementById('admin-content');

  // Internal nav buttons (data-nav inside content area)
  content.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.nav === 'agregar') adminState.editingPlaceId = null;
      navigate(el.dataset.nav);
    });
  });

  // Edit place
  content.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => {
      adminState.editingPlaceId = parseInt(el.dataset.edit);
      navigate('agregar');
    });
  });

  // Delete place
  content.querySelectorAll('[data-delete]').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.delete);
      const place = getAdminPlaces().find(p => p.id === id);
      if (!place) return;
      if (!confirm(`¿Eliminar "${place.name}"? Esta acción no se puede deshacer.`)) return;
      saveAdminPlaces(getAdminPlaces().filter(p => p.id !== id));
      showToast('Local eliminado');
      navigate('locales');
    });
  });

  // Toggle active/inactive
  content.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.toggle);
      const places = getAdminPlaces();
      const p = places.find(x => x.id === id);
      if (p) { p.active = !p.active; saveAdminPlaces(places); navigate('locales'); }
    });
  });

  // Plan/active filters
  const fp = content.querySelector('#filter-plan');
  if (fp) fp.addEventListener('change', () => { adminState.filterPlan = fp.value; navigate('locales'); });
  const fa = content.querySelector('#filter-active');
  if (fa) fa.addEventListener('change', () => { adminState.filterActive = fa.value; navigate('locales'); });

  // ── Agregar/Editar form ──────────────────────────────────────────────────────
  const emojiInput = content.querySelector('#f-emoji');
  if (emojiInput) {
    emojiInput.addEventListener('input', () => {
      const preview = document.getElementById('emoji-preview');
      if (preview) preview.textContent = emojiInput.value;
    });
  }
  const activeToggle = content.querySelector('#f-active');
  if (activeToggle) {
    activeToggle.addEventListener('change', () => {
      const lbl = document.getElementById('toggle-label');
      if (lbl) lbl.textContent = activeToggle.checked ? 'Activo' : 'Inactivo';
    });
  }

  const savePlaceBtn = content.querySelector('#save-place-btn');
  if (savePlaceBtn) {
    savePlaceBtn.addEventListener('click', () => {
      const name         = document.getElementById('f-name')?.value.trim();
      const category     = document.getElementById('f-category')?.value;
      const neighborhood = document.getElementById('f-neighborhood')?.value;
      const emoji        = document.getElementById('f-emoji')?.value.trim() || '🏠';
      const description  = document.getElementById('f-description')?.value.trim();
      const offerText    = document.getElementById('f-offer')?.value.trim();
      const plan         = document.querySelector('input[name="plan"]:checked')?.value || 'free';
      const active       = document.getElementById('f-active')?.checked ?? true;

      const errorEl = document.getElementById('form-error');
      if (!name)         { errorEl.textContent = 'El nombre es requerido';    errorEl.style.display = 'block'; return; }
      if (!category)     { errorEl.textContent = 'La categoría es requerida'; errorEl.style.display = 'block'; return; }
      if (!neighborhood) { errorEl.textContent = 'El barrio es requerido';    errorEl.style.display = 'block'; return; }
      errorEl.style.display = 'none';

      const places = getAdminPlaces();
      const offerObj = { text: offerText, badge: offerText ? `🎫 ${offerText}` : 'Sin oferta' };

      if (adminState.editingPlaceId !== null) {
        const idx = places.findIndex(p => p.id === adminState.editingPlaceId);
        if (idx >= 0) {
          places[idx] = { ...places[idx], name, category, neighborhood, emoji, description, offer: offerObj, plan, active };
        }
      } else {
        places.push({
          id: nextId(places), name, category, neighborhood, emoji,
          bgColor: '#F8FAFC', description, distance: '—',
          offer: offerObj, plan, active,
          stats: { views: 0, going: 0, clicks: 0, groups: 0 }
        });
      }

      saveAdminPlaces(places);
      showToast(adminState.editingPlaceId !== null ? 'Local actualizado ✓' : 'Local agregado ✓');
      adminState.editingPlaceId = null;
      navigate('locales');
    });
  }

  // ── Delete event ─────────────────────────────────────────────────────────────
  content.querySelectorAll('[data-delete-event]').forEach(el => {
    el.addEventListener('click', () => {
      if (!confirm('¿Eliminar este evento?')) return;
      const id = parseInt(el.dataset.deleteEvent);
      saveAdminEvents(getAdminEvents().filter(e => e.id !== id));
      showToast('Evento eliminado');
      navigate('eventos');
    });
  });

  // ── Save event form ───────────────────────────────────────────────────────────
  const saveEventBtn = content.querySelector('#save-event-btn');
  if (saveEventBtn) {
    saveEventBtn.addEventListener('click', () => {
      const emoji   = document.getElementById('ev-emoji')?.value.trim() || '🎉';
      const name    = document.getElementById('ev-name')?.value.trim();
      const placeId = parseInt(document.getElementById('ev-place')?.value);
      const date    = document.getElementById('ev-date')?.value.trim();
      const time    = document.getElementById('ev-time')?.value.trim() || '—';
      const price   = document.getElementById('ev-price')?.value.trim() || 'Entrada libre';

      const errEl = document.getElementById('ev-form-error');
      if (!name)    { errEl.textContent = 'El nombre es requerido';    errEl.style.display = 'block'; return; }
      if (!placeId) { errEl.textContent = 'Seleccioná un local';       errEl.style.display = 'block'; return; }
      if (!date)    { errEl.textContent = 'La fecha es requerida';     errEl.style.display = 'block'; return; }
      errEl.style.display = 'none';

      const events = getAdminEvents();
      events.push({ id: nextId(events), name, emoji, placeId, displayDate: date, time, price, going: 0, week: 'this' });
      saveAdminEvents(events);
      showToast('Evento creado ✓');
      navigate('eventos');
    });
  }

  // ── Plan change selects ───────────────────────────────────────────────────────
  content.querySelectorAll('.plan-change-select').forEach(el => {
    el.addEventListener('change', () => {
      const id = parseInt(el.dataset.placeId);
      const places = getAdminPlaces();
      const p = places.find(x => x.id === id);
      if (p) { p.plan = el.value; saveAdminPlaces(places); navigate('planes'); }
    });
  });
}

// ─── SIDEBAR NAV (attached once) ─────────────────────────────────────────────
document.querySelectorAll('#sidebar [data-nav]').forEach(el => {
  el.addEventListener('click', () => {
    if (el.dataset.nav === 'agregar') adminState.editingPlaceId = null;
    navigate(el.dataset.nav);
  });
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
navigate('dashboard');
