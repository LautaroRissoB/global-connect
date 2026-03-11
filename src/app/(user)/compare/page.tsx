'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
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

interface Promo {
  title: string
  discount_percentage: number | null
  discounted_price: number | null
  original_price: number | null
  valid_until: string | null
  is_active: boolean
}

interface Establishment {
  id: string
  name: string
  category: string
  city: string
  country: string
  address: string
  phone: string | null
  website: string | null
  image_url: string | null
  promotions: Promo[]
}

function CompareContent() {
  const searchParams = useSearchParams()
  const [allEstablishments, setAllEstablishments] = useState<Establishment[]>([])
  const [selected, setSelected] = useState<Establishment[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('establishments')
        .select(`id, name, category, city, country, address, phone, website, image_url,
          promotions ( title, discount_percentage, discounted_price, original_price, valid_until, is_active )`)
        .eq('is_active', true)
        .order('name')

      const list = (data as Establishment[]) ?? []
      setAllEstablishments(list)

      // Pre-seleccionar si viene ?ids= en la URL
      const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? []
      if (ids.length > 0) {
        setSelected(list.filter((e) => ids.includes(e.id)).slice(0, 3))
      }

      setLoading(false)
    }
    load()
  }, [searchParams])

  function addEstablishment(e: Establishment) {
    if (selected.length >= 3 || selected.find((s) => s.id === e.id)) return
    setSelected((prev) => [...prev, e])
    setShowPicker(false)
  }

  function removeEstablishment(id: string) {
    setSelected((prev) => prev.filter((e) => e.id !== id))
  }

  const bestDiscount = (e: Establishment) => {
    const active = e.promotions.filter((p) => p.is_active)
    if (active.length === 0) return null
    return active.reduce((best, p) =>
      (p.discount_percentage ?? 0) > (best.discount_percentage ?? 0) ? p : best
    )
  }

  const available = allEstablishments.filter((e) => !selected.find((s) => s.id === e.id))

  return (
    <>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        <Link
          href="/explore"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Volver a explorar
        </Link>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>
            Comparar establecimientos
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Compará hasta 3 lugares para encontrar la mejor opción.
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        ) : (
          <>
            {/* Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(selected.length + (selected.length < 3 ? 1 : 0), 1)}, 1fr)`, gap: '1rem', marginBottom: '2rem' }}>
              {selected.map((e) => {
                const promo = bestDiscount(e)
                return (
                  <div key={e.id} className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
                    <button
                      onClick={() => removeEstablishment(e.id)}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 1 }}
                    >
                      <X size={14} />
                    </button>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/200`}
                      alt={e.name}
                      style={{ width: '100%', height: 160, objectFit: 'cover' }}
                    />

                    <div style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                      <h3 style={{ color: 'var(--text)', fontWeight: 700, margin: '0 0 0.25rem' }}>{e.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                        {e.city}, {e.country}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <Row label="Dirección" value={e.address} />
                        {e.phone && <Row label="Teléfono" value={e.phone} />}
                        {e.website && (
                          <Row
                            label="Web"
                            value={<a href={e.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>Ver sitio</a>}
                          />
                        )}
                        <Row
                          label="Mejor descuento"
                          value={
                            promo ? (
                              <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                                -{promo.discount_percentage}%
                                {promo.discounted_price != null ? ` (€${promo.discounted_price})` : ''}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Sin promociones</span>
                            )
                          }
                        />
                        <Row
                          label="Promociones"
                          value={`${e.promotions.filter((p) => p.is_active).length} activa${e.promotions.filter((p) => p.is_active).length !== 1 ? 's' : ''}`}
                        />
                      </div>

                      <Link href={`/establishment/${e.id}`} className="btn btn-outline btn-sm" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                )
              })}

              {/* Add slot */}
              {selected.length < 3 && (
                <div>
                  {showPicker ? (
                    <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '1rem', maxHeight: 400, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>Elegir lugar</span>
                        <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <X size={16} />
                        </button>
                      </div>
                      {available.length > 0 ? (
                        available.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => addEstablishment(e)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.6rem 0.5rem', cursor: 'pointer', color: 'var(--text)', borderRadius: 'var(--radius-sm)', borderBottom: '1px solid var(--card-border)' }}
                            onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--bg-secondary)')}
                            onMouseLeave={(ev) => (ev.currentTarget.style.background = 'none')}
                          >
                            <span style={{ fontWeight: 500 }}>{e.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>{e.city}</span>
                          </button>
                        ))
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay más establecimientos disponibles.</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPicker(true)}
                      style={{
                        width: '100%',
                        minHeight: 200,
                        border: '2px dashed var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--card-border)')}
                    >
                      <Plus size={24} />
                      <span>Agregar lugar</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {selected.length === 0 && (
              <div className="empty-state">
                <span style={{ fontSize: '3rem' }}>⚖️</span>
                <p>Seleccioná al menos un establecimiento para comparar.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowPicker(true)}>
                  Agregar lugar
                </button>
              </div>
            )}
          </>
        )}
      </div>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{value}</span>
    </div>
  )
}
