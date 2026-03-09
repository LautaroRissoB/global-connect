import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Pencil, Eye, EyeOff, Plus } from 'lucide-react'

// Server Actions
async function toggleActive(id: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('establishments').update({ is_active: !current }).eq('id', id)
  revalidatePath('/establishments')
}

export default async function EstablishmentsPage() {
  const supabase = await createClient()
  const { data: establishments } = await supabase
    .from('establishments')
    .select('id, name, category, city, country, is_active, created_at')
    .order('created_at', { ascending: false })

  const list = establishments ?? []

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Establecimientos</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            {list.length} en total
          </p>
        </div>
        <Link href="/establishments/new" className="btn btn-primary btn-sm">
          <Plus size={15} /> Nuevo
        </Link>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Ciudad</th>
              <th>País</th>
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
                  <td style={{ color: 'var(--text-muted)' }}>{e.country}</td>
                  <td>
                    <span className={`badge ${e.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {e.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Link
                        href={`/establishments/${e.id}`}
                        className="action-btn"
                        title="Editar"
                      >
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
                  No hay establecimientos todavía.{' '}
                  <Link href="/establishments/new" style={{ color: 'var(--primary-light)' }}>
                    Crear el primero
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
