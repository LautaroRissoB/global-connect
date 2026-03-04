// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://hiokmuvqwosipgzvkqoo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4SNcRuP6ig9jFYVe4u8bpQ_BseeKIvq';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── ADMIN CACHE ──────────────────────────────────────────────────────────────
const _adminCache = {
  session:      null,
  profile:      null,
  places:       [],
  events:       [],
  domains:      [],
  studentCount: 0,
};

// ─── STATE ────────────────────────────────────────────────────────────────────
const adminState = {
  currentView: 'dashboard',
  editingPlaceId: null,
  filterPlan: 'all',
  filterActive: 'all',
};

const PLAN_PRICES = { free: 0, partner: 99, premium: 199 };

const BG_COLORS = [
  { value: '#FEF3C7', label: 'Amarillo' },
  { value: '#DBEAFE', label: 'Azul' },
  { value: '#D1FAE5', label: 'Verde' },
  { value: '#FCE7F3', label: 'Rosa' },
  { value: '#EDE9FE', label: 'Violeta' },
  { value: '#FFEDD5', label: 'Naranja' },
  { value: '#F1F5F9', label: 'Gris' },
  { value: '#CFFAFE', label: 'Cyan' },
  { value: '#FFF0F0', label: 'Rojo' },
  { value: '#F0FDF4', label: 'Menta' },
];

const DAY_PRESETS = ['Lun–Vie', 'Lun–Sáb', 'Lun–Dom', 'Fin de sem'];

// ─── DATA HELPERS (sync, from cache) ──────────────────────────────────────────
function getAdminPlaces() { return _adminCache.places; }
function getAdminEvents() { return _adminCache.events; }

function calcMRR(places) {
  return places.filter(p => p.active).reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0), 0);
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
function denormalizePlace(place) {
  const { id, name, emoji, category, plan, active, stats, created_at, updated_at, ...rest } = place;
  const record = { name: name || '', emoji: emoji || '📍', category, plan: plan || 'free',
    active: active !== false,
    stats: stats || { views: 0, going: 0 },
    data: rest };
  if (id) record.id = id;
  return record;
}
function denormalizeEvent(event) {
  const { id, name, emoji, placeId, plan, active, created_at, ...rest } = event;
  const record = { name: name || '', emoji: emoji || '🎉', place_id: placeId,
    plan: plan || 'free', active: active !== false, data: rest };
  if (id) record.id = id;
  return record;
}

// ─── ASYNC DATA LOADERS ───────────────────────────────────────────────────────
async function loadAdminData() {
  const [placesRes, eventsRes, domainsRes, studentsRes] = await Promise.all([
    sb.from('places').select('*').order('id'),
    sb.from('events').select('*').order('id'),
    sb.from('allowed_domains').select('*').order('domain'),
    sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
  ]);
  _adminCache.places       = (placesRes.data  || []).map(normalizePlace);
  _adminCache.events       = (eventsRes.data  || []).map(normalizeEvent);
  _adminCache.domains      = domainsRes.data  || [];
  _adminCache.studentCount = studentsRes.count || 0;
}

// ─── ASYNC CRUD HELPERS ───────────────────────────────────────────────────────
async function savePlace(place) {
  const record = denormalizePlace(place);
  const isNew  = !record.id;
  let result;
  if (isNew) {
    const { data, error } = await sb.from('places').insert(record).select().single();
    if (error) { showToast('Error: ' + error.message); return null; }
    result = data;
    _adminCache.places.push(normalizePlace(result));
  } else {
    const { data, error } = await sb.from('places').update(record).eq('id', record.id).select().single();
    if (error) { showToast('Error: ' + error.message); return null; }
    result = data;
    const idx = _adminCache.places.findIndex(p => p.id === result.id);
    if (idx >= 0) _adminCache.places[idx] = normalizePlace(result);
  }
  return result;
}

async function deletePlace(id) {
  const { error } = await sb.from('places').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message); return false; }
  _adminCache.places = _adminCache.places.filter(p => p.id !== id);
  return true;
}

