'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewDescuentoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    title: '', description: '',
    original_price: '', discounted_price: '', discount_percentage: '',
    valid_from: '', valid_until: '', terms_conditions: '',
  })

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
    const { error: dbError } = await supabase.from('promotions').insert({
      establishment_id:    id,
      title:               form.title,
      description:         form.description         || null,
      original_price:      form.original_price      ? Number(form.original_price)      : null,
      discounted_price:    form.discounted_price    ? Number(form.discounted_price)    : null,
      discount_percentage: form.discount_percentage ? Number(form.discount_percentage) : null,
      valid_from:          form.valid_from           || null,
      valid_until:         form.valid_until          || null,
      terms_conditions:    form.terms_conditions     || null,
    })

    if (dbError) { setError(dbError.message); setLoading(false); return }

    router.push(`/clientes/${id}?tab=descuentos`)
    router.refresh()
  }

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Nuevo descuento</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>Completá los datos del descuento.</p>
        </div>
        <Link href={`/clientes/${id}`} className="btn btn-ghost btn-sm">← Volver</Link>
      </div>

      <div className="admin-form-card">
        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Ej: 20% off en la carta" required />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Detalles del descuento..." />
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
            <input className="form-input" type="number" min="0" max="100" value={form.discount_percentage} onChange={set('discount_percentage')} placeholder="Ej: 20" />
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
              {loading ? <><span className="btn-spinner" /> Guardando...</> : 'Crear descuento'}
            </button>
            <Link href={`/clientes/${id}`} className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
