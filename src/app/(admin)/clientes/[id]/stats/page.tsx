import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Bookmark, Gift, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import EstabStatsReport from '@/components/admin/EstabStatsReport'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteStatsPage({ params }: Props) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const now = new Date()
  const thisMonthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    { data: estab },
    { data: events },
    { data: savedBenefits },
    { data: redemptions },
    { data: promotions },
  ] = await Promise.all([
    supabase.from('establishments').select('id, name, city, plan, is_active').eq('id', id).single(),
    supabase.from('events')
      .select('created_at, user_id')
      .eq('type', 'establishment_view')
      .eq('establishment_id', id)
      .gte('created_at', lastMonthStart),
    supabase.from('saved_benefits')
      .select('id, saved_at, status, promotion_id, user_id')
      .eq('establishment_id', id),
    supabase.from('redemptions')
      .select('id, redeemed_at, promotion_id, user_id, rating')
      .eq('establishment_id', id),
    supabase.from('promotions')
      .select('id, title, discount_percentage, is_active')
      .eq('establishment_id', id),
  ])

  if (!estab) notFound()

  // --- Top universities from saved-benefit users ---
  const savedUserIds = [...new Set((savedBenefits ?? []).map((b: any) => b.user_id).filter(Boolean))]
  const { data: savedUserProfiles } = savedUserIds.length > 0
    ? await supabase.from('profiles').select('id, university').in('id', savedUserIds)
    : { data: [] }

  const univCounts: Record<string, number> = {}
  for (const p of savedUserProfiles ?? []) {
    if (p.university) univCounts[p.university] = (univCounts[p.university] ?? 0) + 1
  }
  const topUniversities = Object.entries(univCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, pct: Math.round((count / savedUserIds.length) * 100) }))

  const monthName     = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' })

  // --- Views ---
  const viewsThis  = (events ?? []).filter((e: any) => e.created_at >= thisMonthStart).length
  const viewsLast  = (events ?? []).filter((e: any) => e.created_at >= lastMonthStart && e.created_at < thisMonthStart).length
  const viewDelta  = viewsLast > 0 ? Math.round(((viewsThis - viewsLast) / viewsLast) * 100) : null
  const uniqueVisitors = new Set(
    (events ?? []).filter((e: any) => e.created_at >= thisMonthStart && e.user_id).map((e: any) => e.user_id)
  ).size

  // --- Saved benefits ---
  const totalSaved    = (savedBenefits ?? []).length
  const totalRedeemed = (savedBenefits ?? []).filter((b: any) => b.status === 'redeemed').length

  // --- Per-promotion breakdown ---
  const promoMap: Record<string, { title: string; discount: number | null; active: boolean }> = {}
  for (const p of promotions ?? []) {
    promoMap[p.id] = { title: p.title, discount: p.discount_percentage, active: p.is_active }
  }

  type PromoRow = {
    id: string; title: string; discount: number | null; active: boolean
    saved: number; redeemed: number; redemptionRate: number
  }

  const promoStats: Record<string, { saved: number; redeemed: number }> = {}
  for (const b of savedBenefits ?? []) {
    if (!b.promotion_id) continue
    if (!promoStats[b.promotion_id]) promoStats[b.promotion_id] = { saved: 0, redeemed: 0 }
    promoStats[b.promotion_id].saved++
    if (b.status === 'redeemed') promoStats[b.promotion_id].redeemed++
  }

  const promoRows: PromoRow[] = Object.entries(promoStats)
    .map(([pid, s]) => ({
      id: pid,
      title: promoMap[pid]?.title ?? '(promo eliminada)',
      discount: promoMap[pid]?.discount ?? null,
      active: promoMap[pid]?.active ?? false,
      saved: s.saved,
      redeemed: s.redeemed,
      redemptionRate: s.saved > 0 ? Math.round((s.redeemed / s.saved) * 100) : 0,
    }))
    .sort((a, b) => b.saved - a.saved)

  // --- Avg rating ---
  const ratings = (redemptions ?? []).map((r: any) => r.rating).filter(Boolean) as number[]
  const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : null

  // --- Peak days of week ---
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const dayCount = [0, 0, 0, 0, 0, 0, 0]
  for (const e of events ?? []) {
    if (e.created_at >= thisMonthStart) {
      dayCount[new Date(e.created_at).getDay()]++
    }
  }
  const maxDayCount = Math.max(...dayCount, 1)
  const peakDays = dayCount
    .map((count, i) => ({ day: DAY_NAMES[i], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .filter((d) => d.count > 0)

  const planLabels: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Pro' }

  return (
    <>
      {/* Back link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href="/clientes" className="btn btn-ghost btn-sm" style={{ gap: 6, paddingLeft: 6 }}>
          <ArrowLeft size={14} /> Volver a clientes
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '0.5rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>{estab.name}</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            {estab.city} · Plan {planLabels[estab.plan] ?? estab.plan} · Estadísticas de actividad
          </p>
        </div>
        <Link href={`/clientes/${id}`} className="btn btn-outline btn-sm">
          Editar cliente
        </Link>
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', margin: '1.5rem 0 1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><Eye size={18} /></div>
          <div className="stat-info">
            <div className="stat-value">{viewsThis}</div>
            <div className="stat-label">
              Vistas este mes
              {uniqueVisitors > 0 && (
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 1 }}>
                  {uniqueVisitors} visitantes únicos
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>
            <Eye size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{viewsLast}</div>
            <div className="stat-label">Vistas {lastMonthName}</div>
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
            <div className="stat-label">
              Canjes realizados
              {avgRating && (
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 1 }}>
                  ★ {avgRating} promedio
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

        {/* Promotions breakdown */}
        <div>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
            Desglose por promoción
          </h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Promoción</th>
                  <th>Descuento</th>
                  <th style={{ textAlign: 'right' }}>Guardados</th>
                  <th style={{ textAlign: 'right' }}>Canjeados</th>
                  <th style={{ textAlign: 'right' }}>Tasa canje</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {promoRows.length === 0 ? (
                  <tr><td colSpan={6} className="admin-table-empty">Ningún usuario guardó beneficios todavía.</td></tr>
                ) : (
                  promoRows.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500, maxWidth: 200 }}>{row.title}</td>
                      <td style={{ color: 'var(--accent)' }}>
                        {row.discount ? `${row.discount}% off` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.saved}</td>
                      <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 600 }}>{row.redeemed}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: 700,
                          color: row.redemptionRate >= 50 ? '#4caf50' : row.redemptionRate >= 20 ? 'var(--secondary)' : 'var(--text-faint)',
                        }}>
                          {row.redemptionRate}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.active ? 'badge-active' : 'badge-inactive'}`}>
                          {row.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Top universities */}
          {topUniversities.length > 0 && (
            <div className="admin-form-card" style={{ maxWidth: 'none', padding: '1rem 1.25rem', marginTop: '1rem' }}>
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
                Universidades más frecuentes
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {topUniversities.map(({ name, pct }) => (
                  <span key={name} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', background: 'rgba(0,206,201,0.08)', border: '1px solid rgba(0,206,201,0.2)', borderRadius: 'var(--radius-full)', padding: '3px 10px' }}>
                    {name} <span style={{ color: 'var(--secondary)' }}>{pct}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Month comparison + report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* View trend */}
          <div className="admin-form-card" style={{ maxWidth: 'none', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              Comparativa de visitas
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: monthName.split(' ')[0], value: viewsThis, color: 'var(--primary)' },
                { label: lastMonthName, value: viewsLast, color: 'rgba(0,0,0,0.12)' },
              ].map(({ label, value, color }) => {
                const max = Math.max(viewsThis, viewsLast, 1)
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>{label}</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
              {viewDelta !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, marginTop: 4,
                  color: viewDelta > 0 ? '#4caf50' : viewDelta < 0 ? '#f44336' : 'var(--text-faint)',
                }}>
                  {viewDelta > 0 ? <TrendingUp size={13} /> : viewDelta < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                  {viewDelta > 0 ? `+${viewDelta}%` : `${viewDelta}%`} vs {lastMonthName}
                </div>
              )}
            </div>
          </div>

          {/* Peak days */}
          {peakDays.length > 0 && (
            <div className="admin-form-card" style={{ maxWidth: 'none', padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.875rem' }}>
                Pico de visitas
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: '0 0 0.875rem' }}>
                {peakDays.length === 1 ? 'Tu pico es ' : 'Tus picos son '}
                <strong>{peakDays.map((d) => d.day).join(' y ')}</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DAY_NAMES.map((day, i) => (
                  <div key={day}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 3 }}>
                      <span>{day}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{dayCount[i]}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(dayCount[i] / maxDayCount) * 100}%`, background: peakDays.some((d) => d.day === day) ? 'var(--primary)' : 'rgba(0,0,0,0.1)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report generator */}
          <EstabStatsReport report={{
            name: estab.name,
            city: estab.city ?? '',
            plan: planLabels[estab.plan] ?? estab.plan,
            monthName,
            lastMonthName,
            viewsThis,
            viewsLast,
            viewDelta,
            uniqueVisitors,
            totalSaved,
            totalRedeemed,
            avgRating,
            promoRows: promoRows.map(r => ({
              title: r.title,
              discount: r.discount,
              saved: r.saved,
              redeemed: r.redeemed,
              redemptionRate: r.redemptionRate,
            })),
          }} />
        </div>
      </div>
    </>
  )
}
