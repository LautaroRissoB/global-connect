import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Pencil, Eye, EyeOff, Plus } from 'lucide-react'

async function togglePromotion(id: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('promotions').update({ is_active: !current }).eq('id', id)
  revalidatePath('/promotions')
}

export default async function PromotionsPage() {
  const supabase = await createClient()
  const { data: promotions } = await supabase
    .from('promotions')
    .select(`
      id, title, discount_percentage, original_price, discounted_price,
      valid_from, valid_until, is_active,
      establishments ( name )
    `)
    .order('created_at', { ascending: false })

  const list = promotions ?? []

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Promociones</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            {list.length} en total
          </p>
        </div>
        <Link href="/promotions/new" className="btn btn-primary btn-sm">
          <Plus size={15} /> Nueva
        </Link>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Establecimiento</th>
              <th>Descuento</th>
              <th>Precio final</th>
              <th>Válido hasta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.title}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {(p.establishments as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td>
                    {p.discount_percentage
                      ? <span className="promo-discount">-{p.discount_percentage}%</span>
                      : '—'}
                  </td>
                  <td>
                    {p.discounted_price != null
                      ? <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>€{p.discounted_price}</span>
                      : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {p.valid_until ?? '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {p.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Link
                        href={`/promotions/${p.id}`}
                        className="action-btn"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </Link>
                      <form action={togglePromotion.bind(null, p.id, p.is_active)}>
                        <button
                          type="submit"
                          className={`action-btn ${p.is_active ? 'deactivate' : 'activate'}`}
                          title={p.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {p.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  No hay promociones todavía.{' '}
                  <Link href="/promotions/new" style={{ color: 'var(--primary-light)' }}>
                    Crear la primera
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
