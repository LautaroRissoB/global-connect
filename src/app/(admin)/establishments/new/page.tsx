'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { EstablishmentCategory } from '@/types/database'

const CATEGORIES: { value: EstablishmentCategory; label: string }[] = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'bar',        label: 'Bar' },
  { value: 'club',       label: 'Discoteca' },
  { value: 'cafe',       label: 'Cafetería' },
  { value: 'cultural',   label: 'Teatro & Cultura' },
  { value: 'theater',    label: 'Teatro' },
  { value: 'sports',     label: 'Deportes' },
  { value: 'other',      label: 'Otro' },
]

export default function NewEstablishmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    name:        '',
    description: '',
    category:    'restaurant' as EstablishmentCategory,
    address:     '',
    city:        '',
    country:     '',
    phone:       '',
    website:     '',
    image_url:   '',
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name || !form.address || !form.city || !form.country) {
      setError('Completá los campos obligatorios: nombre, dirección, ciudad y país.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: dbError } = await supabase.from('establishments').insert({
      name:        form.name,
      description: form.description || null,
      category:    form.category,
      address:     form.address,
      city:        form.city,
      country:     form.country,
      phone:       form.phone    || null,
      website:     form.website  || null,
      image_url:   form.image_url || null,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    router.push('/establishments')
    router.refresh()
  }

  return (
    <>
      <h1 className="admin-page-title">Nuevo establecimiento</h1>
      <p className="admin-page-subtitle">
        Los campos marcados con * son obligatorios.
      </p>

      <div className="admin-form-card">
        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          {/* Nombre + Categoría */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} />
          </div>

          {/* Dirección */}
          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <input className="form-input" value={form.address} onChange={set('address')} required />
          </div>

          {/* Ciudad + País */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Ciudad *</label>
              <input className="form-input" value={form.city} onChange={set('city')} required />
            </div>
            <div className="form-group">
              <label className="form-label">País *</label>
              <input className="form-input" value={form.country} onChange={set('country')} required />
            </div>
          </div>

          {/* Teléfono + Website */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" type="url" value={form.website} onChange={set('website')} placeholder="https://..." />
            </div>
          </div>

          {/* Imagen URL */}
          <div className="form-group">
            <label className="form-label">URL de imagen principal</label>
            <input className="form-input" type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Guardando...</> : 'Guardar establecimiento'}
            </button>
            <Link href="/establishments" className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
