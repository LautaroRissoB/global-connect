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
  students:     [],
  studentCount: 0,
};

// ─── STATE ────────────────────────────────────────────────────────────────────
const adminState = {
  currentView: 'dashboard',
  editingPlaceId: null,
  reportPlaceId: null,
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
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [placesRes, eventsRes, domainsRes, studentsRes, viewsRes, savesRes, attendRes] = await Promise.all([
    sb.from('places').select('*').order('id'),
    sb.from('events').select('*').order('id'),
    sb.from('allowed_domains').select('*').order('domain'),
    sb.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
    sb.from('place_views').select('place_id, viewed_at').gte('viewed_at', prevStart),
    sb.from('saved_places').select('place_id, created_at').gte('created_at', prevStart),
    sb.from('attending_events').select('event_id, created_at').gte('created_at', prevStart),
  ]);

  _adminCache.places       = (placesRes.data  || []).map(normalizePlace);
  _adminCache.events       = (eventsRes.data  || []).map(normalizeEvent);
  _adminCache.domains      = domainsRes.data  || [];
  _adminCache.students     = studentsRes.data  || [];
  _adminCache.studentCount = _adminCache.students.length;

  // Build per-place analytics for current and previous month
  const views   = viewsRes.data  || [];
  const saves   = savesRes.data  || [];
  const attends = attendRes.data || [];

  // Map event_id → place_id
  const eventPlaceMap = {};
  for (const e of _adminCache.events) if (e.placeId) eventPlaceMap[e.id] = e.placeId;

  _adminCache.analytics = {};
  for (const place of _adminCache.places) {
    const pid = place.id;
    const placeEvents = _adminCache.events.filter(e => e.placeId === pid).map(e => e.id);

    const viewsThis  = views.filter(v => v.place_id === pid && v.viewed_at >= monthStart).length;
    const viewsPrev  = views.filter(v => v.place_id === pid && v.viewed_at < monthStart).length;
    const savesThis  = saves.filter(s => s.place_id === pid && s.created_at >= monthStart).length;
    const savesPrev  = saves.filter(s => s.place_id === pid && s.created_at < monthStart).length;
    const attendThis = attends.filter(a => placeEvents.includes(a.event_id) && a.created_at >= monthStart).length;
    const attendPrev = attends.filter(a => placeEvents.includes(a.event_id) && a.created_at < monthStart).length;

    _adminCache.analytics[pid] = {
      viewsThis, viewsPrev, savesThis, savesPrev, attendThis, attendPrev,
      eventsThis: _adminCache.events.filter(e => e.placeId === pid && e.date >= monthStart.slice(0,10)).length,
    };
  }

  _adminCache.analyticsMonth = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
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
    updateTopbarName();
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

function updateTopbarName() {
  const el = document.getElementById('topbar-admin-name');
  if (!el) return;
  const p = _adminCache.profile;
  if (p) el.textContent = '● ' + (p.name || p.email || 'Admin');
}

async function initAdmin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { renderAdminLogin(); return; }
  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.role !== 'admin') { renderAdminUnauthorized(); return; }
  _adminCache.session = session;
  _adminCache.profile = profile;
  updateTopbarName();
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
    const isEditing   = adminState.editingPlaceId !== null;
    const places      = getAdminPlaces();
    const p           = isEditing ? places.find(x => x.id === adminState.editingPlaceId) : null;
    const currentColor = p?.bgColor || '#FEF3C7';
    const step         = adminState.wizardStep || 1;

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

    const stepLabels = ['Identidad visual', 'Información', 'Oferta & Plan'];

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn-ghost back-btn" data-nav="locales">← Volver</button>
            <h1>${isEditing ? 'Editar local' : 'Nuevo local'}</h1>
          </div>
        </div>

        <!-- WIZARD STEPS -->
        <div class="wizard-steps">
          ${stepLabels.map((label, i) => `
            <div class="wizard-step${step === i+1 ? ' active' : step > i+1 ? ' done' : ''}" data-goto-step="${i+1}">
              <div class="wizard-step-num">${step > i+1 ? '✓' : i+1}</div>
              <div class="wizard-step-label">${label}</div>
            </div>
            ${i < 2 ? '<div class="wizard-step-line' + (step > i+1 ? ' done' : '') + '"></div>' : ''}`).join('')}
        </div>

        <div class="agregar-layout">

          <div class="agregar-form-col">

          <!-- ── STEP 1: IDENTIDAD VISUAL ── -->
          <div class="wizard-panel${step === 1 ? ' active' : ''}" id="wizard-panel-1">
            <div class="admin-card">
              <div class="admin-card-head"><span class="admin-card-title">1 · Identidad visual</span></div>
              <div class="admin-card-body">

                <div class="upload-grid">
                  <div class="upload-zone" id="cover-upload-zone">
                    <label for="f-imageFile">
                      ${p?.imageData || p?.imageUrl
                        ? `<img id="img-preview" class="upload-preview-img" src="${p.imageData || p.imageUrl}" alt=""/>`
                        : `<div class="upload-placeholder"><span class="upload-icon">🖼</span><span class="upload-label">Foto de portada</span><span class="upload-hint">JPG, PNG · máx 2 MB</span></div>`
                      }
                    </label>
                    <input type="file" id="f-imageFile" accept="image/*" style="display:none"/>
                    ${p?.imageData || p?.imageUrl ? '' : `<img id="img-preview" class="upload-preview-img" src="" style="display:none" alt=""/>`}
                  </div>
                  <div class="upload-zone upload-zone-sm" id="logo-upload-zone">
                    <label for="f-logoFile">
                      ${p?.logoData
                        ? `<img id="logo-preview" class="upload-preview-img" src="${p.logoData}" alt=""/>`
                        : `<div class="upload-placeholder"><span class="upload-icon">🏷</span><span class="upload-label">Logo</span><span class="upload-hint">máx 500 KB</span></div>`
                      }
                    </label>
                    <input type="file" id="f-logoFile" accept="image/*" style="display:none"/>
                    ${p?.logoData ? '' : `<img id="logo-preview" class="upload-preview-img" src="" style="display:none" alt=""/>`}
                  </div>
                </div>

                <div class="form-row" style="margin-top:16px">
                  <div class="form-group">
                    <label>Nombre del local *</label>
                    <input type="text" id="f-name" class="form-input" placeholder="Osteria dell'Angelo" value="${p?.name || ''}"/>
                  </div>
                  <div class="form-group">
                    <label>Categoría *</label>
                    <select id="f-category" class="form-input">
                      <option value="">Seleccionar...</option>
                      ${['Trattoria','Aperitivo bar','Bar histórico','Craft beer bar','Pizza al taglio','Cucina ebraica','Restaurante','Café','Club','Otro'].map(c => `<option value="${c}"${p?.category === c ? ' selected' : ''}>${c}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Barrio *</label>
                    <select id="f-neighborhood" class="form-input">
                      <option value="">Seleccionar...</option>
                      ${['Trastevere','Prati','Testaccio','Monti','Pigneto','Ghetto','Esquilino','Ostiense','Parioli','EUR','Tiburtino','Garbatella'].map(n => `<option value="${n}"${p?.neighborhood === n ? ' selected' : ''}>${n}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Precio promedio</label>
                    <select id="f-priceRange" class="form-input">
                      <option value="">Sin especificar</option>
                      <option value="< €10"  ${p?.priceRange === '< €10'  ? 'selected' : ''}>Económico · &lt;€10</option>
                      <option value="€10–20" ${p?.priceRange === '€10–20' ? 'selected' : ''}>Moderado · €10–20</option>
                      <option value="€20–40" ${p?.priceRange === '€20–40' ? 'selected' : ''}>Medio-alto · €20–40</option>
                      <option value="> €40"  ${p?.priceRange === '> €40'  ? 'selected' : ''}>Premium · &gt;€40</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group" style="flex:0 0 auto">
                    <label>Emoji</label>
                    <input type="text" id="f-emoji" class="form-input" placeholder="🍝" value="${p?.emoji || ''}" maxlength="2" style="width:72px;text-align:center;font-size:22px"/>
                  </div>
                  <div class="form-group">
                    <label>Color de fondo</label>
                    <div class="color-swatches">
                      ${BG_COLORS.map(c => `<button type="button" class="color-swatch${currentColor === c.value ? ' selected' : ''}" data-color="${c.value}" style="background:${c.value}" title="${c.label}"></button>`).join('')}
                    </div>
                    <input type="hidden" id="f-bgColor" value="${currentColor}"/>
                  </div>
                </div>

              </div>
              <div class="wizard-panel-footer">
                <div></div>
                <button class="btn-primary" id="step1-next">Siguiente: Información →</button>
              </div>
            </div>
          </div>

          <!-- ── STEP 2: INFORMACIÓN ── -->
          <div class="wizard-panel${step === 2 ? ' active' : ''}" id="wizard-panel-2">
            <div class="admin-card">
              <div class="admin-card-head"><span class="admin-card-title">2 · Información y contacto</span></div>
              <div class="admin-card-body">

                <div class="form-group">
                  <label>Descripción</label>
                  <textarea id="f-description" class="form-input form-textarea" placeholder="Describí el local para los estudiantes..." rows="3">${p?.description || ''}</textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Dirección</label>
                    <input type="text" id="f-address" class="form-input" placeholder="Via della Lungaretta 28, Trastevere" value="${p?.address || ''}"/>
                  </div>
                  <div class="form-group">
                    <label>Link Google Maps</label>
                    <input type="url" id="f-maps" class="form-input" placeholder="https://maps.google.com/..." value="${p?.mapsUrl || ''}"/>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" id="f-phone" class="form-input" placeholder="+39 06 581 3798" value="${p?.phone || ''}"/>
                  </div>
                  <div class="form-group">
                    <label>Sitio web</label>
                    <input type="url" id="f-website" class="form-input" placeholder="https://..." value="${p?.website || ''}"/>
                  </div>
                </div>

                <div class="form-group">
                  <label>Horario</label>
                  <div class="hours-presets">
                    ${DAY_PRESETS.map(d => `<button type="button" class="hours-preset-btn${(p?.hours||'').startsWith(d) ? ' active' : ''}" data-days="${d}">${d}</button>`).join('')}
                  </div>
                  <div class="hours-time-row">
                    <input type="time" id="f-hours-open"  class="form-input" style="width:130px" value="${p?.hours?.match(/(\d{2}:\d{2})–/)?.[1] || '12:00'}"/>
                    <span class="hours-sep">–</span>
                    <input type="time" id="f-hours-close" class="form-input" style="width:130px" value="${p?.hours?.match(/–(\d{2}:\d{2})$/)?.[1] || '22:00'}"/>
                  </div>
                  <div class="hours-preview-text" id="hours-preview">${p?.hours || 'Sin horario definido'}</div>
                  <input type="hidden" id="f-hours" value="${p?.hours || ''}"/>
                </div>

              </div>
              <div class="wizard-panel-footer">
                <button class="btn-ghost" id="step2-prev">← Anterior</button>
                <button class="btn-primary" id="step2-next">Siguiente: Oferta & Plan →</button>
              </div>
            </div>
          </div>

          <!-- ── STEP 3: OFERTA & PLAN ── -->
          <div class="wizard-panel${step === 3 ? ' active' : ''}" id="wizard-panel-3">
            <div class="admin-card">
              <div class="admin-card-head"><span class="admin-card-title">3 · Oferta & Plan</span></div>
              <div class="admin-card-body">

                <div class="form-group">
                  <label>Oferta para estudiantes GC</label>
                  <input type="text" id="f-offer" class="form-input form-input-lg" placeholder="Ej: 10% de descuento en almuerzo y cena" value="${p?.offer?.text || ''}"/>
                  <div class="form-hint">Los estudiantes la ven en su GCPass. Sé específico y atractivo.</div>
                </div>

                <div class="form-group">
                  <label>Menú / Carta</label>
                  <label class="file-upload-btn file-upload-btn-secondary" for="f-menuFile">
                    📄 ${p?.menuData ? 'Cambiar menú' : 'Subir menú (PDF o imagen)'}
                  </label>
                  <input type="file" id="f-menuFile" accept=".pdf,image/*" style="display:none"/>
                  <div id="menu-upload-status" style="font-size:12px;color:#22C55E;margin-top:6px;display:${p?.menuData ? 'block' : 'none'}">✓ Menú cargado</div>
                </div>

                <div class="form-group">
                  <label>Plan</label>
                  <div class="plan-cards-grid">
                    <label class="plan-card-option${(!p || p.plan === 'free') ? ' selected' : ''}">
                      <input type="radio" name="plan" value="free" ${(!p || p.plan === 'free') ? 'checked' : ''} style="display:none"/>
                      <div class="plan-card-header plan-card-free">Free</div>
                      <div class="plan-card-price">€0<span>/mes</span></div>
                      <ul class="plan-card-features">
                        <li>✓ Perfil básico</li>
                        <li>✓ Aparece en el mapa</li>
                        <li style="color:#94A3B8">✗ Oferta destacada</li>
                      </ul>
                    </label>
                    <label class="plan-card-option${p?.plan === 'partner' ? ' selected' : ''}">
                      <input type="radio" name="plan" value="partner" ${p?.plan === 'partner' ? 'checked' : ''} style="display:none"/>
                      <div class="plan-card-header plan-card-partner">Partner ★</div>
                      <div class="plan-card-price">€99<span>/mes</span></div>
                      <ul class="plan-card-features">
                        <li>✓ Todo lo de Free</li>
                        <li>✓ Oferta exclusiva GC</li>
                        <li>✓ Métricas en tiempo real</li>
                      </ul>
                    </label>
                    <label class="plan-card-option${p?.plan === 'premium' ? ' selected' : ''}">
                      <input type="radio" name="plan" value="premium" ${p?.plan === 'premium' ? 'checked' : ''} style="display:none"/>
                      <div class="plan-card-header plan-card-premium">Premium 👑</div>
                      <div class="plan-card-price">€199<span>/mes</span></div>
                      <ul class="plan-card-features">
                        <li>✓ Todo lo de Partner</li>
                        <li>✓ Posición top en feed</li>
                        <li>✓ Exclusividad por zona</li>
                      </ul>
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

              </div>
              <div class="wizard-panel-footer">
                <button class="btn-ghost" id="step3-prev">← Anterior</button>
                <button class="btn-primary" id="save-place-btn">${isEditing ? '💾 Guardar cambios' : '✓ Publicar local'}</button>
              </div>
            </div>
          </div>

          </div><!-- /agregar-form-col -->

          <!-- LIVE PREVIEW -->
          <div class="card-preview-panel">
            <div class="card-preview-label">Vista previa en tiempo real</div>
            <div class="card-preview" id="card-preview">
              <div class="card-preview-media" id="preview-media">
                ${p?.imageData || p?.imageUrl
                  ? `<img src="${p.imageData || p.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover"/>`
                  : `<div style="width:100%;height:100%;background:${currentColor};display:flex;align-items:center;justify-content:center;font-size:40px">${p?.emoji || '🏠'}</div>`
                }
              </div>
              <div class="card-preview-body">
                <div class="card-preview-name" id="preview-name">${p?.name || 'Nombre del local'}</div>
                <div class="card-preview-sub" id="preview-sub">${p?.category || 'Categoría'} · ${p?.neighborhood || 'Barrio'}</div>
                ${p?.offer?.text ? `<div class="card-preview-offer" id="preview-offer">🎫 ${p.offer.text}</div>` : `<div class="card-preview-offer" id="preview-offer" style="display:none"></div>`}
              </div>
            </div>

            <div class="preview-stats-box" style="margin-top:16px">
              <div class="preview-stat-row">
                <span>Plan seleccionado</span>
                <span id="preview-plan-chip">${p?.plan || 'free'}</span>
              </div>
              <div class="preview-stat-row">
                <span>Estado</span>
                <span id="preview-status-chip">${!p || p.active ? '🟢 Activo' : '🔴 Inactivo'}</span>
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

  estudiantes() {
    const students = _adminCache.students || [];
    const PERIOD_LABELS = {
      feb26: 'Feb–Jun 2026', sep26: 'Sep 2026–Feb 2027',
      feb27: 'Feb–Jun 2027', sep27: 'Sep 2027–Feb 2028',
    };
    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Estudiantes</h1>
            <p>${students.length} alumno${students.length !== 1 ? 's' : ''} registrado${students.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-body" style="padding:0">
            ${students.length === 0
              ? `<div style="padding:32px;text-align:center;color:#94A3B8;font-size:14px">Ningún estudiante registrado todavía.</div>`
              : `<div class="admin-table-wrap">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Email</th>
                        <th>Universidad</th>
                        <th>Período</th>
                        <th>ID</th>
                        <th>Registrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${students.map(s => {
                        const initials = s.initials || ((s.name||'')[0]||'') + ((s.last_name||'')[0]||'');
                        const date = s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
                        const period = PERIOD_LABELS[s.exchange_period] || s.exchange_period || '—';
                        return `<tr>
                          <td>
                            <div style="display:flex;align-items:center;gap:10px">
                              <div style="width:32px;height:32px;border-radius:50%;background:${s.avatar_color||'#0066FF'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">${initials}</div>
                              <div>
                                <div style="font-weight:600;color:#0F172A">${s.name} ${s.last_name}</div>
                              </div>
                            </div>
                          </td>
                          <td style="color:#475569">${s.email || '—'}</td>
                          <td>${s.university || '—'}</td>
                          <td><span style="font-size:11px;background:#F1F5F9;padding:2px 8px;border-radius:4px;font-weight:600">${period}</span></td>
                          <td style="font-family:monospace;font-size:12px;color:#1D4ED8">${s.student_id || '—'}</td>
                          <td style="color:#94A3B8;font-size:12px">${date}</td>
                        </tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>`}
          </div>
        </div>
      </div>`;
  },

  analitica() {
    const places = getAdminPlaces().filter(p => p.active);
    const month  = _adminCache.analyticsMonth || '';

    function trend(cur, prev) {
      if (prev === 0 && cur === 0) return `<span style="color:#94A3B8">—</span>`;
      if (prev === 0) return `<span style="color:#22C55E">+${cur} nuevo</span>`;
      const pct = Math.round(((cur - prev) / prev) * 100);
      const color = pct >= 0 ? '#22C55E' : '#EF4444';
      const sign  = pct >= 0 ? '+' : '';
      return `<span style="color:${color}">${sign}${pct}% vs mes ant.</span>`;
    }

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <h1>Analítica</h1>
            <p>Métricas del mes actual — ${month}</p>
          </div>
        </div>

        ${places.length === 0 ? `<div class="admin-card"><div class="admin-card-body" style="padding:32px;text-align:center;color:#94A3B8">No hay locales activos todavía.</div></div>` : `
        <div class="admin-card">
          <div class="admin-card-body" style="padding:0">
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Local</th>
                    <th>Plan</th>
                    <th>👁 Vistas</th>
                    <th>💾 Guardados</th>
                    <th>✅ Asistencia</th>
                    <th>📅 Eventos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${places.map(p => {
                    const a = _adminCache.analytics?.[p.id] || {};
                    return `<tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <span style="font-size:20px">${p.emoji||'📍'}</span>
                          <div>
                            <div style="font-weight:700;color:#0F172A">${p.name}</div>
                            <div style="font-size:11px;color:#94A3B8">${p.neighborhood||''}</div>
                          </div>
                        </div>
                      </td>
                      <td><span class="plan-chip plan-chip-${p.plan}">${p.plan}</span></td>
                      <td>
                        <div style="font-weight:700">${a.viewsThis||0}</div>
                        <div style="font-size:11px">${trend(a.viewsThis||0, a.viewsPrev||0)}</div>
                      </td>
                      <td>
                        <div style="font-weight:700">${a.savesThis||0}</div>
                        <div style="font-size:11px">${trend(a.savesThis||0, a.savesPrev||0)}</div>
                      </td>
                      <td>
                        <div style="font-weight:700">${a.attendThis||0}</div>
                        <div style="font-size:11px">${trend(a.attendThis||0, a.attendPrev||0)}</div>
                      </td>
                      <td style="font-weight:700">${a.eventsThis||0}</td>
                      <td><button class="btn-sm-primary" data-report="${p.id}">Ver reporte</button></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>`}
      </div>`;
  },

  reporte() {
    const placeId = adminState.reportPlaceId;
    const place   = getAdminPlaces().find(p => p.id === placeId);
    if (!place) return `<div class="admin-page"><div class="admin-card"><div class="admin-card-body" style="padding:32px;text-align:center;color:#94A3B8">Local no encontrado.</div></div></div>`;

    const a     = _adminCache.analytics?.[placeId] || {};
    const month = _adminCache.analyticsMonth || '';

    function metricRow(icon, label, value, prev) {
      const pct   = prev === 0 ? null : Math.round(((value - prev) / prev) * 100);
      const arrow = pct === null ? '' : pct >= 0 ? '↑' : '↓';
      const color = pct === null ? '#94A3B8' : pct >= 0 ? '#22C55E' : '#EF4444';
      const pctTxt = pct === null ? (prev === 0 && value > 0 ? 'Primeros datos' : '—') : `${arrow} ${Math.abs(pct)}% vs mes anterior`;
      return `
        <div class="report-metric">
          <div class="report-metric-icon">${icon}</div>
          <div class="report-metric-body">
            <div class="report-metric-label">${label}</div>
            <div class="report-metric-value">${value}</div>
            <div class="report-metric-trend" style="color:${color}">${pctTxt}</div>
          </div>
        </div>`;
    }

    const placeEvents = _adminCache.events.filter(e => e.placeId === placeId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const eventsThisMonth = placeEvents.filter(e => e.date >= monthStart);

    return `
      <div class="admin-page">
        <div class="admin-page-header">
          <div>
            <button class="btn-ghost back-btn" data-nav="analitica">← Analítica</button>
          </div>
          <button class="btn-primary" onclick="window.print()">🖨 Imprimir / Exportar PDF</button>
        </div>

        <div class="report-card" id="printable-report">
          <!-- REPORT HEADER -->
          <div class="report-header">
            <div class="report-header-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke:#fff;width:20px;height:20px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>Global Connect</span>
            </div>
            <div class="report-header-title">Reporte Mensual de Performance</div>
            <div class="report-header-sub">${month}</div>
          </div>

          <!-- BUSINESS INFO -->
          <div class="report-business">
            <div class="report-business-emoji">${place.emoji||'📍'}</div>
            <div>
              <div class="report-business-name">${place.name}</div>
              <div class="report-business-meta">${place.category||''} · ${place.neighborhood||''} · Plan <strong>${place.plan}</strong></div>
            </div>
          </div>

          <!-- METRICS -->
          <div class="report-section-title">Métricas del mes</div>
          <div class="report-metrics-grid">
            ${metricRow('👁', 'Vistas al perfil', a.viewsThis||0, a.viewsPrev||0)}
            ${metricRow('💾', 'Nuevos guardados', a.savesThis||0, a.savesPrev||0)}
            ${metricRow('✅', 'Asistencias confirmadas', a.attendThis||0, a.attendPrev||0)}
            ${metricRow('📅', 'Eventos realizados', a.eventsThis||0, a.eventsThis||0)}
          </div>

          <!-- OFFER -->
          ${place.offer?.text ? `
          <div class="report-section-title">Oferta activa</div>
          <div class="report-offer-box">
            <div class="report-offer-label">🎫 Oferta GCPass</div>
            <div class="report-offer-text">${place.offer.text}</div>
          </div>` : ''}

          <!-- EVENTS THIS MONTH -->
          ${eventsThisMonth.length > 0 ? `
          <div class="report-section-title">Eventos este mes</div>
          <div class="report-events-list">
            ${eventsThisMonth.map(e => `
              <div class="report-event-row">
                <span>${e.emoji||'🎉'} <strong>${e.name}</strong></span>
                <span style="color:#64748B">${e.date||''} ${e.time||''}</span>
                <span style="color:#1D4ED8;font-weight:700">${e.price||'—'}</span>
              </div>`).join('')}
          </div>` : ''}

          <!-- FOOTER -->
          <div class="report-footer">
            <div>Generado por Global Connect · hola@globalconnect.app</div>
            <div>${new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'})}</div>
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

  // Analytics → reporte
  content.querySelectorAll('[data-report]').forEach(el => {
    el.addEventListener('click', () => {
      navigate('reporte', { reportPlaceId: parseInt(el.dataset.report) });
    });
  });

  // Plan/active filters
  const fp = content.querySelector('#filter-plan');
  if (fp) fp.addEventListener('change', () => { adminState.filterPlan = fp.value; navigate('locales'); });
  const fa = content.querySelector('#filter-active');
  if (fa) fa.addEventListener('change', () => { adminState.filterActive = fa.value; navigate('locales'); });

  // ── Wizard step navigation ───────────────────────────────────────────────────
  function goToStep(n) {
    adminState.wizardStep = n;
    document.querySelectorAll('.wizard-panel').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === n);
    });
    document.querySelectorAll('.wizard-step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === n);
      el.classList.toggle('done', i + 1 < n);
    });
    document.querySelectorAll('.wizard-step-line').forEach((el, i) => {
      el.classList.toggle('done', i + 1 < n);
    });
  }
  const s1Next = content.querySelector('#step1-next');
  const s2Prev = content.querySelector('#step2-prev');
  const s2Next = content.querySelector('#step2-next');
  const s3Prev = content.querySelector('#step3-prev');
  if (s1Next) s1Next.addEventListener('click', () => {
    const name = document.getElementById('f-name')?.value.trim();
    const cat  = document.getElementById('f-category')?.value;
    const nb   = document.getElementById('f-neighborhood')?.value;
    if (!name) { document.getElementById('f-name')?.focus(); return; }
    if (!cat)  { document.getElementById('f-category')?.focus(); return; }
    if (!nb)   { document.getElementById('f-neighborhood')?.focus(); return; }
    goToStep(2);
    document.getElementById('admin-content').scrollTop = 0;
  });
  if (s2Prev) s2Prev.addEventListener('click', () => { goToStep(1); document.getElementById('admin-content').scrollTop = 0; });
  if (s2Next) s2Next.addEventListener('click', () => { goToStep(3); document.getElementById('admin-content').scrollTop = 0; });
  if (s3Prev) s3Prev.addEventListener('click', () => { goToStep(2); document.getElementById('admin-content').scrollTop = 0; });

  // Wizard step header click
  content.querySelectorAll('[data-goto-step]').forEach(el => {
    el.addEventListener('click', () => {
      const n = parseInt(el.dataset.gotoStep);
      if (n < (adminState.wizardStep || 1)) goToStep(n);
    });
  });

  // Plan cards click
  content.querySelectorAll('.plan-card-option').forEach(el => {
    el.addEventListener('click', () => {
      content.querySelectorAll('.plan-card-option').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      const radio = el.querySelector('input[type=radio]');
      if (radio) radio.checked = true;
      const previewChip = document.getElementById('preview-plan-chip');
      if (previewChip) previewChip.textContent = radio?.value || '';
    });
  });

  // ── Agregar/Editar form ──────────────────────────────────────────────────────
  const emojiInput = content.querySelector('#f-emoji');
  if (emojiInput) {
    emojiInput.addEventListener('input', () => {
      updateCardPreview();
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
      const chip = document.getElementById('preview-status-chip');
      if (chip) chip.textContent = activeToggle.checked ? '🟢 Activo' : '🔴 Inactivo';
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

    const mediEl = document.getElementById('preview-media');
    if (mediEl) {
      if (imageSrc) {
        mediEl.innerHTML = `<img src="${imageSrc}" alt="" style="width:100%;height:100%;object-fit:cover"/>`;
      } else if (logoSrc) {
        mediEl.innerHTML = `<div style="width:100%;height:100%;background:${bgColor};display:flex;align-items:center;justify-content:center"><img src="${logoSrc}" alt="" style="max-height:60%;max-width:70%"/></div>`;
      } else {
        mediEl.innerHTML = `<div style="width:100%;height:100%;background:${bgColor};display:flex;align-items:center;justify-content:center;font-size:40px">${emoji}</div>`;
      }
    }
    const nameEl  = document.getElementById('preview-name');
    const subEl   = document.getElementById('preview-sub');
    const offerEl = document.getElementById('preview-offer');
    if (nameEl)  nameEl.textContent  = name;
    if (subEl)   subEl.textContent   = `${category} · ${neighborhood}`;
    if (offerEl) { offerEl.textContent = offerText ? '🎫 ' + offerText : ''; offerEl.style.display = offerText ? '' : 'none'; }
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
    if (el.dataset.nav === 'agregar') { adminState.editingPlaceId = null; adminState.wizardStep = 1; }
    navigate(el.dataset.nav);
  });
});

document.getElementById('sidebar-logout')?.addEventListener('click', async () => {
  if (!confirm('¿Cerrar sesión?')) return;
  await sb.auth.signOut();
  _adminCache.session = null;
  _adminCache.profile = null;
  const el = document.getElementById('topbar-admin-name');
  if (el) el.textContent = '●';
  renderAdminLogin();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
initAdmin();
