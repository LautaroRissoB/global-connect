'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function EditDescuentoPage() {
  const router = useRouter()
  const { id, promoId } = useParams<{ id: string; promoId: string }>()

  const [loading,        setLoading]        = useState(false)
  const [fetching,       setFetching]       = useState(true)
  const [error,          setError]          = useState('')
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  const [form, setForm] = useState({
    title: '', description: '',
    original_price: '', discounted_price: '', discount_percentage: '',
    valid_from: '', valid_until: '', terms_conditions: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('promotions').select('*').eq('id', promoId).single()

      if (fetchError || !data) { setError('Descuento no encontrado.'); setFetching(false); return }

      setForm({
        title:               data.title,
        description:         data.description         ?? '',
        original_price:      data.original_price      != null ? String(data.original_price)      : '',
        discounted_price:    data.discounted_price    != null ? String(data.discounted_price)    : '',
        discount_percentage: data.discount_percentage != null ? String(data.discount_percentage) : '',
        valid_from:          data.valid_from           ?? '',
        valid_until:         data.valid_until          ?? '',
        terms_conditions:    data.terms_conditions     ?? '',
      })
      setFetching(false)
    }
    load()
  }, [promoId])

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title) { setError('El título es obligatorio.'); return }

    if (form.valid_from && form.valid_until && form.valid_until < form.valid_from) {
      setError('La fecha de fin no puede ser anterior a la de inicio.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('promotions')
      .update({
        title:               form.title,
        description:         form.description         || null,
        original_price:      form.original_price      ? Number(form.original_price)      : null,
        discounted_price:    form.discounted_price    ? Number(form.discounted_price)    : null,
        discount_percentage: form.discount_percentage ? Number(form.discount_percentage) : null,
        valid_from:          form.valid_from           || null,
        valid_until:         form.valid_until          || null,
        terms_conditions:    form.terms_conditions     || null,
      })
      .eq('id', promoId)

    if (dbError) { setError(dbError.message); setLoading(false); return }

    router.push(`/clientes/${id}?tab=descuentos`)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('promotions').delete().eq('id', promoId)
    router.push(`/clientes/${id}`)
    router.refresh()
  }

  if (fetching) return <p style={{ color: 'var(--text-muted)', padding: '2rem' }}>Cargando...</p>

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Editar descuento</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>Modificá los datos del descuento.</p>
        </div>
        <Link href={`/clientes/${id}`} className="btn btn-ghost btn-sm">← Volver</Link>
      </div>

      <div className="admin-form-card">
        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={set('title')} required />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Precio original ($)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.original_price} onChange={set('original_price')} />
            </div>
            <div className="form-group">
              <label className="form-label">Precio con descuento ($)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.discounted_price} onChange={set('discounted_price')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Porcentaje de descuento (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={form.discount_percentage} onChange={set('discount_percentage')} />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Válido desde</label>
              <input className="form-input" type="date" value={form.valid_from} onChange={set('valid_from')} />
            </div>
            <div className="form-group">
              <label className="form-label">Válido hasta</label>
              <input className="form-input" type="date" value={form.valid_until} onChange={set('valid_until')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Términos y condiciones</label>
            <textarea className="form-textarea" value={form.terms_conditions} onChange={set('terms_conditions')} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Guardando...</> : 'Guardar cambios'}
            </button>
            <Link href={`/clientes/${id}`} className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(220,53,69,0.35)', color: 'rgba(220,53,69,0.8)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
            >
              <Trash2 size={14} /> Eliminar descuento
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', flex: 1 }}>¿Eliminar este descuento? Esta acción no se puede deshacer.</span>
              <button onClick={handleDelete} disabled={deleting}
                style={{ background: 'rgb(220,53,69)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ background: 'none', border: '1px solid var(--card-border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
