'use client'

import { useState, useMemo } from 'react'
import { Search, Download, X, Pencil } from 'lucide-react'

type User = {
  id: string
  full_name: string
  university: string
  home_country: string
  exchange_country: string
  exchange_city: string
  created_at: string
}

interface Props {
  users: User[]
  updateUser: (id: string, data: {
    full_name: string
    university: string
    home_country: string
    exchange_country: string
    exchange_city: string
  }) => Promise<void>
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
}

const AVATAR_COLORS = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#e17055', '#a29bfe']

function avatarColor(id: string) {
  let sum = 0
  for (const c of id) sum += c.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export default function UsersTable({ users, updateUser }: Props) {
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<{
    full_name: string; university: string; home_country: string
    exchange_country: string; exchange_city: string
  }>({ full_name: '', university: '', home_country: '', exchange_country: '', exchange_city: '' })

  const countries = useMemo(() => {
    const set = new Set(users.map(u => u.home_country).filter(Boolean))
    return Array.from(set).sort()
  }, [users])

  const byCountry = useMemo(() => {
    const map: Record<string, number> = {}
    for (const u of users) {
      if (u.home_country) map[u.home_country] = (map[u.home_country] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [users])

  const maxCount = byCountry[0]?.[1] ?? 1

  const thisWeek = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
    return users.filter(u => u.created_at >= cutoff).length
  }, [users])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch = !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.university.toLowerCase().includes(q) ||
        u.home_country.toLowerCase().includes(q) ||
        u.exchange_city.toLowerCase().includes(q)
      const matchCountry = !countryFilter || u.home_country === countryFilter
      return matchSearch && matchCountry
    })
  }, [users, search, countryFilter])

  function exportCSV() {
    const headers = ['Nombre', 'Universidad', 'País de origen', 'País destino', 'Ciudad destino', 'Registro']
    const rows = filtered.map(u => [
      u.full_name, u.university, u.home_country, u.exchange_country, u.exchange_city, u.created_at.slice(0, 10),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'estudiantes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function openEdit(u: User) {
    setEditing(u)
    setEditData({
      full_name: u.full_name,
      university: u.university,
      home_country: u.home_country,
      exchange_country: u.exchange_country,
      exchange_city: u.exchange_city,
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      await updateUser(editing.id, editData)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* KPI row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ flexDirection: 'column', gap: 4 }}>
          <div className="stat-value" style={{ fontSize: '2rem' }}>{users.length}</div>
          <div className="stat-label">Total estudiantes</div>
        </div>
        <div className="stat-card" style={{ flexDirection: 'column', gap: 4 }}>
          <div className="stat-value" style={{ fontSize: '2rem', color: 'var(--primary-light)' }}>{thisWeek}</div>
          <div className="stat-label">Nuevos esta semana</div>
        </div>
        <div className="stat-card" style={{ flexDirection: 'column', gap: 4 }}>
          <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--secondary)' }}>{byCountry[0]?.[0] ?? '—'}</div>
          <div className="stat-label">País más frecuente</div>
        </div>
      </div>

      {/* Country distribution */}
      {byCountry.length > 0 && (
        <div className="admin-form-card" style={{ maxWidth: 'none', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' }}>
            Distribución por país de origen
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byCountry.map(([country, count]) => (
              <div key={country} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 170, fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {country}
                </span>
                <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: 'var(--primary)', borderRadius: 4 }} />
                </div>
                <span style={{ width: 28, textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, universidad, país…"
            className="form-input"
            style={{ paddingLeft: 32, paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem' }}
          />
        </div>
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem' }}
        >
          <option value="">Todos los países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={exportCSV} className="btn btn-outline btn-sm" style={{ gap: 6, whiteSpace: 'nowrap' }}>
          <Download size={13} /> Exportar CSV
        </button>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginLeft: 'auto' }}>
          {filtered.length}{filtered.length !== users.length ? ` de ${users.length}` : ''} estudiante{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Universidad de origen</th>
              <th>País</th>
              <th>Destino</th>
              <th>Registro</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="admin-table-empty">Sin resultados para la búsqueda.</td></tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: avatarColor(u.id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.68rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {initials(u.full_name)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.university}
                  </td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{u.home_country}</td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {u.exchange_city}{u.exchange_country ? `, ${u.exchange_country}` : ''}
                  </td>
                  <td style={{ color: 'var(--text-faint)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td>
                    <button onClick={() => openEdit(u)} className="action-btn" title="Editar">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '1.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Editar estudiante</h2>
              <button onClick={() => setEditing(null)} className="action-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { key: 'full_name', label: 'Nombre completo' },
                { key: 'university', label: 'Universidad de origen' },
                { key: 'home_country', label: 'País de origen' },
                { key: 'exchange_country', label: 'País destino' },
                { key: 'exchange_city', label: 'Ciudad destino' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    value={editData[key]}
                    onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} className="btn btn-outline btn-sm">Cancelar</button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="btn btn-primary btn-sm"
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
