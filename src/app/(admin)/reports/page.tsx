import { createClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:  { label: 'Gratuito', color: 'var(--text-faint)' },
  basic: { label: 'Básico',   color: 'var(--secondary)' },
  pro:   { label: 'Pro',      color: 'var(--primary-light)' },
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' })

  const [{ data: establishments }, { data: events }] = await Promise.all([
    supabase
      .from('establishments')
      .select('id, name, city, plan')
      .order('name'),
    supabase
      .from('events')
      .select('establishment_id, created_at')
      .eq('type', 'establishment_view')
      .gte('created_at', lastMonthStart),
  ])

  // Aggregate views per establishment per period
  const thisMonth: Record<string, number> = {}
  const lastMonth: Record<string, number> = {}

  for (const ev of events ?? []) {
    if (!ev.establishment_id) continue
    if (ev.created_at >= thisMonthStart) {
      thisMonth[ev.establishment_id] = (thisMonth[ev.establishment_id] ?? 0) + 1
    } else {
      lastMonth[ev.establishment_id] = (lastMonth[ev.establishment_id] ?? 0) + 1
    }
  }

  // Build rows sorted by this month views desc
  const rows = (establishments ?? [])
    .map((e) => ({
      ...e,
      plan: e.plan ?? 'free',
      viewsThis: thisMonth[e.id] ?? 0,
      viewsLast: lastMonth[e.id] ?? 0,
    }))
    .sort((a, b) => b.viewsThis - a.viewsThis)

  const totalThisMonth = rows.reduce((s, r) => s + r.viewsThis, 0)
  const totalLastMonth = rows.reduce((s, r) => s + r.viewsLast, 0)
  const totalDelta = totalLastMonth > 0
    ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100)
    : null

  return (
    <>
      <h1 className="admin-page-title">Reportes de visitas</h1>
      <p className="admin-page-subtitle">
        Vistas por establecimiento — {monthName}
      </p>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple">
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalThisMonth}</div>
            <div className="stat-label">
              Vistas este mes
              {totalDelta !== null && (
                <span style={{
                  marginLeft: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: totalDelta >= 0 ? '#4caf50' : '#f44336',
                }}>
                  {totalDelta >= 0 ? '+' : ''}{totalDelta}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalLastMonth}</div>
            <div className="stat-label">Vistas {lastMonthName}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pink">
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {rows.filter((r) => r.plan !== 'free').length}
            </div>
            <div className="stat-label">Con plan de pago</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Establecimiento</th>
              <th>Ciudad</th>
              <th>Plan</th>
              <th style={{ textAlign: 'right' }}>{monthName.split(' ')[0]} (este mes)</th>
              <th style={{ textAlign: 'right' }}>{lastMonthName}</th>
              <th style={{ textAlign: 'right' }}>Variación</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  No hay establecimientos todavía.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const delta = row.viewsLast > 0
                  ? Math.round(((row.viewsThis - row.viewsLast) / row.viewsLast) * 100)
                  : null
                const plan = PLAN_LABELS[row.plan] ?? PLAN_LABELS.free
                return (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{row.city}</td>
                    <td>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: plan.color,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${plan.color}40`,
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                      }}>
                        {plan.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                      {row.viewsThis}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {row.viewsLast}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {delta === null ? (
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>—</span>
                      ) : delta === 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-faint)', fontSize: '0.8rem' }}>
                          <Minus size={12} /> 0%
                        </span>
                      ) : delta > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#4caf50', fontSize: '0.8rem', fontWeight: 700 }}>
                          <TrendingUp size={12} /> +{delta}%
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#f44336', fontSize: '0.8rem', fontWeight: 700 }}>
                          <TrendingDown size={12} /> {delta}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
