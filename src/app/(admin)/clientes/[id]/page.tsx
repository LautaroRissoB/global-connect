'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { X, Upload, Instagram, FileText, Images, Plus, Pencil, Eye, EyeOff, Tag, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { EstablishmentCategory } from '@/types/database'
import WeekHoursEditor, { DEFAULT_WEEK, parseOpeningHours, weekToOpeningHours, type WeekHours } from '@/components/admin/WeekHoursEditor'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Promotion {
  id: string
  title: string
  description: string | null
  discount_percentage: number | null
  original_price: number | null
  discounted_price: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

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
    bg: 'rgba(0,0,0,0.01)',
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
    bg: 'rgba(43,136,216,0.08)',
  },
] as const

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClienteDetallePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [activeTab, setActiveTab] = useState<'datos' | 'descuentos'>('datos')

  // ── Edit form state ──
  const [fetching,      setFetching]      = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [pdfFile,       setPdfFile]       = useState<File | null>(null)
  const [existingPdf,   setExistingPdf]   = useState<string | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [weekHours,     setWeekHours]     = useState<WeekHours>(DEFAULT_WEEK)
  const [plan,            setPlan]            = useState<'free' | 'basic' | 'pro'>('free')
  const [redemptionMode,  setRedemptionMode]  = useState<'one_per_promo' | 'one_per_establishment'>('one_per_promo')
  const [galleryFiles,    setGalleryFiles]    = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [existingGallery, setExistingGallery] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '', description: '', category: 'restaurant' as EstablishmentCategory,
    address: '', city: '', country: '', phone: '', website: '', instagram: '',
    price_range: '' as '$' | '$$' | '$$$' | '$$$$' | '',
  })

  // ── Promotions state ──
  const [promotions,         setPromotions]         = useState<Promotion[]>([])
  const [promoLoading,       setPromoLoading]       = useState(false)
  const [confirmDeleteEstab, setConfirmDeleteEstab] = useState(false)
  const [deletingEstab,      setDeletingEstab]      = useState(false)
  const [confirmDeletePromo, setConfirmDeletePromo] = useState<string | null>(null)
  const [deletingPromo,      setDeletingPromo]      = useState(false)

  // ── Load establishment data ──
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('establishments').select('*').eq('id', id).single()

      if (fetchError || !data) { setError('Establecimiento no encontrado.'); setFetching(false); return }

      setForm({
        name: data.name, description: data.description ?? '',
        category: data.category, address: data.address,
        city: data.city, country: data.country,
        phone: data.phone ?? '', website: data.website ?? '',
        instagram: data.instagram ?? '',
        price_range: (data.price_range ?? '') as '$' | '$$' | '$$$' | '$$$$' | '',
      })
      setPlan((data.plan ?? 'free') as 'free' | 'basic' | 'pro')
      if (data.image_url)    setImagePreview(data.image_url)
      if (data.menu_pdf_url) setExistingPdf(data.menu_pdf_url)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any
      if (Array.isArray(d.gallery_urls) && d.gallery_urls.length > 0) setExistingGallery(d.gallery_urls)
      if (d.redemption_mode) setRedemptionMode(d.redemption_mode as 'one_per_promo' | 'one_per_establishment')
      if (data.opening_hours && typeof data.opening_hours === 'object') {
        setWeekHours(parseOpeningHours(data.opening_hours as Record<string, string>))
      }
      setFetching(false)
    }
    load()
  }, [id])

  // ── Load promotions ──
  useEffect(() => {
    async function loadPromos() {
      setPromoLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('promotions')
        .select('id, title, description, discount_percentage, original_price, discounted_price, valid_from, valid_until, is_active')
        .eq('establishment_id', id)
        .order('created_at', { ascending: false })
      setPromotions(data ?? [])
      setPromoLoading(false)
    }
    loadPromos()
  }, [id])

  // ── Form helpers ──
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

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const max = 6 - existingGallery.length - galleryFiles.length
    const files = Array.from(e.target.files ?? []).slice(0, max)
    if (!files.length) return
    setGalleryFiles((prev) => [...prev, ...files])
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  function removeExistingGallery(index: number) {
    setExistingGallery((prev) => prev.filter((_, i) => i !== index))
  }

  function removeNewGallery(index: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    path: string
  ): Promise<string | null> {
    const { error: uploadError } = await supabase.storage
      .from('establishments').upload(path, file, { cacheControl: '3600', upsert: true })
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

    const newGalleryUrls: string[] = []
    for (let i = 0; i < galleryFiles.length; i++) {
      const url = await uploadFile(supabase, galleryFiles[i], `gallery_${id}_${ts}_${i}.${galleryFiles[i].name.split('.').pop()}`)
      if (url) newGalleryUrls.push(url)
    }
    const gallery_urls = [...existingGallery, ...newGalleryUrls]

    setUploading(false)
    if (error) { setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from('establishments')
      .update({
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
      .eq('id', id)

    if (dbError) { setError(dbError.message); setLoading(false); return }

    router.push('/clientes')
    router.refresh()
  }

  async function togglePromo(promoId: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('promotions').update({ is_active: !current }).eq('id', promoId)
    setPromotions((prev) => prev.map((p) => p.id === promoId ? { ...p, is_active: !current } : p))
  }

  async function deleteEstablishment() {
    setDeletingEstab(true)
    const supabase = createClient()
    await supabase.from('promotions').delete().eq('establishment_id', id)
    await supabase.from('establishments').delete().eq('id', id)
    router.push('/clientes')
    router.refresh()
  }

  async function deletePromo(promoId: string) {
    setDeletingPromo(true)
    const supabase = createClient()
    await supabase.from('promotions').delete().eq('id', promoId)
    setPromotions((prev) => prev.filter((p) => p.id !== promoId))
    setConfirmDeletePromo(null)
    setDeletingPromo(false)
  }

  if (fetching) return <p style={{ color: 'var(--text-muted)', padding: '2rem' }}>Cargando...</p>

  return (
    <>
      {/* Header */}
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">{form.name || 'Cliente'}</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>{form.city}</p>
        </div>
        <Link href="/clientes" className="btn btn-ghost btn-sm">← Volver</Link>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }}>
        {(['datos', 'descuentos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.6rem 1.1rem', fontSize: '0.875rem', fontWeight: 600,
              color: activeTab === tab ? 'var(--primary-light)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'datos' ? 'Datos' : `Descuentos${promotions.length > 0 ? ` (${promotions.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── Tab: Datos ─────────────────────────────────────── */}
      {activeTab === 'datos' && (
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
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
                        background: form.price_range === p.value ? 'rgba(43,136,216,0.12)' : 'rgba(0,0,0,0.02)',
                        color: form.price_range === p.value ? 'var(--primary-light)' : 'var(--text-muted)',
                      }}>{p.label}</button>
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

            {/* PDF */}
            <div className="form-group">
              <label className="form-label">Menú (PDF) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(opcional)</span></label>
              {pdfFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,206,201,0.08)', border: '1px solid rgba(0,206,201,0.2)', borderRadius: 'var(--radius-md)' }}>
                  <FileText size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</span>
                  <button type="button" onClick={() => setPdfFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
                </div>
              ) : existingPdf ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,206,201,0.06)', border: '1px solid rgba(0,206,201,0.15)', borderRadius: 'var(--radius-md)' }}>
                  <FileText size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  <a href={existingPdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--secondary)', flex: 1 }}>Ver menú actual</a>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '3px 8px' }}>
                    Reemplazar<input type="file" accept="application/pdf" onChange={handlePdfChange} style={{ display: 'none' }} />
                  </label>
                  <button type="button" onClick={() => setExistingPdf(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
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

            {/* Horarios */}
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 8 }}>Horarios <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(opcional)</span></label>
              <WeekHoursEditor value={weekHours} onChange={setWeekHours} />
            </div>

            {/* Plan */}
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
                        background: active ? p.bg : 'rgba(0,0,0,0.01)',
                      }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: active ? p.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.label}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: active ? p.color : 'var(--text)' }}>{p.price}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', lineHeight: 1.4 }}>{p.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Galería */}
            <div className="form-group">
              <label className="form-label">Galería <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(hasta 6 fotos)</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                {existingGallery.map((src, i) => (
                  <div key={`ex-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeExistingGallery(i)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {galleryPreviews.map((src, i) => (
                  <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeNewGallery(i)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {(existingGallery.length + galleryPreviews.length) < 6 && (
                  <label style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}>
                    <Images size={18} /><span style={{ fontSize: '0.7rem' }}>Agregar</span>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleGalleryChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            {/* Modo de canje */}
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
                      background: redemptionMode === opt.value ? 'rgba(43,136,216,0.08)' : 'rgba(0,0,0,0.01)',
                    }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: redemptionMode === opt.value ? 'var(--primary-light)' : 'var(--text-muted)' }}>{opt.label}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', lineHeight: 1.4 }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
                {loading ? <><span className="btn-spinner" /> {uploading ? 'Subiendo archivos...' : 'Guardando...'}</> : 'Guardar cambios'}
              </button>
              <Link href="/clientes" className="btn btn-ghost btn-md">Cancelar</Link>
            </div>
          </form>

          {/* Zona de peligro */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
            {!confirmDeleteEstab ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteEstab(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(220,53,69,0.35)', color: 'rgba(220,53,69,0.8)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
              >
                <Trash2 size={14} /> Eliminar establecimiento
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text)', flex: 1 }}>¿Eliminar <strong>{form.name}</strong> y todos sus descuentos? Esta acción no se puede deshacer.</span>
                <button onClick={deleteEstablishment} disabled={deletingEstab}
                  style={{ background: 'rgb(220,53,69)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {deletingEstab ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button onClick={() => setConfirmDeleteEstab(false)}
                  style={{ background: 'none', border: '1px solid var(--card-border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Descuentos ────────────────────────────────── */}
      {activeTab === 'descuentos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Descuentos y promociones activos para este establecimiento.
            </p>
            <Link href={`/clientes/${id}/descuentos/new`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Nuevo descuento
            </Link>
          </div>

          {promoLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cargando...</p>
          ) : promotions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--card-border)', borderRadius: 'var(--radius-lg)' }}>
              <Tag size={32} style={{ color: 'var(--text-faint)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Sin descuentos todavía.</p>
              <Link href={`/clientes/${id}/descuentos/new`} className="btn btn-primary btn-sm">
                <Plus size={14} /> Agregar el primero
              </Link>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Descuento</th>
                    <th>Precio final</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div>{p.title}</div>
                        {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 2 }}>{p.description}</div>}
                      </td>
                      <td>
                        {p.discount_percentage != null
                          ? <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>-{p.discount_percentage}%</span>
                          : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--text)' }}>
                        {p.discounted_price != null ? `$${p.discounted_price}` : p.original_price != null ? `$${p.original_price}` : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {p.valid_until ? `hasta ${new Date(p.valid_until).toLocaleDateString('es-AR')}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {confirmDeletePromo === p.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => deletePromo(p.id)} disabled={deletingPromo}
                              style={{ background: 'rgb(220,53,69)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                              {deletingPromo ? '...' : 'Confirmar'}
                            </button>
                            <button onClick={() => setConfirmDeletePromo(null)}
                              style={{ background: 'none', border: '1px solid var(--card-border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="action-btns">
                            <Link href={`/clientes/${id}/descuentos/${p.id}`} className="action-btn" title="Editar">
                              <Pencil size={14} />
                            </Link>
                            <button
                              onClick={() => togglePromo(p.id, p.is_active)}
                              className={`action-btn ${p.is_active ? 'deactivate' : 'activate'}`}
                              title={p.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {p.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => setConfirmDeletePromo(p.id)}
                              className="action-btn deactivate"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
