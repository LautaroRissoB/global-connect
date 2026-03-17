import { createClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, DollarSign, Users, Building2, BarChart3 } from 'lucide-react'

const PLAN_PRICES: Record<string, number> = { free: 0, basic: 50, pro: 100 }
const PLAN_LABELS: Record<string, string>  = { free: 'Gratuito', basic: 'Básico', pro: 'Pro' }
const PLAN_COLORS: Record<string, string>  = {
  free:  'var(--text-faint)',
  basic: 'var(--secondary)',
  pro:   'var(--primary-light)',
}
const CATEGORIES: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', club: 'Discoteca',
  cafe: 'Cafetería', cultural: 'Teatro & Cultura', theater: 'Teatro',
  sports: 'Deportes', other: 'Otro',
}

export default async function EmpresaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const now = new Date()

  // Last 6 months for growth chart
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [{ data: establishments }, { data: users }] = await Promise.all([
    supabase.from('establishments').select('id, name, category, plan, is_active, created_at').order('created_at'),
    supabase.from('profiles').select('id, created_at').order('created_at'),
  ])

  const allEstabs  = establishments ?? []
  const allUsers   = users ?? []

  // ── MRR ──────────────────────────────────────────────────
  const active = allEstabs.filter((e: any) => e.is_active)
  const inactive = allEstabs.filter((e: any) => !e.is_active)

  const mrr = active.reduce((sum: number, e: any) => sum + (PLAN_PRICES[e.plan ?? 'free'] ?? 0), 0)

  const planCounts: Record<string, { active: number; inactive: number }> = { free: { active: 0, inactive: 0 }, basic: { active: 0, inactive: 0 }, pro: { active: 0, inactive: 0 } }
  for (const e of allEstabs) {
    const p = e.plan ?? 'free'
    if (!planCounts[p]) planCounts[p] = { active: 0, inactive: 0 }
    if (e.is_active) planCounts[p].active++
    else             planCounts[p].inactive++
  }

  // ── Growth by category ───────────────────────────────────
  const catActive:   Record<string, number> = {}
  const catInactive: Record<string, number> = {}
  for (const e of allEstabs) {
    const c = e.category ?? 'other'
    if (e.is_active) catActive[c]   = (catActive[c]   ?? 0) + 1
    else             catInactive[c] = (catInactive[c] ?? 0) + 1
  }
  const categories = Object.keys({ ...catActive, ...catInactive })
    .sort((a, b) => ((catActive[b] ?? 0) + (catInactive[b] ?? 0)) - ((catActive[a] ?? 0) + (catInactive[a] ?? 0)))

  // ── Monthly growth (last 6 months) ───────────────────────
  const months: { label: string; estabs: number; users: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end  = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString()
    const label = d.toLocaleDateString('es-AR', { month: 'short' })

    const estabsUntil = allEstabs.filter((e: any) => e.created_at < end).length
    const usersUntil  = allUsers.filter((u: any)  => u.created_at < end).length

    months.push({ label, estabs: estabsUntil, users: usersUntil })
  }

  // ── Projection (linear: last 3 months avg growth) ────────
  const lastThree = months.slice(-3)
  const estabGrowthPerMonth = lastThree.length >= 2
    ? (lastThree[lastThree.length - 1].estabs - lastThree[0].estabs) / (lastThree.length - 1)
    : 0
  const projectedNext3 = [1, 2, 3].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return {
      label: d.toLocaleDateString('es-AR', { month: 'short' }),
      estabs: Math.round(months[months.length - 1].estabs + estabGrowthPerMonth * i),
    }
  })

  // ── Growth vs last month ──────────────────────────────────
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const newEstabsThisMonth = allEstabs.filter((e: any) => e.created_at >= thisMonthStart).length
  const newEstabsLastMonth = allEstabs.filter((e: any) => e.created_at >= lastMonthStart && e.created_at < thisMonthStart).length
  const estabDelta = newEstabsLastMonth > 0
    ? Math.round(((newEstabsThisMonth - newEstabsLastMonth) / newEstabsLastMonth) * 100)
    : null

  const newUsersThisMonth = allUsers.filter((u: any) => u.created_at >= thisMonthStart).length
  const newUsersLastMonth = allUsers.filter((u: any) => u.created_at >= lastMonthStart && u.created_at < thisMonthStart).length

  // ── Chart scales ─────────────────────────────────────────
  const maxEstabsChart = Math.max(...months.map((m) => m.estabs), ...projectedNext3.map((p) => p.estabs), 1)
  const maxCatBar = Math.max(...categories.map((c) => (catActive[c] ?? 0) + (catInactive[c] ?? 0)), 1)

  // ── Projected MRR ────────────────────────────────────────
  const mrrPerEstab = active.length > 0 ? mrr / active.length : 0
  const projectedMRR3m = Math.round(mrrPerEstab * projectedNext3[2].estabs)

  return (
    <>
      <h1 className="admin-page-title">Mi Empresa</h1>
      <p className="admin-page-subtitle">Métricas de negocio y proyecciones — {now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>

      {/* ── KPIs top ─────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--primary-light)' }}>
            <DollarSign size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">${mrr}</div>
            <div className="stat-label">MRR actual</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,206,201,0.12)', color: 'var(--secondary)' }}>
            <Building2 size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {active.length}
              {estabDelta !== null && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: 8, color: estabDelta >= 0 ? '#4caf50' : '#f44336' }}>
                  {estabDelta >= 0 ? '+' : ''}{estabDelta}%
                </span>
              )}
            </div>
            <div className="stat-label">Clientes activos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,118,117,0.12)', color: 'var(--accent)' }}>
            <Building2 size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{inactive.length}</div>
            <div className="stat-label">Clientes inactivos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(253,203,110,0.15)', color: '#fdcb6e' }}>
            <Users size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{allUsers.length}</div>
            <div className="stat-label">Estudiantes totales</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: 'var(--primary-light)' }}>
            <BarChart3 size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">+{newEstabsThisMonth}</div>
            <div className="stat-label">Clientes nuevos este mes</div>
          </div>
        </div>
      </div>

      {/* ── Row 1: Ingresos por plan + Activos/inactivos por categoría ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Ingresos por plan */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Ingresos por plan</div>

          {['free', 'basic', 'pro'].map((plan) => {
            const counts = planCounts[plan] ?? { active: 0, inactive: 0 }
            const revenue = counts.active * PLAN_PRICES[plan]
            const totalForPlan = counts.active + counts.inactive
            return (
              <div key={plan} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, color: PLAN_COLORS[plan],
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${PLAN_COLORS[plan]}30`,
                      borderRadius: 'var(--radius-full)', padding: '2px 8px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {PLAN_LABELS[plan]}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {counts.active} activos · {counts.inactive} inactivos
                    </span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: revenue > 0 ? PLAN_COLORS[plan] : 'var(--text-faint)' }}>
                    ${revenue}
                  </span>
                </div>
                {/* Bar */}
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${allEstabs.length > 0 ? (totalForPlan / allEstabs.length) * 100 : 0}%`, background: PLAN_COLORS[plan], borderRadius: 3, opacity: 0.8 }} />
                </div>
              </div>
            )
          })}

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MRR total</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-light)' }}>${mrr}</span>
          </div>
        </div>

        {/* Activos vs inactivos por categoría */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Clientes por categoría</div>

          {categories.map((cat) => {
            const a = catActive[cat] ?? 0
            const i = catInactive[cat] ?? 0
            const total = a + i
            return (
              <div key={cat} style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{CATEGORIES[cat] ?? cat}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{a}</span> activos · <span style={{ color: 'var(--text-faint)' }}>{i} inactivos</span>
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${(a / maxCatBar) * 100}%`, background: 'var(--secondary)', borderRadius: '4px 0 0 4px', opacity: 0.85 }} />
                  <div style={{ height: '100%', width: `${(i / maxCatBar) * 100}%`, background: 'rgba(255,255,255,0.12)' }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 3 }}>{total} total</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Row 2: Gráfico de crecimiento + proyección ─── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Crecimiento histórico + proyección</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
              Clientes totales · línea real + proyección 3 meses
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>MRR proyectado en 3m</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-light)' }}>${projectedMRR3m}</div>
          </div>
        </div>

        {/* Bar chart: historical */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
          {months.map((m, i) => (
            <div key={`h-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600 }}>{m.estabs}</div>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${(m.estabs / maxEstabsChart) * 72}px`,
                background: i === months.length - 1 ? 'var(--primary)' : 'rgba(108,92,231,0.45)',
                minHeight: 3,
              }} />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{m.label}</div>
            </div>
          ))}

          {/* Separator */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.15)', height: '80%', alignSelf: 'center', margin: '0 4px' }} />

          {/* Projected bars */}
          {projectedNext3.map((p, i) => (
            <div key={`p-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: 600, opacity: 0.7 }}>{p.estabs}</div>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${(p.estabs / maxEstabsChart) * 72}px`,
                background: 'rgba(108,92,231,0.2)',
                border: '1px dashed rgba(108,92,231,0.4)',
                minHeight: 3,
                boxSizing: 'border-box',
              }} />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', opacity: 0.7 }}>{p.label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: '0.875rem', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)', opacity: 0.8 }} />
            Histórico
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, border: '1px dashed rgba(108,92,231,0.6)', background: 'rgba(108,92,231,0.15)' }} />
            Proyección ({estabGrowthPerMonth > 0 ? `+${estabGrowthPerMonth.toFixed(1)}` : estabGrowthPerMonth.toFixed(1)} clientes/mes)
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {newUsersThisMonth > 0 && (
              <>
                <TrendingUp size={12} style={{ color: '#4caf50' }} />
                <span style={{ color: '#4caf50' }}>+{newUsersThisMonth} estudiantes nuevos este mes</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
