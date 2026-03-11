import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, Globe, ArrowLeft, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'

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

interface Props {
  params: Promise<{ id: string }>
}

export default async function EstablishmentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: establishment } = await supabase
    .from('establishments')
    .select(`
      id, name, description, category, address, city, country,
      phone, website, image_url, opening_hours, is_active,
      promotions ( id, title, description, original_price, discounted_price, discount_percentage, valid_until, terms_conditions, is_active )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!establishment) notFound()

  const activePromos = (establishment.promotions as {
    id: string
    title: string
    description: string | null
    original_price: number | null
    discounted_price: number | null
    discount_percentage: number | null
    valid_until: string | null
    terms_conditions: string | null
    is_active: boolean
  }[]).filter((p) => p.is_active)

  return (
    <>
      <Navbar />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        {/* Back */}
        <Link
          href="/explore"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Volver
        </Link>

        {/* Hero image */}
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1.5rem', aspectRatio: '16/8', background: 'var(--bg-tertiary)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={establishment.image_url ?? `https://picsum.photos/seed/${establishment.id}/800/400`}
            alt={establishment.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {CATEGORY_LABELS[establishment.category] ?? establishment.category}
          </span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {establishment.name}
          </h1>
        </div>

        {/* Description */}
        {establishment.description && (
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            {establishment.description}
          </p>
        )}

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          <div className="glass" style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <MapPin size={13} /> Dirección
            </div>
            <p style={{ color: 'var(--text)', margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>
              {establishment.address}
            </p>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem' }}>
              {establishment.city}, {establishment.country}
            </p>
          </div>

          {establishment.phone && (
            <div className="glass" style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Phone size={13} /> Teléfono
              </div>
              <p style={{ color: 'var(--text)', margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>
                {establishment.phone}
              </p>
            </div>
          )}

          {establishment.website && (
            <div className="glass" style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Globe size={13} /> Website
              </div>
              <a href={establishment.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)', fontWeight: 500, fontSize: '0.9rem' }}>
                Visitar sitio web
              </a>
            </div>
          )}

          {establishment.opening_hours && Object.keys(establishment.opening_hours).length > 0 && (
            <div className="glass" style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Horarios
              </div>
              {Object.entries(establishment.opening_hours).map(([day, time]) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 2 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{day}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promotions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <Tag size={17} style={{ color: 'var(--secondary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Promociones para estudiantes
            </h2>
          </div>

          {activePromos.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {activePromos.map((promo) => (
                <div
                  key={promo.id}
                  className="glass"
                  style={{ padding: '1rem 1.125rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--secondary)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ color: 'var(--text)', fontWeight: 600, margin: 0, fontSize: '0.95rem' }}>{promo.title}</h3>
                    {promo.discount_percentage && (
                      <span style={{ background: 'var(--secondary)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.15rem 0.6rem', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                        -{promo.discount_percentage}%
                      </span>
                    )}
                  </div>

                  {promo.description && (
                    <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.875rem' }}>
                      {promo.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {promo.original_price != null && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Precio normal</span>
                        <p style={{ margin: 0, color: 'var(--text-muted)', textDecoration: 'line-through', fontWeight: 500 }}>
                          ${promo.original_price}
                        </p>
                      </div>
                    )}
                    {promo.discounted_price != null && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Tu precio</span>
                        <p style={{ margin: 0, color: 'var(--secondary)', fontSize: '1.2rem', fontWeight: 700 }}>
                          ${promo.discounted_price}
                        </p>
                      </div>
                    )}
                    {promo.valid_until && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Válido hasta</span>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>
                          {promo.valid_until}
                        </p>
                      </div>
                    )}
                  </div>

                  {promo.terms_conditions && (
                    <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
                      * {promo.terms_conditions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No hay promociones activas por el momento.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
