import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Tag, Users, TrendingUp, Plus, BarChart2 } from 'lucide-react'
import { UserGrowthChart, ViewsChart, CountryChart } from '@/components/admin/DashboardCharts'
import type { DayCount, EstabViews, CountryCount } from '@/components/admin/DashboardCharts'

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29)
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(now.getDate() - 13)
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    { count: totalEstablishments },
    { count: activePromotions },
    { count: totalUsers },
    { data: allProfiles },
    { data: events },
    { data: establishments },
  ] = await Promise.all([
    supabase.from('establishments').select('*', { count: 'exact', head: true }),
    supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('created_at, home_country').gte('created_at', fourteenDaysAgo.toISOString()),
    supabase.from('events').select('establishment_id, created_at').eq('type', 'establishment_view').gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('establishments').select('id, name').eq('is_active', true),
  ])

  // User growth — last 14 days
  const dayCounts: Record<string, number> = {}
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo); d.setDate(fourteenDaysAgo.getDate() + i)
    dayCounts[d.toISOString().slice(0, 10)] = 0
  }
  for (const p of allProfiles ?? []) {
    const key = p.created_at.slice(0, 10)
    if (key in dayCounts) dayCounts[key] = (dayCounts[key] ?? 0) + 1
  }
  const userGrowth: DayCount[] = Object.entries(dayCounts).map(([date, count]) => ({
    date: formatShortDate(date + 'T00:00:00'),
    count,
  }))

  // Registrations this week vs last week
  const usersThisWeek = (allProfiles ?? []).filter(p => p.created_at >= sevenDaysAgo.toISOString()).length
  const usersLastWeek = (allProfiles ?? []).filter(p =>
    p.created_at >= new Date(now.getTime() - 14 * 86400000).toISOString() &&
    p.created_at < sevenDaysAgo.toISOString()
  ).length
  const userDelta = usersLastWeek > 0 ? Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100) : null

  // Views by establishment (last 30 days)
  const viewMap: Record<string, number> = {}
  for (const ev of events ?? []) {
    if (ev.establishment_id) viewMap[ev.establishment_id] = (viewMap[ev.establishment_id] ?? 0) + 1
  }
  const estabMap = Object.fromEntries((establishments ?? []).map(e => [e.id, e.name]))
  const estabViews: EstabViews[] = Object.entries(viewMap)
    .map(([id, views]) => ({ name: estabMap[id] ?? id.slice(0, 8), views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)

  // Views this month vs last month
  const viewsThisMonth = (events ?? []).filter(e => e.created_at >= thisMonthStart).length
  const viewsLastMonth = (events ?? []).filter(e => e.created_at >= lastMonthStart && e.created_at < thisMonthStart).length
  const viewDelta = viewsLastMonth > 0 ? Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100) : null

  // Users by country (top 8)
  const { data: allCountries } = await supabase.from('profiles').select('home_country')
  const countryMap: Record<string, number> = {}
  for (const p of allCountries ?? []) {
    if (p.home_country) countryMap[p.home_country] = (countryMap[p.home_country] ?? 0) + 1
  }
  const byCountry: CountryCount[] = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return (
    <>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-subtitle">Resumen general de la plataforma.</p>

      {/* KPI cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><Building2 size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalEstablishments ?? 0}</div>
            <div className="stat-label">Establecimientos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><Tag size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{activePromotions ?? 0}</div>
            <div className="stat-label">Promociones activas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><Users size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalUsers ?? 0}</div>
            <div className="stat-label">
              Estudiantes
              {userDelta !== null && (
                <span style={{ marginLeft: 6, fontSize: '0.72rem', fontWeight: 700, color: userDelta >= 0 ? '#4caf50' : '#f44336' }}>
                  {userDelta >= 0 ? `+${userDelta}%` : `${userDelta}%`} vs sem. ant.
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(253,203,110,0.15)', color: '#fdcb6e' }}><TrendingUp size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{viewsThisMonth}</div>
            <div className="stat-label">
              Vistas este mes
              {viewDelta !== null && (
                <span style={{ marginLeft: 6, fontSize: '0.72rem', fontWeight: 700, color: viewDelta >= 0 ? '#4caf50' : '#f44336' }}>
                  {viewDelta >= 0 ? `+${viewDelta}%` : `${viewDelta}%`} vs mes ant.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* User growth */}
        <div className="admin-form-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Nuevos estudiantes (14 días)
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{usersThisWeek} esta semana</span>
          </div>
          {(allProfiles?.length ?? 0) > 0
            ? <UserGrowthChart data={userGrowth} />
            : <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>Sin datos aún</p>
          }
        </div>

        {/* Views by establishment */}
        <div className="admin-form-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Vistas por establecimiento (30 días)
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{(events ?? []).length} totales</span>
          </div>
          {estabViews.length > 0
            ? <ViewsChart data={estabViews} />
            : <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>Sin datos aún</p>
          }
        </div>
      </div>

      {/* Countries chart + Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Users by country */}
        <div className="admin-form-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.875rem' }}>
            Estudiantes por país de origen (top 8)
          </h2>
          {byCountry.length > 0
            ? <CountryChart data={byCountry} />
            : <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>Sin datos aún</p>
          }
        </div>

        {/* Quick actions */}
        <div className="admin-form-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            Acciones rápidas
          </h2>
          <Link href="/establishments/new" className="btn btn-primary btn-sm" style={{ justifyContent: 'center', padding: '0.6rem 1rem' }}>
            <Plus size={14} /> Nuevo establecimiento
          </Link>
          <Link href="/promotions/new" className="btn btn-outline btn-sm" style={{ justifyContent: 'center', padding: '0.6rem 1rem' }}>
            <Plus size={14} /> Nueva promoción
          </Link>
          <Link href="/users" className="btn btn-outline btn-sm" style={{ justifyContent: 'center', padding: '0.6rem 1rem' }}>
            <Users size={14} /> Ver estudiantes
          </Link>
          <Link href="/reports" className="btn btn-outline btn-sm" style={{ justifyContent: 'center', padding: '0.6rem 1rem' }}>
            <BarChart2 size={14} /> Ver reportes
          </Link>
          <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--card-border)', fontSize: '0.72rem', color: 'var(--text-faint)', lineHeight: 1.6 }}>
            Panel actualizado en tiempo real desde Supabase.
          </div>
        </div>
      </div>
    </>
  )
}
