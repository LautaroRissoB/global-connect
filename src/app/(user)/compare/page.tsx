'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, X, Search, Share2,
  Phone, Globe,
} from 'lucide-react'
import Navbar from '@/components/ui/Navbar'
import { createClient } from '@/lib/supabase/client'

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurante',
  bar:        'Bar',
  club:       'Discoteca',
  cafe:       'Cafetería',
  cultural:   'Cultura',
  theater:    'Teatro',
  sports:     'Deportes',
  other:      'Otro',
}

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  bar:        '🍺',
  club:       '🎵',
  cafe:       '☕',
  cultural:   '🎭',
  theater:    '🎪',
  sports:     '💪',
  other:      '🌟',
}

interface Promo {
  title: string
  discount_percentage: number | null
  discounted_price:   number | null
  original_price:     number | null
  valid_until:        string | null
  is_active:          boolean
}

interface Establishment {
  id:          string
  name:        string
  category:    string
  city:        string
  country:     string
  address:     string
  phone:       string | null
  website:     string | null
  image_url:   string | null
  price_range: string | null
  promotions:  Promo[]
}

function bestDiscount(e: Establishment): Promo | null {
  const active = e.promotions.filter(p => p.is_active)
  if (!active.length) return null
  return active.reduce((best, p) =>
    (p.discount_percentage ?? 0) > (best.discount_percentage ?? 0) ? p : best
  )
}

function activePromoCount(e: Establishment): number {
  return e.promotions.filter(p => p.is_active).length
}