async function togglePlaceActive(id) {
  const place = _adminCache.places.find(p => p.id === id);
  if (!place) return;
  const newActive = !place.active;
  const { error } = await sb.from('places').update({ active: newActive }).eq('id', id);
  if (error) { showToast('Error: ' + error.message); return; }
  place.active = newActive;
}

async function savePlacePlan(id, plan) {
  const { error } = await sb.from('places').update({ plan }).eq('id', id);
  if (error) { showToast('Error: ' + error.message); return; }
  const place = _adminCache.places.find(p => p.id === id);
  if (place) place.plan = plan;
}

async function saveEvent(event) {
  const record = denormalizeEvent(event);
  const isNew  = !record.id;
  let result;
  if (isNew) {
    const { data, error } = await sb.from('events').insert(record).select().single();
    if (error) { showToast('Error: ' + error.message); return null; }
    result = data;
    _adminCache.events.push(normalizeEvent(result));
  } else {
    const { data, error } = await sb.from('events').update(record).eq('id', record.id).select().single();
    if (error) { showToast('Error: ' + error.message); return null; }
    result = data;
    const idx = _adminCache.events.findIndex(e => e.id === result.id);
    if (idx >= 0) _adminCache.events[idx] = normalizeEvent(result);
  }
  return result;
}

async function deleteEvent(id) {
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message); return false; }
  _adminCache.events = _adminCache.events.filter(e => e.id !== id);
  return true;
}

async function addDomain(domain, universityName) {
  const { data, error } = await sb.from('allowed_domains').insert({ domain, university_name: universityName }).select().single();
  if (error) { showToast('Error: ' + error.message); return null; }
  _adminCache.domains.push(data);
  return data;
}

async function deleteDomain(id) {
  const { error } = await sb.from('allowed_domains').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message); return false; }
  _adminCache.domains = _adminCache.domains.filter(d => d.id !== id);
  return true;
}

// ─── ADMIN AUTH ───────────────────────────────────────────────────────────────
function renderAdminLogin() {
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-auth-page">
      <div class="admin-auth-card">
        <div class="admin-auth-logo">
          <div class="admin-auth-logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <span class="admin-auth-logo-text">Global Connect · Admin</span>
        </div>
        <div class="admin-auth-title">Panel de administración</div>
        <div class="admin-auth-sub">Ingresá con tu cuenta de administrador.</div>
        <div class="admin-auth-field">
          <label>Email</label>
          <input type="email" id="adm-email" placeholder="admin@globalconnect.com" autocomplete="email"/>
        </div>
        <div class="admin-auth-field">
          <label>Contraseña</label>
          <input type="password" id="adm-password" placeholder="Tu contraseña" autocomplete="current-password"/>
        </div>
        <button class="admin-auth-btn" id="adm-login-btn">Ingresar</button>
        <div class="admin-auth-error" id="adm-login-error"></div>
      </div>
    </div>`;

  document.getElementById('adm-login-btn').addEventListener('click', async () => {
    const email    = document.getElementById('adm-email')?.value.trim();
    const password = document.getElementById('adm-password')?.value.trim();
    const errEl    = document.getElementById('adm-login-error');
    const btn      = document.getElementById('adm-login-btn');

    btn.disabled = true; btn.textContent = 'Verificando...';
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Ingresar';

    if (error) { errEl.textContent = 'Email o contraseña incorrectos.'; errEl.classList.add('visible'); return; }

    const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
    if (!profile || profile.role !== 'admin') {
      await sb.auth.signOut();
      errEl.textContent = 'Esta cuenta no tiene permisos de administrador.';
      errEl.classList.add('visible');
      return;
    }

    _adminCache.session = data.session;
    _adminCache.profile = profile;
    await loadAdminData();
    navigate('dashboard');
  });
}

function renderAdminUnauthorized() {
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-auth-page">
      <div class="admin-auth-card" style="text-align:center">
        <div class="admin-unauth-icon">🚫</div>
        <div class="admin-unauth-title">Sin permisos de acceso</div>
        <div class="admin-unauth-sub">Tu cuenta no tiene rol de administrador. Pedile al admin principal que te asigne el rol.</div>
        <button class="admin-unauth-btn" onclick="sb.auth.signOut().then(() => location.reload())">Cerrar sesión</button>
      </div>
    </div>`;
}

