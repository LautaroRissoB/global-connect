import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, BarChart2, Bookmark, Gift, Globe } from 'lucide-react'
import AnalyticsFilters from '@/components/admin/AnalyticsFilters'

const PLAN_COLORS: Record<string, string> = {
  free:  'var(--text-faint)',
  basic: 'var(--secondary)',
  pro:   'var(--primary-light)',
}
const PLAN_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Pro' }

const FLAG_MAP: Record<string, string> = {
  argentina:'🇦🇷', brasil:'🇧🇷', brazil:'🇧🇷', colombia:'🇨🇴',
  mexico:'🇲🇽', méxico:'🇲🇽', chile:'🇨🇱', peru:'🇵🇪', perú:'🇵🇪',
  uruguay:'🇺🇾', paraguay:'🇵🇾', bolivia:'🇧🇴', venezuela:'🇻🇪', ecuador:'🇪🇨',
  españa:'🇪🇸', spain:'🇪🇸', 'estados unidos':'🇺🇸', 'united states':'🇺🇸', usa:'🇺🇸',
  alemania:'🇩🇪', germany:'🇩🇪', italia:'🇮🇹', italy:'🇮🇹',
  francia:'🇫🇷', france:'🇫🇷', portugal:'🇵🇹',
  'reino unido':'🇬🇧', 'united kingdom':'🇬🇧', uk:'🇬🇧',
  canada:'🇨🇦', canadá:'🇨🇦', australia:'🇦🇺',
  china:'🇨🇳', india:'🇮🇳', japón:'🇯🇵', japan:'🇯🇵',
  turquía:'🇹🇷', turkey:'🇹🇷', suecia:'🇸🇪', sweden:'🇸🇪',
  holanda:'🇳🇱', netherlands:'🇳🇱', bélgica:'🇧🇪', belgium:'🇧🇪',
  suiza:'🇨🇭', switzerland:'🇨🇭', austria:'🇦🇹',
  polonia:'🇵🇱', poland:'🇵🇱', grecia:'🇬🇷', greece:'🇬🇷',
  rusia:'🇷🇺', russia:'🇷🇺', 'costa rica':'🇨🇷',
  noruega:'🇳🇴', norway:'🇳🇴', dinamarca:'🇩🇰', denmark:'🇩🇰',
  finlandia:'🇫🇮', finland:'🇫🇮',
}

function countryFlag(name: string): string {
  return FLAG_MAP[name.toLowerCase().trim()] ?? '🌍'
}

function topCountriesFromUsers(
  userIds: string[],
  countryMap: Record<string, string>,
  limit = 3
): { country: string; flag: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const uid of userIds) {
    const c = countryMap[uid]
    if (c) counts[c] = (counts[c] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, count]) => ({ country, flag: countryFlag(country), count }))
}

interface SearchProps {
  searchParams: Promise<{ q?: string; sort?: string }>
}

