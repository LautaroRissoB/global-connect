'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface EstablishmentOption { id: string; name: string }

export default function EditPromotionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading,        setLoading]        = useState(false)
  const [fetching,       setFetching]       = useState(true)
  const [error,          setError]          = useState('')
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>([])

  const [form, setForm] = useState({
    establishment_id:    '',
    title:               '',
    description:         '',
    original_price:      '',
    discounted_price:    '',
    discount_percentage: '',
    valid_from:          '',
    valid_until:         '',
    terms_conditions:    '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: estabs }, { data: promo, error: promoError }] = await Promise.all([
        supabase.from('establishments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('promotions').select('*').eq('id', id).single(),
      ])

      setEstablishments(estabs ?? [])

      if (promoError || !promo) {
        setError('Promoción no encontrada.')
        setFetching(false)
        return
      }

      setForm({
        establishment_id:    promo.establishment_id,
        title:               promo.title,
        description:         promo.description         ?? '',
        original_price:      promo.original_price      != null ? String(promo.original_price)      : '',
        discounted_price:    promo.discounted_price    != null ? String(promo.discounted_price)    : '',
        discount_percentage: promo.discount_percentage != null ? String(promo.discount_percentage) : '',
        valid_from:          promo.valid_from           ?? '',
        valid_until:         promo.valid_until          ?? '',
        terms_conditions:    promo.terms_conditions     ?? '',
      })
      setFetching(false)
    }
    load()
  }, [id])

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.establishment_id || !form.title) {
      setError('Seleccioná un establecimiento y completá el título.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('promotions')
      .update({
        establishment_id:    form.establishment_id,
        title:               form.title,
        description:         form.description         || null,
        original_price:      form.original_price      ? Number(form.original_price)      : null,
        discounted_price:    form.discounted_price    ? Number(form.discounted_price)    : null,
        discount_percentage: form.discount_percentage ? Number(form.discount_percentage) : null,
        valid_from:          form.valid_from           || null,
        valid_until:         form.valid_until          || null,
        terms_conditions:    form.terms_conditions     || null,
      })
      .eq('id', id)

    if (dbError) { setError(dbError.message); setLoading(false); return }

    router.push('/promotions')
    router.refresh()
  }

  if (fetching) return <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>

  return (
    <>
      <h1 className="admin-page-title">Editar promoción</h1>
      <p className="admin-page-subtitle">Modificá los datos de la promoción.</p>

      <div className="admin-form-card">
        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Establecimiento *</label>
            <select className="form-select" value={form.establishment_id} onChange={set('establishment_id')} required>
              <option value="">Seleccioná un establecimiento...</option>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

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
              <label className="form-label">Precio original (€)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.original_price} onChange={set('original_price')} />
            </div>
            <div className="form-group">
              <label className="form-label">Precio con descuento (€)</label>
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
            <Link href="/promotions" className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