/* ─── Main component ─── */
function CompareContent() {
  const searchParams = useSearchParams()

  const [allEstablishments, setAllEstablishments] = useState<Establishment[]>([])
  const [selected,          setSelected]          = useState<Establishment[]>([])
  const [showPicker,        setShowPicker]        = useState(false)
  const [pickerSearch,      setPickerSearch]      = useState('')
  const [loading,           setLoading]           = useState(true)
  const [copied,            setCopied]            = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('establishments')
        .select(`
          id, name, category, city, country, address,
          phone, website, image_url, price_range,
          promotions (
            title, discount_percentage, discounted_price,
            original_price, valid_until, is_active
          )
        `)
        .eq('is_active', true)
        .order('name')

      const list = (data as Establishment[]) ?? []
      setAllEstablishments(list)

      const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? []
      if (ids.length > 0) {
        setSelected(list.filter(e => ids.includes(e.id)).slice(0, 2))
      }

      setLoading(false)
    }
    load()
  }, [searchParams])

  function addEstablishment(e: Establishment) {
    if (selected.length >= 2 || selected.find(s => s.id === e.id)) return
    setSelected(prev => [...prev, e])
    closePicker()
  }

  function removeEstablishment(id: string) {
    setSelected(prev => prev.filter(e => e.id !== id))
  }

  function closePicker() {
    setShowPicker(false)
    setPickerSearch('')
  }

  async function shareUrl() {
    const ids = selected.map(e => e.id).join(',')
    const url = `${window.location.origin}/compare?ids=${ids}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* Filter picker list */
  const available = allEstablishments.filter(e => !selected.find(s => s.id === e.id))
  const pickerFiltered = pickerSearch
    ? available.filter(e =>
        e.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        e.city.toLowerCase().includes(pickerSearch.toLowerCase())
      )
    : available

  /* Compute winners */
  const discountValues = selected.map(e => bestDiscount(e)?.discount_percentage ?? 0)
  const promoValues    = selected.map(e => activePromoCount(e))
  const maxDiscount    = Math.max(...discountValues, 0)
  const maxPromos      = Math.max(...promoValues, 0)

  const showSlot = selected.length < 2

  return (
    <>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>

        {/* ── Back link ── */}
        <Link
          href="/explore"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--text-muted)', fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} /> Volver a explorar
        </Link>

        {/* ── Page header ── */}
        <div className="compare-page-header">
          <div>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '0.3rem',
            }}>
              Comparar lugares
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {selected.length === 0
                ? 'Seleccioná 2 lugares para compararlos.'
                : selected.length === 1
                  ? 'Agregá un lugar más para comparar.'
                  : '2 lugares listos para comparar.'}
            </p>
          </div>

          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
              {selected.length < 2 && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowPicker(true)}>
                  <Plus size={15} /> Agregar
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={shareUrl}>
                <Share2 size={15} />
                {copied ? '¡Copiado!' : 'Compartir'}
              </button>
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            Cargando...
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && selected.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚖️</div>
            <h2 style={{
              fontSize: '1.25rem', fontWeight: 700,
              marginBottom: '0.5rem', color: 'var(--text)',
            }}>
              Empezá a comparar
            </h2>
            <p style={{
              color: 'var(--text-muted)', maxWidth: 340,
              margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.9rem',
            }}>
              Seleccioná 2 lugares para ver sus diferencias lado a lado.
            </p>
            <button className="btn btn-primary btn-md" onClick={() => setShowPicker(true)}>
              <Plus size={18} /> Agregar lugar
            </button>
          </div>
        )}

        {/* ── Side-by-side comparison ── */}
        {!loading && selected.length > 0 && (
          <div className="cmp-sb-wrap">

            {/* ─ Photo / header row ─ */}
            <div className="cmp-sb-heads">
              {selected.map((e, i) => {
                const isWinner = selected.length === 2 && discountValues[i] > 0 && discountValues[i] === maxDiscount
                return (
                  <div key={e.id} className={`cmp-sb-head${isWinner ? ' is-winner' : ''}`}>
                    <div className="cmp-sb-photo-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/225`}
                        alt={e.name}
                        className="cmp-sb-photo"
                      />
                      {isWinner && <span className="cmp-sb-winner-badge">Mejor descuento</span>}
                      <button
                        className="compare-remove-btn"
                        onClick={() => removeEstablishment(e.id)}
                        title={`Quitar ${e.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="cmp-sb-head-info">
                      <span className="cmp-sb-name">{e.name}</span>
                      <span className="cmp-sb-cat">
                        {CATEGORY_EMOJI[e.category]} {CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    </div>
                  </div>
                )
              })}
              {showSlot && (
                <button className="cmp-sb-add-head" onClick={() => setShowPicker(true)}>
                  <Plus size={20} />
                  <span>Agregar lugar</span>
                </button>
              )}
            </div>

            {/* ─ Descuento ─ */}
            <div className="cmp-sb-row">
              <div className="cmp-sb-row-label">Descuento</div>
              <div className="cmp-sb-cells">
                {selected.map((e, i) => {
                  const promo    = bestDiscount(e)
                  const isWinner = selected.length === 2 && discountValues[i] > 0 && discountValues[i] === maxDiscount
                  return (
                    <div key={e.id} className={`cmp-sb-cell${isWinner ? ' is-win' : ''}`}>
                      <span className={`cmp-sb-val-hero${isWinner ? ' is-win' : ''}`}>
                        {promo ? `-${promo.discount_percentage}%` : '—'}
                      </span>
                      {promo?.discounted_price != null && (
                        <span className="cmp-sb-sub">desde ${promo.discounted_price}</span>
                      )}
                      {isWinner && <span className="cmp-sb-best-tag">Mejor descuento</span>}
                    </div>
                  )
                })}
                {showSlot && <div className="cmp-sb-cell is-empty" />}
              </div>
            </div>

            {/* ─ Precio ─ */}
            <div className="cmp-sb-row">
              <div className="cmp-sb-row-label">Precio</div>
              <div className="cmp-sb-cells">
                {selected.map(e => (
                  <div key={e.id} className="cmp-sb-cell">
                    <span className="cmp-sb-val-md">{e.price_range ?? '—'}</span>
                  </div>
                ))}
                {showSlot && <div className="cmp-sb-cell is-empty" />}
              </div>
            </div>

            {/* ─ Promociones activas ─ */}
            <div className="cmp-sb-row">
              <div className="cmp-sb-row-label">Promociones activas</div>
              <div className="cmp-sb-cells">
                {selected.map((e, i) => {
                  const count    = promoValues[i]
                  const isWinner = selected.length === 2 && count > 0 && count === maxPromos
                  return (
                    <div key={e.id} className={`cmp-sb-cell${isWinner ? ' is-win' : ''}`}>
                      <span className={`cmp-sb-val-md${isWinner ? ' is-win' : ''}`}>
                        {count > 0 ? count : '—'}
                      </span>
                      {count > 0 && (
                        <span className="cmp-sb-sub">{count === 1 ? 'promoción' : 'promociones'}</span>
                      )}
                    </div>
                  )
                })}
                {showSlot && <div className="cmp-sb-cell is-empty" />}
              </div>
            </div>

            {/* ─ Ubicación ─ */}
            <div className="cmp-sb-row">
              <div className="cmp-sb-row-label">Ubicación</div>
              <div className="cmp-sb-cells">
                {selected.map(e => (
                  <div key={e.id} className="cmp-sb-cell">
                    <span className="cmp-sb-val-sm">{e.city}, {e.country}</span>
                  </div>
                ))}
                {showSlot && <div className="cmp-sb-cell is-empty" />}
              </div>
            </div>

            {/* ─ Contacto ─ */}
            <div className="cmp-sb-row">
              <div className="cmp-sb-row-label">Contacto</div>
              <div className="cmp-sb-cells">
                {selected.map(e => (
                  <div key={e.id} className="cmp-sb-cell">
                    {e.phone
                      ? <a href={`tel:${e.phone}`} className="cmp-vs-contact-link"><Phone size={11} />{e.phone}</a>
                      : <span className="cmp-sb-na">—</span>}
                    {e.website
                      ? <a href={e.website} target="_blank" rel="noopener noreferrer" className="cmp-vs-contact-link"><Globe size={11} />Ver Instagram</a>
                      : null}
                  </div>
                ))}
                {showSlot && <div className="cmp-sb-cell is-empty" />}
              </div>
            </div>

            {/* ─ CTA ─ */}
            <div className="cmp-sb-row cmp-sb-cta-row">
              <div className="cmp-sb-cells">
                {selected.map((e, i) => {
                  const isWinner = selected.length === 2 && discountValues[i] > 0 && discountValues[i] === maxDiscount
                  return (
                    <div key={e.id} className="cmp-sb-cell">
                      <Link
                        href={`/establishment/${e.id}`}
                        className={`btn btn-sm${isWinner ? ' btn-primary' : ' btn-outline'}`}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        Ver detalle
                      </Link>
                    </div>
                  )
                })}
                {showSlot && <div className="cmp-sb-cell is-empty" />}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ══════════════════════════════
          PICKER — bottom sheet mobile / modal desktop
      ══════════════════════════════ */}
      {showPicker && (
        <div className="compare-picker-overlay" onClick={closePicker}>
          <div className="compare-picker" onClick={e => e.stopPropagation()}>

            {/* Handle bar (mobile) */}
            <div className="compare-picker-handle" />

            <div className="compare-picker-header">
              <h3>Agregar lugar</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={closePicker}>
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="compare-picker-search-wrap">
              <Search size={15} className="compare-picker-search-icon" />
              <input
                type="text"
                className="compare-picker-search-input"
                placeholder="Buscar por nombre o ciudad..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                autoFocus
              />
              {pickerSearch && (
                <button
                  onClick={() => setPickerSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* List */}
            <div className="compare-picker-list">
              {pickerFiltered.length > 0 ? (
                pickerFiltered.map(e => (
                  <button
                    key={e.id}
                    className="compare-picker-item"
                    onClick={() => addEstablishment(e)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.image_url ?? `https://picsum.photos/seed/${e.id}/80/80`}
                      alt={e.name}
                      className="compare-picker-item-img"
                    />
                    <div className="compare-picker-item-info">
                      <span className="compare-picker-item-name">{e.name}</span>
                      <span className="compare-picker-item-meta">
                        {CATEGORY_EMOJI[e.category]} {CATEGORY_LABELS[e.category] ?? e.category} · {e.city}
                      </span>
                    </div>
                    <div className="compare-picker-item-add">
                      <Plus size={16} />
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {pickerSearch
                      ? `Sin resultados para "${pickerSearch}"`
                      : 'No hay más lugares disponibles.'}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  )
}