async function initAdmin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { renderAdminLogin(); return; }
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
  if (!profile || profile.role !== 'admin') { renderAdminUnauthorized(); return; }
  _adminCache.session = session;
  _adminCache.profile = profile;
  await loadAdminData();
  navigate('dashboard');
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
    const partners     = places.filter(p => p.plan !== 'free' && p.active).length;
    const totalViews   = places.reduce((s, p) => s + (p.stats?.views || 0), 0);
    const totalGoing   = events.reduce((s, e) => s + (e.going || 0), 0);
    const studentCount = _adminCache.studentCount;

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Resumen global de la plataforma</p>
          </div>
          <button class="btn-primary" data-nav="agregar">+ Nuevo local</button>
        </div>

        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-label">Estudiantes registrados</div>
            <div class="admin-stat-value" style="color:#0066FF">${studentCount}</div>
            <div class="admin-stat-sub">cuentas verificadas</div>
          </div>
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
          ${places.length === 0 ? `
          <div style="padding:32px;text-align:center;color:#94A3B8">
            <div style="font-size:32px;margin-bottom:10px">🏪</div>
            <div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:4px">Sin locales todavía</div>
            <div style="font-size:12px">Agregá el primer local con el botón de arriba</div>
          </div>` : `
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
          </div>`}
        </div>

        <div class="danger-zone">
          <div class="danger-zone-title">⚠️ Reiniciar plataforma</div>
          <p>Eliminá todos los datos cargados para empezar desde cero con locales reales.</p>
          <button class="btn-table-delete" id="clear-all-btn">Limpiar todos los datos</button>
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
    const currentColor = p?.bgColor || '#FEF3C7';

    // Parse existing hours string (e.g. "Lun–Dom 12:00–22:00")
    const hoursStr   = p?.hours || '';
    const hm         = hoursStr.match(/^(.+?)\s+(\d{2}:\d{2})[–\-](\d{2}:\d{2})$/);
    const hoursDays  = hm ? hm[1] : '';
    const hoursOpen  = hm ? hm[2] : '12:00';
    const hoursClose = hm ? hm[3] : '22:00';
    const hoursPreview = p?.hours || 'Sin horario definido';

    const neighborhoods = ['Trastevere','Prati','Testaccio','Monti','Pigneto','Ghetto','Esquilino','Ostiense','Parioli','EUR','Tiburtino','Garbatella'];
    const categories    = ['Trattoria','Aperitivo bar','Bar histórico','Craft beer bar','Pizza al taglio','Cucina ebraica','Restaurante','Café','Club','Otro'];

    // Initial card preview content
    const previewCover = p?.imageData || p?.imageUrl || '';
    const previewLogo  = p?.logoData || '';
    let previewImgHtml;
    if (previewCover) {
      previewImgHtml = `<img class="card-preview-img" src="${previewCover}" alt=""/>`;
    } else if (previewLogo) {
      previewImgHtml = `<div class="card-preview-icon-bg" style="background:${currentColor}"><img class="card-preview-logo" src="${previewLogo}" alt=""/></div>`;
    } else {
      previewImgHtml = `<div class="card-preview-icon-bg" style="background:${currentColor}">${p?.emoji || '🏠'}</div>`;
    }

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <button class="btn-ghost back-btn" data-nav="locales">← Volver</button>
            <h1 style="margin-top:8px">${isEditing ? 'Editar local' : 'Agregar local'}</h1>
          </div>
        </div>

        <div class="agregar-layout">

          <div class="admin-card agregar-form-col">
            <div class="admin-card-body">

              <div class="form-section-title">Identidad visual</div>

              <div class="form-group">
                <label>Foto de portada</label>
                <label class="file-upload-btn" for="f-imageFile">
                  📷 ${p?.imageData || p?.imageUrl ? 'Cambiar foto' : 'Subir foto de portada'}
                </label>
                <input type="file" id="f-imageFile" accept="image/*" style="display:none"/>
                <img id="img-preview" class="img-preview-thumb" src="${p?.imageData || p?.imageUrl || ''}" style="display:${p?.imageData || p?.imageUrl ? 'block' : 'none'}"/>
              </div>

              <div class="form-group">
                <label>Logo del local <span style="font-size:11px;color:#94A3B8;font-weight:500">(máx 500 KB)</span></label>
                <label class="file-upload-btn file-upload-btn-secondary" for="f-logoFile">
                  🖼 ${p?.logoData ? 'Cambiar logo' : 'Subir logo'}
                </label>
                <input type="file" id="f-logoFile" accept="image/*" style="display:none"/>
                <img id="logo-preview" class="logo-preview-circle" src="${p?.logoData || ''}" style="display:${p?.logoData ? 'block' : 'none'}"/>
              </div>

              <div class="form-row">
                <div class="form-group" style="margin-bottom:0">
                  <label>Emoji <span style="font-size:11px;color:#94A3B8;font-weight:500">Solo si no hay logo</span></label>
                  <input type="text" id="f-emoji" class="form-input" placeholder="🍝" value="${p?.emoji || ''}" maxlength="2" style="max-width:90px"/>
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <label>Color de fondo <span style="font-size:11px;color:#94A3B8;font-weight:500">Sin logo ni foto</span></label>
                  <div class="color-swatches" style="margin-top:0">
                    ${BG_COLORS.map(c => `<button type="button" class="color-swatch${currentColor === c.value ? ' selected' : ''}" data-color="${c.value}" style="background:${c.value}" title="${c.label}"></button>`).join('')}
                  </div>
                  <input type="hidden" id="f-bgColor" value="${currentColor}"/>
                </div>
              </div>

              <div class="form-section-title">Información básica</div>

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

              <div class="form-row">
                <div class="form-group">
                  <label>Barrio *</label>
                  <select id="f-neighborhood" class="form-input">
                    <option value="">Seleccionar...</option>
                    ${neighborhoods.map(n => `<option value="${n}"${p?.neighborhood === n ? ' selected' : ''}>${n}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Precio promedio por persona</label>
                  <select id="f-priceRange" class="form-input">
                    <option value="">Sin especificar</option>
                    <option value="< €10"  ${p?.priceRange === '< €10'  ? 'selected' : ''}>Económico · menos de €10</option>
                    <option value="€10–20" ${p?.priceRange === '€10–20' ? 'selected' : ''}>Moderado · €10–20</option>
                    <option value="€20–40" ${p?.priceRange === '€20–40' ? 'selected' : ''}>Medio-alto · €20–40</option>
                    <option value="> €40"  ${p?.priceRange === '> €40'  ? 'selected' : ''}>Premium · más de €40</option>
                  </select>
                </div>
              </div>

              <div class="form-section-title">Contacto y ubicación</div>

              <div class="form-group">
                <label>Dirección</label>
                <input type="text" id="f-address" class="form-input" placeholder="Via della Lungaretta 28, Trastevere" value="${p?.address || ''}"/>
              </div>

              <div class="form-group">
                <label>Link Google Maps</label>
                <input type="url" id="f-maps" class="form-input" placeholder="https://maps.google.com/..." value="${p?.mapsUrl || ''}"/>
              </div>

              <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" id="f-phone" class="form-input" placeholder="+39 06 581 3798" value="${p?.phone || ''}"/>
              </div>

              <div class="form-group">
                <label>Horario</label>
                <div class="hours-presets">
                  ${DAY_PRESETS.map(d => `<button type="button" class="hours-preset-btn${hoursDays === d ? ' active' : ''}" data-days="${d}">${d}</button>`).join('')}
                </div>
                <div class="hours-time-row">
                  <input type="time" id="f-hours-open" class="form-input" style="width:130px" value="${hoursOpen}"/>
                  <span class="hours-sep">–</span>
                  <input type="time" id="f-hours-close" class="form-input" style="width:130px" value="${hoursClose}"/>
                </div>
                <div class="hours-preview-text" id="hours-preview">${hoursPreview}</div>
                <input type="hidden" id="f-hours" value="${p?.hours || ''}"/>
              </div>

              <div class="form-group">
                <label>Sitio web</label>
                <input type="url" id="f-website" class="form-input" placeholder="https://..." value="${p?.website || ''}"/>
              </div>

              <div class="form-section-title">Contenido</div>

              <div class="form-group">
                <label>Descripción</label>
                <textarea id="f-description" class="form-input form-textarea" placeholder="Describí el local para los estudiantes...">${p?.description || ''}</textarea>
              </div>

              <div class="form-group">
                <label>Oferta para estudiantes GC</label>
                <input type="text" id="f-offer" class="form-input" placeholder="Ej: 10% de descuento en almuerzo y cena" value="${p?.offer?.text || ''}"/>
              </div>

              <div class="form-group">
                <label>Menú / Carta (PDF o imagen)</label>
                <label class="file-upload-btn file-upload-btn-secondary" for="f-menuFile">
                  📄 ${p?.menuData ? 'Cambiar menú' : 'Subir menú (PDF o imagen)'}
                </label>
                <input type="file" id="f-menuFile" accept=".pdf,image/*" style="display:none"/>
                <div id="menu-upload-status" class="file-upload-status" style="display:${p?.menuData ? 'block' : 'none'}">
                  ✓ Menú cargado
                </div>
              </div>

              <div class="form-section-title">Plan y estado</div>

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

          <div class="card-preview-panel">
            <div class="card-preview-label">Vista del estudiante</div>
            <div class="card-preview" id="card-preview">
              ${previewImgHtml}
              <div class="card-preview-body">
                <div class="card-preview-name">${p?.name || 'Nombre del local'}</div>
                <div class="card-preview-sub">${p?.category || 'Categoría'} · ${p?.neighborhood || 'Barrio'}</div>
                ${p?.offer?.text ? `<div class="card-preview-offer">${p.offer.text}</div>` : ''}
              </div>
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
  },

  dominios() {
    const domains = _adminCache.domains;
    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Dominios autorizados</h1>
            <p>Emails con estos dominios pueden registrarse en la app de estudiantes.</p>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <span class="admin-card-title">Agregar dominio</span>
          </div>
          <div class="admin-card-body" style="padding:20px">
            <div class="domains-add-form">
              <div style="flex:1;min-width:160px">
                <label style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Dominio</label>
                <input type="text" id="dom-domain" class="form-input" placeholder="gmail.com, uba.ar…"/>
              </div>
              <div style="flex:1;min-width:160px">
                <label style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Universidad</label>
                <input type="text" id="dom-uni" class="form-input" placeholder="UBA, Polimi…"/>
              </div>
              <button class="btn-primary" id="dom-add-btn" style="align-self:flex-end;white-space:nowrap">+ Agregar</button>
            </div>
            <div class="admin-auth-error" id="dom-error"></div>
          </div>
        </div>

        <div class="admin-card" style="margin-top:16px">
          <div class="admin-card-head">
            <span class="admin-card-title">Dominios activos (${domains.length})</span>
          </div>
          <div class="admin-card-body" style="padding:16px 20px">
            ${domains.length === 0
              ? `<div style="font-size:13px;color:#94A3B8;padding:12px 0">Sin dominios registrados todavía.</div>`
              : `<div class="admin-table-wrap">
                  <table class="admin-table">
                    <thead><tr><th>Dominio</th><th>Universidad</th><th></th></tr></thead>
                    <tbody>
                      ${domains.map(d => `
                        <tr>
                          <td style="font-weight:700;color:#1D4ED8">@${d.domain}</td>
                          <td>${d.university_name}</td>
                          <td><button class="btn-table-delete" data-del-domain="${d.id}">Eliminar</button></td>
                        </tr>`).join('')}
                    </tbody>
                  </table>
                </div>`}
          </div>
        </div>
      </div>`;
  },
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
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.delete);
      const place = getAdminPlaces().find(p => p.id === id);
      if (!place) return;
      if (!confirm(`¿Eliminar "${place.name}"? Esta acción no se puede deshacer.`)) return;
      const ok = await deletePlace(id);
      if (ok) { showToast('Local eliminado'); navigate('locales'); }
    });
  });

  // Toggle active/inactive
  content.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.toggle);
      await togglePlaceActive(id);
      navigate('locales');
    });
  });

  // Domain management
  const domAddBtn = content.querySelector('#dom-add-btn');
  if (domAddBtn) {
    domAddBtn.addEventListener('click', async () => {
      const domain  = document.getElementById('dom-domain')?.value.trim().toLowerCase().replace(/^@/, '');
      const uniName = document.getElementById('dom-uni')?.value.trim();
      const errEl   = document.getElementById('dom-error');
      if (!domain || !uniName) { errEl.textContent = 'Completá ambos campos.'; errEl.classList.add('visible'); return; }
      errEl.classList.remove('visible');
      domAddBtn.disabled = true; domAddBtn.textContent = 'Guardando...';
      const result = await addDomain(domain, uniName);
      domAddBtn.disabled = false; domAddBtn.textContent = '+ Agregar';
      if (result) { showToast('Dominio agregado ✓'); navigate('dominios'); }
    });
  }
  content.querySelectorAll('[data-del-domain]').forEach(el => {
    el.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este dominio?')) return;
      const id = el.dataset.delDomain;
      const ok = await deleteDomain(id);
      if (ok) { showToast('Dominio eliminado'); navigate('dominios'); }
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
      const box = document.getElementById('emoji-preview-box');
      if (box) box.textContent = emojiInput.value || '🏠';
    });
  }

  // Color swatches
  content.querySelectorAll('.color-swatch').forEach(el => {
    el.addEventListener('click', () => {
      content.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      const colorInput = document.getElementById('f-bgColor');
      if (colorInput) colorInput.value = el.dataset.color;
      updateCardPreview();
    });
  });

  // Active toggle label
  const activeToggle = content.querySelector('#f-active');
  if (activeToggle) {
    activeToggle.addEventListener('change', () => {
      const lbl = document.getElementById('toggle-label');
      if (lbl) lbl.textContent = activeToggle.checked ? 'Activo' : 'Inactivo';
    });
  }

  // ── Hours UI ─────────────────────────────────────────────────────────────────
  function updateHoursFromDOM() {
    const activeBtn  = content.querySelector('.hours-preset-btn.active');
    const days       = activeBtn?.dataset.days || '';
    const open       = content.querySelector('#f-hours-open')?.value  || '';
    const close      = content.querySelector('#f-hours-close')?.value || '';
    const value      = days && open && close ? `${days} ${open}–${close}` : '';
    const hiddenInput = content.querySelector('#f-hours');
    if (hiddenInput) hiddenInput.value = value;
    const preview = content.querySelector('#hours-preview');
    if (preview) preview.textContent = value || 'Sin horario definido';
  }

  content.querySelectorAll('.hours-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.hours-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateHoursFromDOM();
    });
  });

  const hoursOpen  = content.querySelector('#f-hours-open');
  const hoursClose = content.querySelector('#f-hours-close');
  if (hoursOpen)  hoursOpen.addEventListener('change', updateHoursFromDOM);
  if (hoursClose) hoursClose.addEventListener('change', updateHoursFromDOM);

  // ── Live card preview ─────────────────────────────────────────────────────────
  function updateCardPreview() {
    const preview = document.getElementById('card-preview');
    if (!preview) return;
    const name         = document.getElementById('f-name')?.value.trim()    || 'Nombre del local';
    const category     = document.getElementById('f-category')?.value        || 'Categoría';
    const neighborhood = document.getElementById('f-neighborhood')?.value    || 'Barrio';
    const offerText    = document.getElementById('f-offer')?.value.trim()    || '';
    const emoji        = document.getElementById('f-emoji')?.value.trim()    || '🏠';
    const bgColor      = document.getElementById('f-bgColor')?.value         || '#FEF3C7';
    const imageFileInp = document.getElementById('f-imageFile');
    const logoFileInp  = document.getElementById('f-logoFile');
    const imageSrc     = imageFileInp?._data || '';
    const logoSrc      = logoFileInp?._data  || '';

    let imgHtml;
    if (imageSrc) {
      imgHtml = `<img class="card-preview-img" src="${imageSrc}" alt=""/>`;
    } else if (logoSrc) {
      imgHtml = `<div class="card-preview-icon-bg" style="background:${bgColor}"><img class="card-preview-logo" src="${logoSrc}" alt=""/></div>`;
    } else {
      imgHtml = `<div class="card-preview-icon-bg" style="background:${bgColor}">${emoji}</div>`;
    }
    preview.innerHTML = `
      ${imgHtml}
      <div class="card-preview-body">
        <div class="card-preview-name">${name}</div>
        <div class="card-preview-sub">${category} · ${neighborhood}</div>
        ${offerText ? `<div class="card-preview-offer">${offerText}</div>` : ''}
      </div>`;
  }

  // Connect preview-triggering inputs
  ['f-name','f-category','f-neighborhood','f-offer','f-emoji'].forEach(id => {
    const el = content.querySelector(`#${id}`);
    if (el) el.addEventListener('input', updateCardPreview);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', updateCardPreview);
  });

  // ── Image file upload ────────────────────────────────────────────────────────
  const imageFileInput = content.querySelector('#f-imageFile');
  if (imageFileInput) {
    imageFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { showToast('Imagen demasiado grande (máx 2 MB)'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        imageFileInput._data = ev.target.result;
        const preview = content.querySelector('#img-preview');
        if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
        const uploadBtn = content.querySelector('label[for="f-imageFile"]');
        if (uploadBtn) uploadBtn.textContent = '📷 Cambiar foto';
        updateCardPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Logo file upload ──────────────────────────────────────────────────────────
  const logoFileInput = content.querySelector('#f-logoFile');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) { showToast('Logo demasiado grande (máx 500 KB)'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        logoFileInput._data = ev.target.result;
        const logoPreview = content.querySelector('#logo-preview');
        if (logoPreview) { logoPreview.src = ev.target.result; logoPreview.style.display = 'block'; }
        const uploadBtn = content.querySelector('label[for="f-logoFile"]');
        if (uploadBtn) uploadBtn.textContent = '🖼 Cambiar logo';
        updateCardPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Menu file upload ─────────────────────────────────────────────────────────
  const menuFileInput = content.querySelector('#f-menuFile');
  if (menuFileInput) {
    menuFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { showToast('Archivo demasiado grande (máx 10 MB)'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        menuFileInput._data = ev.target.result;
        menuFileInput._type = file.type;
        const statusEl = content.querySelector('#menu-upload-status');
        if (statusEl) statusEl.style.display = 'block';
        const uploadBtn = content.querySelector('label[for="f-menuFile"]');
        if (uploadBtn) uploadBtn.textContent = '📄 Cambiar menú';
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Save place form ───────────────────────────────────────────────────────────
  const savePlaceBtn = content.querySelector('#save-place-btn');
  if (savePlaceBtn) {
    savePlaceBtn.addEventListener('click', async () => {
      const name         = document.getElementById('f-name')?.value.trim();
      const category     = document.getElementById('f-category')?.value;
      const neighborhood = document.getElementById('f-neighborhood')?.value;
      const emoji        = document.getElementById('f-emoji')?.value.trim() || '🏠';
      const description  = document.getElementById('f-description')?.value.trim() || '';
      const offerText    = document.getElementById('f-offer')?.value.trim() || '';
      const plan         = document.querySelector('input[name="plan"]:checked')?.value || 'free';
      const active       = document.getElementById('f-active')?.checked ?? true;
      const address      = document.getElementById('f-address')?.value.trim() || '';
      const phone        = document.getElementById('f-phone')?.value.trim() || '';
      const hours        = document.getElementById('f-hours')?.value.trim() || '';
      const website      = document.getElementById('f-website')?.value.trim() || '';
      const mapsUrl      = document.getElementById('f-maps')?.value.trim() || '';
      const bgColor      = document.getElementById('f-bgColor')?.value || '#FEF3C7';
      const priceRange   = document.getElementById('f-priceRange')?.value || '';

      const errorEl = document.getElementById('form-error');
      if (!name)         { errorEl.textContent = 'El nombre es requerido';    errorEl.style.display = 'block'; return; }
      if (!category)     { errorEl.textContent = 'La categoría es requerida'; errorEl.style.display = 'block'; return; }
      if (!neighborhood) { errorEl.textContent = 'El barrio es requerido';    errorEl.style.display = 'block'; return; }
      errorEl.style.display = 'none';

      const places       = getAdminPlaces();
      const imageFileInp = document.getElementById('f-imageFile');
      const logoFileInp  = document.getElementById('f-logoFile');
      const menuFileInp  = document.getElementById('f-menuFile');
      const existingP    = adminState.editingPlaceId !== null ? places.find(x => x.id === adminState.editingPlaceId) : null;
      const imageData    = imageFileInp?._data || existingP?.imageData || '';
      const logoData     = logoFileInp?._data  || existingP?.logoData  || '';
      const menuData     = menuFileInp?._data  || existingP?.menuData  || '';
      const menuType     = menuFileInp?._type  || existingP?.menuType  || '';
      const offerObj     = { text: offerText, badge: offerText ? `🎫 ${offerText}` : '' };

      const placeObj = {
        ...(existingP || {}),
        name, category, neighborhood, emoji, bgColor,
        address, phone, hours, website, mapsUrl,
        description, offer: offerObj, plan, active,
        priceRange, imageData, logoData, menuData, menuType,
        stats: existingP?.stats || { views: 0, going: 0 },
      };
      if (adminState.editingPlaceId !== null) placeObj.id = adminState.editingPlaceId;

      savePlaceBtn.disabled = true; savePlaceBtn.textContent = 'Guardando...';
      const result = await savePlace(placeObj);
      savePlaceBtn.disabled = false; savePlaceBtn.textContent = 'Guardar local';

      if (result) {
        showToast(adminState.editingPlaceId !== null ? 'Local actualizado ✓' : 'Local agregado ✓');
        adminState.editingPlaceId = null;
        navigate('locales');
      }
    });
  }

  // ── Delete event ─────────────────────────────────────────────────────────────
  content.querySelectorAll('[data-delete-event]').forEach(el => {
    el.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este evento?')) return;
      const id = parseInt(el.dataset.deleteEvent);
      const ok = await deleteEvent(id);
      if (ok) { showToast('Evento eliminado'); navigate('eventos'); }
    });
  });

  // ── Save event form ───────────────────────────────────────────────────────────
  const saveEventBtn = content.querySelector('#save-event-btn');
  if (saveEventBtn) {
    saveEventBtn.addEventListener('click', async () => {
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

      saveEventBtn.disabled = true; saveEventBtn.textContent = 'Guardando...';
      const result = await saveEvent({ name, emoji, placeId, displayDate: date, time, price, going: 0, week: 'this' });
      saveEventBtn.disabled = false; saveEventBtn.textContent = 'Crear evento';
      if (result) { showToast('Evento creado ✓'); navigate('eventos'); }
    });
  }

  // ── Plan change selects ───────────────────────────────────────────────────────
  content.querySelectorAll('.plan-change-select').forEach(el => {
    el.addEventListener('change', async () => {
      const id = parseInt(el.dataset.placeId);
      await savePlacePlan(id, el.value);
      navigate('planes');
    });
  });

  // ── Clear all data ────────────────────────────────────────────────────────────
  const clearAllBtn = content.querySelector('#clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar TODOS los locales y eventos? Esta acción no se puede deshacer.')) return;
      // Delete all events, then all places (order matters for FK)
      for (const e of [..._adminCache.events]) await sb.from('events').delete().eq('id', e.id);
      for (const p of [..._adminCache.places]) await sb.from('places').delete().eq('id', p.id);
      _adminCache.places = [];
      _adminCache.events = [];
      showToast('Datos limpiados ✓');
      navigate('dashboard');
    });
  }
}

// ─── SIDEBAR NAV (attached once) ─────────────────────────────────────────────
document.querySelectorAll('#sidebar [data-nav]').forEach(el => {
  el.addEventListener('click', () => {
    if (el.dataset.nav === 'agregar') adminState.editingPlaceId = null;
    navigate(el.dataset.nav);
  });
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
initAdmin();
