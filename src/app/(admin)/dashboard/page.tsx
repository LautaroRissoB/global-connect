import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Tag, Users } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalEstablishments },
    { count: activePromotions },
    { count: totalUsers },
    { data: recentEstablishments },
  ] = await Promise.all([
    supabase.from('establishments').select('*', { count: 'exact', head: true }),
    supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('establishments')
      .select('id, name, category, city, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-subtitle">Resumen general de la plataforma.</p>

      {/* Stats */}
      <div className="stats-grid">
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
            <div className="stat-label">Estudiantes registrados</div>
          </div>
        </div>
      </div>

      {/* Recent establishments */}
      <div className="admin-section-header">
        <h2 className="admin-section-title">Establecimientos recientes</h2>
        <Link href="/establishments" className="btn btn-outline btn-sm">Ver todos</Link>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Ciudad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {recentEstablishments && recentEstablishments.length > 0 ? (
              recentEstablishments.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td><span className="badge badge-category">{e.category}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.city}</td>
                  <td>
                    <span className={`badge ${e.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {e.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="admin-table-empty">
                  No hay establecimientos todavía. <Link href="/establishments/new" style={{ color: 'var(--primary-light)' }}>Crear el primero</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
