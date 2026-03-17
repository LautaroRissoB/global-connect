'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Upload, Instagram, FileText, Images } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { EstablishmentCategory } from '@/types/database'
import WeekHoursEditor, { DEFAULT_WEEK, weekToOpeningHours, type WeekHours } from '@/components/admin/WeekHoursEditor'

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

const PLANS = [
  {
    value: 'free',
    label: 'Gratuito',
    price: 'Sin costo',
    desc: 'Primer mes de prueba · 1 promoción',
    color: 'var(--text-muted)',
    border: 'var(--card-border)',
    bg: 'rgba(255,255,255,0.03)',
  },
  {
    value: 'basic',
    label: 'Básico',
    price: '$50 / mes',
    desc: 'Hasta 3 promos · Reporte básico',
    color: 'var(--secondary)',
    border: 'var(--secondary)',
    bg: 'rgba(0,206,201,0.08)',
  },
  {
    value: 'pro',
    label: 'Pro',
    price: '$100 / mes',
    desc: 'Promos ilimitadas · Destacado · Reporte detallado',
    color: 'var(--primary-light)',
    border: 'var(--primary)',
    bg: 'rgba(108,92,231,0.1)',
  },
] as const

export default function NewClientePage() {
  const router = useRouter()
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [pdfFile,       setPdfFile]       = useState<File | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [weekHours,       setWeekHours]       = useState<WeekHours>(DEFAULT_WEEK)
  const [plan,            setPlan]            = useState<'free' | 'basic' | 'pro'>('free')
  const [redemptionMode,  setRedemptionMode]  = useState<'one_per_promo' | 'one_per_establishment'>('one_per_promo')
  const [galleryFiles,    setGalleryFiles]    = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])

  const [form, setForm] = useState({
    name: '', description: '', category: 'restaurant' as EstablishmentCategory,
    address: '', city: '', country: 'Argentina',
    phone: '', website: '', instagram: '',
    price_range: '' as '$' | '$$' | '$$$' | '$$$$' | '',
  })

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
  }

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 6 - galleryFiles.length)
    if (!files.length) return
    setGalleryFiles((prev) => [...prev, ...files])
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  function removeGalleryItem(index: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    path: string
  ): Promise<string | null> {
    const { error: uploadError } = await supabase.storage
      .from('establishments').upload(path, file, { cacheControl: '3600', upsert: false })
    if (uploadError) { setError(`Error al subir archivo: ${uploadError.message}`); return null }
    return supabase.storage.from('establishments').getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.address || !form.city || !form.country) {
      setError('Completá los campos obligatorios: nombre, dirección, ciudad y país.')
      return
    }

    setLoading(true)
    setUploading(true)
    const supabase = createClient()
    const ts = Date.now()

    const image_url    = imageFile ? await uploadFile(supabase, imageFile, `img_${ts}.${imageFile.name.split('.').pop()}`) : null
    const menu_pdf_url = pdfFile   ? await uploadFile(supabase, pdfFile, `pdf_${ts}.pdf`) : null

    const gallery_urls: string[] = []
    for (let i = 0; i < galleryFiles.length; i++) {
      const url = await uploadFile(supabase, galleryFiles[i], `gallery_${ts}_${i}.${galleryFiles[i].name.split('.').pop()}`)
      if (url) gallery_urls.push(url)
    }

    setUploading(false)
    if (error) { setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any).from('establishments').insert({
      name: form.name, description: form.description || null,
      category: form.category, address: form.address,
      city: form.city, country: form.country,
      phone: form.phone || null, website: form.website || null,
      instagram: form.instagram || null,
      price_range: (form.price_range || null) as '$' | '$$' | '$$$' | '$$$$' | null,
      plan, image_url, menu_pdf_url, gallery_urls,
      redemption_mode: redemptionMode,
      opening_hours: weekToOpeningHours(weekHours),
    })

    if (dbError) { setError(dbError.message); setLoading(false); return }
    router.push('/clientes')
    router.refresh()
  }

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Nuevo cliente</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>Los campos marcados con * son obligatorios.</p>
        </div>
        <Link href="/clientes" className="btn btn-ghost btn-sm">← Volver</Link>
      </div>

      <div className="admin-form-card">
        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.name} onChange={set('name')} placeholder="Ej: La Birra Bar" required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Contá brevemente de qué se trata el lugar..." />
          </div>

          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <input className="form-input" value={form.address} onChange={set('address')} placeholder="Ej: Av. Corrientes 1234" required />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Ciudad *</label>
              <input className="form-input" value={form.city} onChange={set('city')} placeholder="Ej: Buenos Aires" required />
            </div>
            <div className="form-group">
              <label className="form-label">País *</label>
              <input className="form-input" value={form.country} onChange={set('country')} required />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+54 11 1234-5678" />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" type="url" value={form.website} onChange={set('website')} placeholder="https://..." />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <div style={{ position: 'relative' }}>
                <Instagram size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" value={form.instagram} onChange={set('instagram')} placeholder="@usuario" style={{ paddingLeft: 34 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Rango de precios</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRICE_RANGES.map((p) => (
                  <button key={p.value} type="button" title={p.hint}
                    onClick={() => setForm((f) => ({ ...f, price_range: f.price_range === p.value ? '' : p.value as typeof f.price_range }))}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${form.price_range === p.value ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: form.price_range === p.value ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
                      color: form.price_range === p.value ? 'var(--primary-light)' : 'var(--text-muted)',
                    }}>{p.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Foto del establecimiento</label>
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxWidth: 400, height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2rem', border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}>
                <Upload size={22} />
                <span style={{ fontSize: '0.875rem' }}>Hacé clic para subir una foto</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>JPG, PNG o WebP · máx. 5 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Menú (PDF) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(opcional)</span></label>
            {pdfFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,206,201,0.08)', border: '1px solid rgba(0,206,201,0.2)', borderRadius: 'var(--radius-md)' }}>
                <FileText size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</span>
                <button type="button" onClick={() => setPdfFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}>
                <FileText size={18} />
                <span>Subir carta/menú en PDF</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-faint)' }}>máx. 10 MB</span>
                <input type="file" accept="application/pdf" onChange={handlePdfChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 8 }}>Horarios <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(opcional)</span></label>
            <WeekHoursEditor value={weekHours} onChange={setWeekHours} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 10 }}>Plan</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {PLANS.map((p) => {
                const active = plan === p.value
                return (
                  <button key={p.value} type="button" onClick={() => setPlan(p.value)}
                    style={{
                      padding: '14px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 4,
                      border: `2px solid ${active ? p.border : 'var(--card-border)'}`,
                      background: active ? p.bg : 'rgba(255,255,255,0.02)',
                    }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: active ? p.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.label}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: active ? p.color : 'var(--text)' }}>{p.price}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', lineHeight: 1.4 }}>{p.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Galería <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(hasta 6 fotos)</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
              {galleryPreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeGalleryItem(i)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
              {galleryPreviews.length < 6 && (
                <label style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}>
                  <Images size={18} /><span style={{ fontSize: '0.7rem' }}>Agregar</span>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleGalleryChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Modo de canje</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { value: 'one_per_promo' as const, label: 'Por promoción', desc: 'El estudiante puede canjear cada promo una vez' },
                { value: 'one_per_establishment' as const, label: 'Por establecimiento', desc: 'Solo un canje total por estudiante' },
              ]).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setRedemptionMode(opt.value)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
                    border: `2px solid ${redemptionMode === opt.value ? 'var(--primary)' : 'var(--card-border)'}`,
                    background: redemptionMode === opt.value ? 'rgba(108,92,231,0.1)' : 'rgba(255,255,255,0.02)',
                  }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: redemptionMode === opt.value ? 'var(--primary-light)' : 'var(--text-muted)' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', lineHeight: 1.4 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> {uploading ? 'Subiendo archivos...' : 'Guardando...'}</> : 'Guardar cliente'}
            </button>
            <Link href="/clientes" className="btn btn-ghost btn-md">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  )
}
