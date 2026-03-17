import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Pencil, Eye, EyeOff, Plus, Search, BarChart2 } from 'lucide-react'
import PlanSelector from '@/components/admin/PlanSelector'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('establishments').update({ is_active: !current }).eq('id', id)
  revalidatePath('/clientes')
}

async function changePlan(id: string, plan: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('establishments').update({ plan: plan as 'free' | 'basic' | 'pro' }).eq('id', id)
  revalidatePath('/clientes')
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('establishments')
    .select('id, name, category, city, country, plan, is_active, created_at')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`)

  const { data: establishments } = await query
  const list = establishments ?? []

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Clientes</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            {list.length} {q ? 'resultado(s)' : 'en total'}
          </p>
        </div>
        <Link href="/clientes/new" className="btn btn-primary btn-sm">
          <Plus size={15} /> Nuevo
        </Link>
      </div>

      <form method="GET" style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nombre o ciudad…"
            className="form-input"
            style={{ paddingLeft: 36, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
          />
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Ciudad</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td><span className="badge badge-category">{e.category}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.city}</td>
                  <td>
                    <PlanSelector id={e.id} plan={e.plan ?? 'free'} action={changePlan} />
                  </td>
                  <td>
                    <span className={`badge ${e.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {e.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Link href={`/establishments/${e.id}/stats`} className="action-btn" title="Estadísticas">
                        <BarChart2 size={14} />
                      </Link>
                      <Link href={`/clientes/${e.id}`} className="action-btn" title="Editar / Descuentos">
                        <Pencil size={14} />
                      </Link>
                      <form action={toggleActive.bind(null, e.id, e.is_active)}>
                        <button
                          type="submit"
                          className={`action-btn ${e.is_active ? 'deactivate' : 'activate'}`}
                          title={e.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {e.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  No hay clientes todavía.{' '}
                  <Link href="/clientes/new" style={{ color: 'var(--primary-light)' }}>
                    Agregar el primero
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
