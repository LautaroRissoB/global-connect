'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, X, Search, Share2,
  Trophy, MapPin, Phone, Globe, Tag,
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

/* ─── Label cell helper ─── */
function LabelCell({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="compare-label-cell">
      {icon && <span className="compare-label-icon">{icon}</span>}
      {children}
    </div>
  )
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
        setSelected(list.filter(e => ids.includes(e.id)).slice(0, 3))
      }

      setLoading(false)
    }
    load()
  }, [searchParams])

  function addEstablishment(e: Establishment) {
    if (selected.length >= 3 || selected.find(s => s.id === e.id)) return
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

  /* Grid template: sticky label col + one col per selected establishment */
  const gridCols = `minmax(100px, 130px) repeat(${Math.max(selected.length, 1)}, minmax(190px, 1fr))`

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
                ? 'Elegí hasta 3 lugares para ver sus características lado a lado.'
                : `${selected.length} de 3 lugar${selected.length !== 1 ? 'es' : ''} seleccionado${selected.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
              {selected.length < 3 && (
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
              Agregá hasta 3 establecimientos para encontrar la mejor opción para vos.
            </p>
            <button className="btn btn-primary btn-md" onClick={() => setShowPicker(true)}>
              <Plus size={18} /> Agregar lugar
            </button>
          </div>
        )}

        {/* ── Comparison table ── */}
        {!loading && selected.length > 0 && (
          <>
            {/* Scroll hint — only on mobile when 2+ selected */}
            {selected.length > 1 && (
              <p style={{
                fontSize: '0.72rem', color: 'var(--text-faint)',
                marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                ← → Deslizá para comparar
              </p>
            )}

            <div className="compare-scroll">
              <div className="compare-table" style={{ gridTemplateColumns: gridCols }}>

                {/* ══ ROW: Images ══ */}
                <div className="compare-label-cell compare-img-label">
                  {selected.length < 3 && (
                    <button
                      className="compare-add-slot"
                      onClick={() => setShowPicker(true)}
                      title="Agregar lugar"
                    >
                      <Plus size={20} />
                      <span>Agregar</span>
                    </button>
                  )}
                </div>
                {selected.map(e => (
                  <div key={e.id} className="compare-img-cell">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/240`}
                      alt={e.name}
                      className="compare-img"
                    />
                    <button
                      className="compare-remove-btn"
                      onClick={() => removeEstablishment(e.id)}
                      title={`Quitar ${e.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* ══ ROW: Nombre ══ */}
                <LabelCell>Nombre</LabelCell>
                {selected.map(e => (
                  <div key={e.id} className="compare-data-cell">
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.3 }}>
                      {e.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {CATEGORY_EMOJI[e.category]} {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                  </div>
                ))}

                {/* ══ ROW: Ubicación ══ */}
                <LabelCell icon={<MapPin size={12} />}>Ubicación</LabelCell>
                {selected.map(e => (
                  <div key={e.id} className="compare-data-cell">
                    <span style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>
                      {e.city}, {e.country}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {e.address}
                    </span>
                  </div>
                ))}

                {/* ══ ROW: Precio ══ */}
                <LabelCell icon={<Tag size={12} />}>Precio</LabelCell>
                {selected.map(e => (
                  <div key={e.id} className="compare-data-cell">
                    {e.price_range ? (
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                        {e.price_range}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </div>
                ))}

                {/* ══ ROW: Mejor descuento ══ */}
                <LabelCell icon={<Trophy size={12} />}>Mejor descuento</LabelCell>
                {selected.map((e, i) => {
                  const promo    = bestDiscount(e)
                  const isWinner = discountValues[i] > 0 && discountValues[i] === maxDiscount
                  return (
                    <div key={e.id} className={`compare-data-cell${isWinner ? ' compare-winner' : ''}`}>
                      {promo ? (
                        <>
                          <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                            -{promo.discount_percentage}%
                          </span>
                          {promo.discounted_price != null && (
                            <span style={{ fontSize: '0.8rem', marginTop: 2, opacity: 0.85 }}>
                              desde €{promo.discounted_price}
                            </span>
                          )}
                          {isWinner && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: 4 }}>
                              🏆 Mejor oferta
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>Sin descuentos</span>
                      )}
                    </div>
                  )
                })}

                {/* ══ ROW: Promociones activas ══ */}
                <LabelCell>Promos activas</LabelCell>
                {selected.map((e, i) => {
                  const count    = promoValues[i]
                  const isWinner = count > 0 && count === maxPromos
                  return (
                    <div key={e.id} className={`compare-data-cell${isWinner ? ' compare-winner' : ''}`}>
                      <span style={{ fontWeight: isWinner ? 700 : 500, fontSize: '0.95rem' }}>
                        {count} promoción{count !== 1 ? 'es' : ''}
                        {isWinner && count > 0 ? ' 🏆' : ''}
                      </span>
                    </div>
                  )
                })}

                {/* ══ ROW: Teléfono ══ */}
                <LabelCell icon={<Phone size={12} />}>Teléfono</LabelCell>
                {selected.map(e => (
                  <div key={e.id} className="compare-data-cell">
                    {e.phone ? (
                      <a
                        href={`tel:${e.phone}`}
                        style={{ color: 'var(--primary-light)', fontSize: '0.875rem' }}
                      >
                        {e.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </div>
                ))}

                {/* ══ ROW: Web ══ */}
                <LabelCell icon={<Globe size={12} />}>Sitio web</LabelCell>
                {selected.map(e => (
                  <div key={e.id} className="compare-data-cell">
                    {e.website ? (
                      <a
                        href={e.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary-light)', fontSize: '0.875rem', textDecoration: 'underline' }}
                      >
                        Ver sitio →
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </div>
                ))}

                {/* ══ ROW: CTA ══ */}
                <div className="compare-label-cell" />
                {selected.map(e => (
                  <div key={e.id} className="compare-data-cell" style={{ paddingBottom: '1.25rem' }}>
                    <Link
                      href={`/establishment/${e.id}`}
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Ver detalle
                    </Link>
                  </div>
                ))}

              </div>
            </div>
          </>
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
