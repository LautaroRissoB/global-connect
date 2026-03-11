'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, Upload } from 'lucide-react'
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

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

interface HourRow { day: string; hours: string }

export default function EditEstablishmentPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading,      setLoading]      = useState(false)
  const [fetching,     setFetching]     = useState(true)
  const [error,        setError]        = useState('')
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [hourRows,     setHourRows]     = useState<HourRow[]>([])

  const [form, setForm] = useState({
    name:        '',
    description: '',
    category:    'restaurant' as EstablishmentCategory,
    address:     '',
    city:        '',
    country:     '',
    phone:       '',
    website:     '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) { setError('Establecimiento no encontrado.'); setFetching(false); return }

      setForm({
        name:        data.name,
        description: data.description ?? '',
        category:    data.category,
        address:     data.address,
        city:        data.city,
        country:     data.country,
        phone:       data.phone     ?? '',
        website:     data.website   ?? '',
      })

      if (data.image_url) setImagePreview(data.image_url)

      if (data.opening_hours && typeof data.opening_hours === 'object') {
        setHourRows(
          Object.entries(data.opening_hours as Record<string, string>).map(([day, hours]) => ({ day, hours }))
        )
      }

      setFetching(false)
    }
    load()
  }, [id])

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function addHourRow() {
    const usedDays = hourRows.map((r) => r.day)
    const next = DAYS.find((d) => !usedDays.includes(d))
    if (!next) return
    setHourRows((prev) => [...prev, { day: next, hours: '' }])
  }

  function removeHourRow(index: number) {
    setHourRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateHourRow(index: number, field: 'day' | 'hours', value: string) {
    setHourRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function uploadImage(supabase: ReturnType<typeof createClient>): Promise<string | null> {
    if (!imageFile) return null
    setUploading(true)

    const ext = imageFile.name.split('.').pop()
    const filename = `${id}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('establishments')
      .upload(filename, imageFile, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      setError(`Error subiendo imagen: ${uploadError.message}`)
      setUploading(false)
      return null
    }

    const { data } = supabase.storage.from('establishments').getPublicUrl(filename)
    setUploading(false)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const image_url: string | null = imageFile
      ? await uploadImage(supabase)
      : (imagePreview ?? null)

    if (error) { setLoading(false); return }

    const opening_hours = hourRows
      .filter((r) => r.day && r.hours)
      .reduce<Record<string, string>>((acc, r) => ({ ...acc, [r.day]: r.hours }), {})

    const { error: dbError } = await supabase
      .from('establishments')
      .update({
        name:          form.name,
        description:   form.description  || null,
        category:      form.category,
        address:       form.address,
        city:          form.city,
        country:       form.country,
        phone:         form.phone        || null,
        website:       form.website      || null,
        image_url,
        opening_hours: Object.keys(opening_hours).length > 0 ? opening_hours : null,
      })
      .eq('id', id)

    if (dbError) { setError(dbError.message); setLoading(false); return }

    router.push('/establishments')
    router.refresh()
  }

  if (fetching) return <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>

  return (
    <>
      <h1 className="admin-page-title">Editar establecimiento</h1>
      <p className="admin-page-subtitle">Modificá los datos del establecimiento.</p>

      <div className="admin-form-card">
        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>

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

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} />
          </div>

          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <input className="form-input" value={form.address} onChange={set('address')} required />
          </div>

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

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" type="url" value={form.website} onChange={set('website')} />
            </div>
          </div>

          {/* Imagen */}
          <div className="form-group">
            <label className="form-label">Foto del establecimiento</label>
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', maxWidth: 400, height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }}
                />
                <label style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.65)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Upload size={13} /> Cambiar
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2rem', border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}
              >
                <Upload size={22} />
                <span style={{ fontSize: '0.875rem' }}>Hacé clic para subir una foto</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>JPG, PNG o WebP · máx. 5 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Horarios */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Horarios <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(opcional)</span></label>
              {hourRows.length < DAYS.length && (
                <button type="button" onClick={addHourRow} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                  <Plus size={13} /> Agregar día
                </button>
              )}
            </div>

            {hourRows.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>
                Sin horarios cargados. Podés agregarlos cuando quieras.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hourRows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 32px', gap: 8, alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={row.day}
                      onChange={(e) => updateHourRow(i, 'day', e.target.value)}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d} disabled={hourRows.some((r, ri) => ri !== i && r.day === d)}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      value={row.hours}
                      onChange={(e) => updateHourRow(i, 'hours', e.target.value)}
                      placeholder="Ej: 10:00 - 22:00  o  Cerrado"
                    />
                    <button
                      type="button"
                      onClick={() => removeHourRow(i)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-md" disabled={loading || uploading}>
              {loading || uploading
                ? <><span className="btn-spinner" /> {uploading ? 'Subiendo imagen...' : 'Guardando...'}</>
                : 'Guardar cambios'}
            </button>
            <Link href="/establishments" className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
