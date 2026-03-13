import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, BarChart2, Bookmark, Gift } from 'lucide-react'
import AnalyticsFilters from '@/components/admin/AnalyticsFilters'

const PLAN_COLORS: Record<string, string> = {
  free:  'var(--text-faint)',
  basic: 'var(--secondary)',
  pro:   'var(--primary-light)',
}
const PLAN_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Pro' }

interface SearchProps {
  searchParams: Promise<{ q?: string; sort?: string }>
}

export default async function AnalyticsPage({ searchParams }: SearchProps) {
  const { q, sort = 'views' } = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const monthName      = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const lastMonthName  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' })

  const [
    { data: establishments },
    { data: events },
    { data: saved },
    { data: redeemed },
  ] = await Promise.all([
    supabase.from('establishments').select('id, name, city, plan, is_active').order('name'),
    supabase.from('events')
      .select('establishment_id, created_at')
      .eq('type', 'establishment_view')
      .gte('created_at', lastMonthStart),
    supabase.from('saved_benefits').select('establishment_id'),
    supabase.from('redemptions').select('establishment_id'),
  ])

  // Aggregate
  const viewsThis: Record<string, number> = {}
  const viewsLast: Record<string, number> = {}
  for (const e of events ?? []) {
    if (!e.establishment_id) continue
    if (e.created_at >= thisMonthStart)
      viewsThis[e.establishment_id] = (viewsThis[e.establishment_id] ?? 0) + 1
    else
      viewsLast[e.establishment_id] = (viewsLast[e.establishment_id] ?? 0) + 1
  }
  const savedCount:    Record<string, number> = {}
  const redeemedCount: Record<string, number> = {}
  for (const s of saved    ?? []) if (s.establishment_id) savedCount[s.establishment_id]    = (savedCount[s.establishment_id]    ?? 0) + 1
  for (const r of redeemed ?? []) if (r.establishment_id) redeemedCount[r.establishment_id] = (redeemedCount[r.establishment_id] ?? 0) + 1

  // Build rows
  let rows = (establishments ?? []).map((e: any) => {
    const vt = viewsThis[e.id] ?? 0
    const vl = viewsLast[e.id] ?? 0
    const delta = vl > 0 ? Math.round(((vt - vl) / vl) * 100) : null
    return {
      id: e.id, name: e.name, city: e.city, plan: e.plan ?? 'free',
      isActive: e.is_active, vt, vl, delta,
      saved: savedCount[e.id] ?? 0,
      redeemed: redeemedCount[e.id] ?? 0,
    }
  })

  // Filter
  if (q) {
    const lq = q.toLowerCase()
    rows = rows.filter((r: any) =>
      r.name.toLowerCase().includes(lq) || r.city?.toLowerCase().includes(lq)
    )
  }

  // Sort
  if (sort === 'views')    rows.sort((a: any, b: any) => b.vt - a.vt)
  if (sort === 'saved')    rows.sort((a: any, b: any) => b.saved - a.saved)
  if (sort === 'redeemed') rows.sort((a: any, b: any) => b.redeemed - a.redeemed)
  if (sort === 'trend')    rows.sort((a: any, b: any) => (b.delta ?? -999) - (a.delta ?? -999))

  const totalViews    = rows.reduce((s: number, r: any) => s + r.vt, 0)
  const totalSaved    = rows.reduce((s: number, r: any) => s + r.saved, 0)
  const totalRedeemed = rows.reduce((s: number, r: any) => s + r.redeemed, 0)

  return (
    <>
      <h1 className="admin-page-title">Estadísticas</h1>
      <p className="admin-page-subtitle">
        Actividad por establecimiento — {monthName}
      </p>

      {/* Summary KPIs */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><BarChart2 size={18} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalViews}</div>
            <div className="stat-label">Vistas totales este mes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><Bookmark size={18} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalSaved}</div>
            <div className="stat-label">Beneficios guardados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><Gift size={18} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalRedeemed}</div>
            <div className="stat-label">Canjes realizados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(253,203,110,0.15)', color: '#fdcb6e' }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{rows.filter((r: any) => (r.delta ?? 0) > 0).length}</div>
            <div className="stat-label">Con crecimiento vs {lastMonthName}</div>
          </div>
        </div>
      </div>

      {/* Filter + sort toolbar */}
      <AnalyticsFilters q={q ?? ''} sort={sort} count={rows.length} />

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', gridColumn: '1/-1', padding: '2rem 0', textAlign: 'center' }}>
            Sin resultados.
          </p>
        ) : (
          rows.map((row: any) => {
            const planColor = PLAN_COLORS[row.plan] ?? PLAN_COLORS.free
            const barMax = Math.max(row.vt, row.vl, 1)
            return (
              <div key={row.id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', padding: '1.125rem',
                display: 'flex', flexDirection: 'column', gap: '0.875rem',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {row.city}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, color: planColor,
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${planColor}40`,
                    borderRadius: 'var(--radius-full)', padding: '2px 8px', flexShrink: 0,
                    textTransform: 'uppercase',
                  }}>
                    {PLAN_LABELS[row.plan] ?? row.plan}
                  </span>
                </div>

                {/* Metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                  {[
                    { label: 'Vistas', value: row.vt, color: 'var(--primary-light)' },
                    { label: 'Guardados', value: row.saved, color: 'var(--secondary)' },
                    { label: 'Canjes', value: row.redeemed, color: 'var(--accent)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                      padding: '0.5rem 0.25rem',
                    }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Mini bar comparison */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: 5 }}>
                    <span>vs {lastMonthName}</span>
                    {row.delta !== null && (
                      <span style={{
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
                        color: row.delta > 0 ? '#4caf50' : row.delta < 0 ? '#f44336' : 'var(--text-faint)',
                      }}>
                        {row.delta > 0 ? <TrendingUp size={11} /> : row.delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                        {row.delta > 0 ? `+${row.delta}%` : `${row.delta}%`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { label: monthName.split(' ')[0], v: row.vt, color: 'var(--primary)' },
                      { label: lastMonthName,           v: row.vl, color: 'rgba(255,255,255,0.12)' },
                    ].map(({ label, v, color }) => (
                      <div key={label} style={{ flex: 1 }}>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 3 }}>
                          <div style={{ height: '100%', width: `${(v / barMax) * 100}%`, background: color, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>{label} · {v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={`/establishments/${row.id}/stats`}
                  className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'center', fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                >
                  Ver estadísticas completas →
                </Link>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