export default async function EstadisticasPage({ searchParams }: SearchProps) {
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
      .select('establishment_id, created_at, user_id')
      .eq('type', 'establishment_view')
      .gte('created_at', lastMonthStart),
    supabase.from('saved_benefits').select('establishment_id').gte('saved_at', thisMonthStart),
    supabase.from('redemptions').select('establishment_id').gte('redeemed_at', thisMonthStart),
  ])

  const viewerUserIds = [...new Set(
    (events ?? []).filter((e: any) => e.user_id && e.created_at >= thisMonthStart).map((e: any) => e.user_id)
  )]
  const { data: viewerProfiles } = viewerUserIds.length > 0
    ? await supabase.from('profiles').select('id, home_country').in('id', viewerUserIds)
    : { data: [] }

  const profileCountryMap: Record<string, string> = {}
  for (const p of viewerProfiles ?? []) {
    if (p.home_country) profileCountryMap[p.id] = p.home_country
  }

  const viewsThis: Record<string, number> = {}
  const viewsLast: Record<string, number> = {}
  const viewersByEstab: Record<string, string[]> = {}

  for (const e of events ?? []) {
    if (!e.establishment_id) continue
    if (e.created_at >= thisMonthStart) {
      viewsThis[e.establishment_id] = (viewsThis[e.establishment_id] ?? 0) + 1
      if (e.user_id) {
        if (!viewersByEstab[e.establishment_id]) viewersByEstab[e.establishment_id] = []
        viewersByEstab[e.establishment_id].push(e.user_id)
      }
    } else {
      viewsLast[e.establishment_id] = (viewsLast[e.establishment_id] ?? 0) + 1
    }
  }

  const savedCount:    Record<string, number> = {}
  const redeemedCount: Record<string, number> = {}
  for (const s of saved    ?? []) if (s.establishment_id) savedCount[s.establishment_id]    = (savedCount[s.establishment_id]    ?? 0) + 1
  for (const r of redeemed ?? []) if (r.establishment_id) redeemedCount[r.establishment_id] = (redeemedCount[r.establishment_id] ?? 0) + 1

  let rows = (establishments ?? []).map((e: any) => {
    const vt       = viewsThis[e.id] ?? 0
    const vl       = viewsLast[e.id] ?? 0
    const sv       = savedCount[e.id] ?? 0
    const rd       = redeemedCount[e.id] ?? 0
    const delta    = vl > 0 ? Math.round(((vt - vl) / vl) * 100) : null
    const saveRate = vt > 0 ? Math.round((sv / vt) * 100) : 0
    const topC     = topCountriesFromUsers(viewersByEstab[e.id] ?? [], profileCountryMap)
    return {
      id: e.id, name: e.name, city: e.city, plan: e.plan ?? 'free',
      isActive: e.is_active, vt, vl, delta, saved: sv, redeemed: rd,
      saveRate, topCountries: topC,
    }
  })

  if (q) {
    const lq = q.toLowerCase()
    rows = rows.filter((r: any) =>
      r.name.toLowerCase().includes(lq) || r.city?.toLowerCase().includes(lq)
    )
  }

  if (sort === 'views')    rows.sort((a: any, b: any) => b.vt - a.vt)
  if (sort === 'saved')    rows.sort((a: any, b: any) => b.saved - a.saved)
  if (sort === 'redeemed') rows.sort((a: any, b: any) => b.redeemed - a.redeemed)
  if (sort === 'trend')    rows.sort((a: any, b: any) => (b.delta ?? -999) - (a.delta ?? -999))

  const totalViews    = rows.reduce((s: number, r: any) => s + r.vt, 0)
  const totalSaved    = rows.reduce((s: number, r: any) => s + r.saved, 0)
  const totalRedeemed = rows.reduce((s: number, r: any) => s + r.redeemed, 0)
  const avgSaveRate   = totalViews > 0 ? Math.round((totalSaved / totalViews) * 100) : 0
  const withGrowth    = rows.filter((r: any) => (r.delta ?? 0) > 0).length

  return (
    <>
      <h1 className="admin-page-title">Estadísticas</h1>
      <p className="admin-page-subtitle">Actividad por establecimiento — {monthName}</p>

      {/* Summary KPIs */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><BarChart2 size={18} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalViews}</div>
            <div className="stat-label">Vistas este mes</div>
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
          <div className="stat-icon" style={{ background: 'rgba(0,206,201,0.12)', color: 'var(--secondary)' }}>
            <Globe size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{avgSaveRate}%</div>
            <div className="stat-label">Conversión vista→guardado</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(253,203,110,0.15)', color: '#fdcb6e' }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{withGrowth}</div>
            <div className="stat-label">Con crecimiento vs {lastMonthName}</div>
          </div>
        </div>
      </div>

      <AnalyticsFilters q={q ?? ''} sort={sort} count={rows.length} />

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', gridColumn: '1/-1', padding: '2rem 0', textAlign: 'center' }}>
            Sin resultados.
          </p>
        ) : rows.map((row: any) => {
          const planColor = PLAN_COLORS[row.plan] ?? PLAN_COLORS.free
          const barMax    = Math.max(row.vt, row.vl, 1)
          const saveRateColor =
            row.saveRate >= 30 ? '#4caf50' :
            row.saveRate >= 10 ? '#fdcb6e' :
            'var(--text-faint)'

          return (
            <div key={row.id} style={{
              background: 'var(--card-bg)',
              border: `1px solid ${row.isActive ? 'var(--card-border)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.125rem',
              display: 'flex', flexDirection: 'column', gap: '0.875rem',
              opacity: row.isActive ? 1 : 0.65,
            }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.name}
                    {!row.isActive && <span style={{ marginLeft: 7, fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 400 }}>inactivo</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>{row.city}</div>
                </div>
                <span style={{
                  fontSize: '0.63rem', fontWeight: 700, color: planColor,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${planColor}40`,
                  borderRadius: 'var(--radius-full)', padding: '3px 10px', flexShrink: 0,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {PLAN_LABELS[row.plan] ?? row.plan}
                </span>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Vistas',    value: row.vt,       color: 'var(--primary-light)' },
                  { label: 'Guardados', value: row.saved,    color: 'var(--secondary)' },
                  { label: 'Canjes',    value: row.redeemed, color: 'var(--accent)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.625rem 0.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: saveRateColor,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-full)',
                  padding: '3px 10px', border: `1px solid ${saveRateColor}25`, flexShrink: 0,
                }}>
                  {row.saveRate}% conversión
                </span>
                {row.topCountries.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>de</span>
                    {row.topCountries.map(({ country, flag, count }: { country: string; flag: string; count: number }) => (
                      <span key={country} title={`${country} · ${count} vista${count !== 1 ? 's' : ''}`} style={{ fontSize: '1.1rem', lineHeight: 1, cursor: 'default' }}>
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Mini bar comparison */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginBottom: 7 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Vistas vs {lastMonthName}</span>
                  {row.delta !== null ? (
                    <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, color: row.delta > 0 ? '#4caf50' : row.delta < 0 ? '#f44336' : 'var(--text-faint)' }}>
                      {row.delta > 0 ? <TrendingUp size={11} /> : row.delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                      {row.delta > 0 ? `+${row.delta}%` : `${row.delta}%`}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.68rem' }}>primer mes</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: monthName.split(' ')[0], v: row.vt, color: 'var(--primary)' },
                    { label: lastMonthName,           v: row.vl, color: 'rgba(255,255,255,0.12)' },
                  ].map(({ label, v, color }) => (
                    <div key={label} style={{ flex: 1 }}>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 5 }}>
                        <div style={{ height: '100%', width: `${(v / barMax) * 100}%`, background: color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>{label} · <strong style={{ color: 'var(--text-muted)' }}>{v}</strong></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTAs — stats + report */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
                <Link
                  href={`/establishments/${row.id}/stats`}
                  className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'center', fontSize: '0.78rem', padding: '0.45rem 0.5rem' }}
                >
                  Ver estadísticas
                </Link>
                <Link
                  href={`/establishments/${row.id}/stats#reporte`}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'center', fontSize: '0.78rem', padding: '0.45rem 0.5rem' }}
                >
                  Generar reporte
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
