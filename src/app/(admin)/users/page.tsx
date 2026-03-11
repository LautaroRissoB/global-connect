import { createClient } from '@/lib/supabase/server'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, university, home_country, exchange_country, exchange_city, created_at')
    .order('created_at', { ascending: false })

  const total = users?.length ?? 0

  // Agrupar por país de origen (top 5)
  const byCountry: Record<string, number> = {}
  for (const u of users ?? []) {
    byCountry[u.home_country] = (byCountry[u.home_country] ?? 0) + 1
  }
  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <>
      <h1 className="admin-page-title">Usuarios registrados</h1>
      <p className="admin-page-subtitle">{total} estudiante{total !== 1 ? 's' : ''} en la plataforma.</p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ flexDirection: 'column', gap: 4 }}>
          <div className="stat-value" style={{ fontSize: '1.6rem' }}>{total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total usuarios</div>
        </div>
        {topCountries.map(([country, count]) => (
          <div key={country} className="stat-card" style={{ flexDirection: 'column', gap: 4 }}>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{country}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="admin-form-card" style={{ padding: 0, overflow: 'hidden' }}>
        {!users || users.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No hay usuarios registrados todavía.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Nombre', 'Universidad', 'País de origen', 'Destino', 'Ciudad', 'Registro'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: i < users.length - 1 ? '1px solid var(--card-border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{u.full_name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.university}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.home_country}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.exchange_country}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.exchange_city}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
