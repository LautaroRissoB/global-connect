'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, Upload, Instagram, FileText } from 'lucide-react'
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

const PRICE_RANGES = [
  { value: '$',    label: '$',    hint: 'Económico' },
  { value: '$$',   label: '$$',   hint: 'Moderado' },
  { value: '$$$',  label: '$$$',  hint: 'Caro' },
  { value: '$$$$', label: '$$$$', hint: 'Premium' },
]

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

interface HourRow { day: string; closed: boolean; from: string; to: string }

function parseHours(raw: Record<string, string>): HourRow[] {
  return Object.entries(raw).map(([day, val]) => {
    if (val === 'Cerrado') return { day, closed: true, from: '10:00', to: '22:00' }
    const parts = val.split(' - ')
    return { day, closed: false, from: parts[0] ?? '10:00', to: parts[1] ?? '22:00' }
  })
}

export default function EditEstablishmentPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [fetching,      setFetching]      = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [pdfFile,       setPdfFile]       = useState<File | null>(null)
  const [existingPdf,   setExistingPdf]   = useState<string | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [hourRows,      setHourRows]      = useState<HourRow[]>([])

  const [form, setForm] = useState({
    name:        '',
    description: '',
    category:    'restaurant' as EstablishmentCategory,
    address:     '',
    city:        '',
    country:     '',
    phone:       '',
    website:     '',
    instagram:   '',
    price_range: '' as '$' | '$$' | '$$$' | '$$$$' | '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Establecimiento no encontrado.')
        setFetching(false)
        return
      }

      setForm({
        name:        data.name,
        description: data.description  ?? '',
        category:    data.category,
        address:     data.address,
        city:        data.city,
        country:     data.country,
        phone:       data.phone        ?? '',
        website:     data.website      ?? '',
        instagram:   data.instagram    ?? '',
        price_range: (data.price_range ?? '') as '$' | '$$' | '$$$' | '$$$$' | '',
      })

      if (data.image_url)    setImagePreview(data.image_url)
      if (data.menu_pdf_url) setExistingPdf(data.menu_pdf_url)

      if (data.opening_hours && typeof data.opening_hours === 'object') {
        setHourRows(parseHours(data.opening_hours as Record<string, string>))
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

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setExistingPdf(null)
  }

  function addHourRow() {
    const usedDays = hourRows.map((r) => r.day)
    const next = DAYS.find((d) => !usedDays.includes(d))
    if (!next) return
    setHourRows((prev) => [...prev, { day: next, closed: false, from: '10:00', to: '22:00' }])
  }

  function removeHourRow(i: number) {
    setHourRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateHourRow(i: number, field: keyof HourRow, value: string | boolean) {
    setHourRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  async function uploadFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    path: string
  ): Promise<string | null> {
    const { error: uploadError } = await supabase.storage
      .from('establishments')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    if (uploadError) { setError(`Error al subir archivo: ${uploadError.message}`); return null }
    return supabase.storage.from('establishments').getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setUploading(true)

    const supabase = createClient()
    const ts = Date.now()

    const image_url = imageFile
      ? await uploadFile(supabase, imageFile, `img_${id}_${ts}.${imageFile.name.split('.').pop()}`)
      : (imagePreview ?? null)

    const menu_pdf_url = pdfFile
      ? await uploadFile(supabase, pdfFile, `pdf_${id}_${ts}.pdf`)
      : (existingPdf ?? null)

    setUploading(false)
    if (error) { setLoading(false); return }

    const opening_hours = hourRows
      .filter((r) => r.day)
      .reduce<Record<string, string>>((acc, r) => ({
        ...acc,
        [r.day]: r.closed ? 'Cerrado' : `${r.from} - ${r.to}`
      }), {})

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
        instagram:     form.instagram    || null,
        price_range:   (form.price_range || null) as '$' | '$$' | '$$$' | '$$$$' | null,
        image_url,
        menu_pdf_url,
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

          {/* Nombre + Categoría */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
              <input className="form-input" type="url" value={form.website} onChange={set('website')} />
            </div>
          </div>

          {/* Instagram + Precio */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <div style={{ position: 'relative' }}>
                <Instagram size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  value={form.instagram}
                  onChange={set('instagram')}
                  placeholder="@usuario"
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Rango de precios</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRICE_RANGES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, price_range: f.price_range === p.value ? '' : p.value as typeof f.price_range }))}
                    title={p.hint}
                    style={{
                      flex: 1,
                      padding: '9px 4px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${form.price_range === p.value ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: form.price_range === p.value ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
                      color: form.price_range === p.value ? 'var(--primary-light)' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Imagen */}
          <div className="form-group">
            <label className="form-label">Foto del establecimiento</label>
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxWidth: 400, height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
                <label style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.65)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Upload size={13} /> Cambiar
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2rem', border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}>
                <Upload size={22} />
                <span style={{ fontSize: '0.875rem' }}>Hacé clic para subir una foto</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>JPG, PNG o WebP · máx. 5 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* PDF Menú */}
          <div className="form-group">
            <label className="form-label">Menú (PDF) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(opcional)</span></label>
            {pdfFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,206,201,0.08)', border: '1px solid rgba(0,206,201,0.2)', borderRadius: 'var(--radius-md)' }}>
                <FileText size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</span>
                <button type="button" onClick={() => setPdfFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            ) : existingPdf ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,206,201,0.06)', border: '1px solid rgba(0,206,201,0.15)', borderRadius: 'var(--radius-md)' }}>
                <FileText size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                <a href={existingPdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Ver menú actual
                </a>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '3px 8px' }}>
                  Reemplazar
                  <input type="file" accept="application/pdf" onChange={handlePdfChange} style={{ display: 'none' }} />
                </label>
                <button type="button" onClick={() => setExistingPdf(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', transition: 'border-color 0.2s', fontSize: '0.875rem' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}>
                <FileText size={18} />
                <span>Subir carta/menú en PDF</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-faint)' }}>máx. 10 MB</span>
                <input type="file" accept="application/pdf" onChange={handlePdfChange} style={{ display: 'none' }} />
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
              <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>Sin horarios cargados. Podés agregarlos cuando quieras.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hourRows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 32px', gap: 8, alignItems: 'center' }}>
                    <select className="form-select" value={row.day} onChange={(e) => updateHourRow(i, 'day', e.target.value)}>
                      {DAYS.map((d) => <option key={d} value={d} disabled={hourRows.some((r, ri) => ri !== i && r.day === d)}>{d}</option>)}
                    </select>

                    {row.closed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1 }}>Cerrado</span>
                        <button type="button" onClick={() => updateHourRow(i, 'closed', false)} style={{ fontSize: '0.72rem', background: 'none', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="time" className="form-input" value={row.from} onChange={(e) => updateHourRow(i, 'from', e.target.value)} style={{ flex: 1 }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>a</span>
                        <input type="time" className="form-input" value={row.to} onChange={(e) => updateHourRow(i, 'to', e.target.value)} style={{ flex: 1 }} />
                        <button type="button" onClick={() => updateHourRow(i, 'closed', true)} style={{ fontSize: '0.72rem', background: 'none', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          Cerrado
                        </button>
                      </div>
                    )}

                    <button type="button" onClick={() => removeHourRow(i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
              {loading
                ? <><span className="btn-spinner" /> {uploading ? 'Subiendo archivos...' : 'Guardando...'}</>
                : 'Guardar cambios'}
            </button>
            <Link href="/establishments" className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
