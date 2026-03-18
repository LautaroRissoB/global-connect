import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Phone, Globe, ArrowLeft, Instagram, FileText, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import TrackView from '@/components/ui/TrackView'
import SaveBenefitButton from '@/components/ui/SaveBenefitButton'

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

function mapsUrl(address: string, city: string, country: string) {
  // If address is already a URL, use it directly
  if (address.startsWith('http')) return address
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, ${country}`)}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('name, description, city, category')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Establecimiento | Global Connect' }

  const categoryLabel = CATEGORY_LABELS[data.category] ?? data.category
  return {
    title: `${data.name} | Global Connect`,
    description: data.description ??
      `${categoryLabel} en ${data.city}. Descubrí beneficios exclusivos para estudiantes internacionales.`,
  }
}

export default async function EstablishmentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch establishment + auth user + ratings in parallel
  const [{ data: establishment }, { data: { user } }, { data: ratingRows }] = await Promise.all([
    supabase
      .from('establishments')
      .select(`
        id, name, description, category, address, city, country,
        phone, website, instagram, price_range, image_url, gallery_urls, menu_pdf_url, opening_hours, is_active,
        promotions ( id, title, description, original_price, discounted_price, discount_percentage, valid_until, terms_conditions, is_active )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single(),
    supabase.auth.getUser(),
    supabase.from('redemptions').select('rating').eq('establishment_id', id).not('rating', 'is', null),
  ])

  if (!establishment) notFound()

  // Rating
  const ratings = (ratingRows ?? []).map((r) => (r as { rating: number }).rating)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
    : null

  // Fetch user's saved benefits (only if logged in)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedMap: Record<string, { id: string; status: string }> = {}
  if (user) {
    const { data: saved } = await (supabase as any)
      .from('saved_benefits')
      .select('id, promotion_id, status')
      .eq('user_id', user.id)
      .eq('establishment_id', id)
    if (saved) {
      for (const s of saved) savedMap[s.promotion_id] = { id: s.id, status: s.status }
    }
  }

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

  const hours = establishment.opening_hours
    ? Object.entries(establishment.opening_hours as Record<string, string>)
    : []

  return (
    <>
      <Navbar />
      <TrackView establishmentId={establishment.id} />

      <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: '5rem' }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', height: 280, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={establishment.image_url ?? '/placeholder-establishment.svg'}
            alt={establishment.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' }} />

          {/* Back button */}
          <Link
            href="/explore"
            style={{ position: 'absolute', top: 16, left: 16, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '0.8rem', borderRadius: 'var(--radius-full)', padding: '6px 14px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <ArrowLeft size={14} /> Volver
          </Link>

          {/* Name overlay at bottom of hero */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                {CATEGORY_LABELS[establishment.category] ?? establishment.category}
              </span>
              {establishment.price_range && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {establishment.price_range}
                </span>
              )}
              {activePromos.length > 0 && (
                <span style={{ background: 'var(--secondary)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  {activePromos.length} promo{activePromos.length > 1 ? 's' : ''} activa{activePromos.length > 1 ? 's' : ''}
                </span>
              )}
              {avgRating && (
                <span style={{ background: 'rgba(253,203,110,0.2)', color: '#fdcb6e', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, backdropFilter: 'blur(6px)', border: '1px solid rgba(253,203,110,0.3)' }}>
                  ⭐ {avgRating} ({ratings.length} reseña{ratings.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.2rem)', fontWeight: 800, color: '#fff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.4)', lineHeight: 1.1 }}>
              {establishment.name}
            </h1>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '1.5rem 1rem 0' }}>

          {/* Description */}
          {establishment.description && (
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {establishment.description}
            </p>
          )}

          {/* ── Gallery ── */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {((establishment as any).gallery_urls as string[] | null)?.length ? (
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem', marginLeft: '-1rem', marginRight: '-1rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
              <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {((establishment as any).gallery_urls as string[]).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" style={{ height: 160, width: 240, objectFit: 'cover', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Info chips row ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {/* Address */}
            <a
              href={mapsUrl(establishment.address, establishment.city, establishment.country)}
              target="_blank"
              rel="noopener noreferrer"
              className="glass"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontSize: '0.85rem', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            >
              <MapPin size={14} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
              <span>{establishment.city}, {establishment.country}</span>
              <span style={{ color: 'var(--primary-light)', fontSize: '0.75rem' }}>Ver mapa →</span>
            </a>

            {/* Phone */}
            {establishment.phone && (
              <a
                href={`tel:${establishment.phone}`}
                className="glass"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontSize: '0.85rem', color: 'var(--text)', border: '1px solid var(--card-border)' }}
              >
                <Phone size={14} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                {establishment.phone}
              </a>
            )}

            {/* Website */}
            {establishment.website && (
              <a
                href={establishment.website}
                target="_blank"
                rel="noopener noreferrer"
                className="glass"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontSize: '0.85rem', color: 'var(--text)', border: '1px solid var(--card-border)' }}
              >
                <Globe size={14} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                Sitio web
              </a>
            )}

            {/* Instagram */}
            {establishment.instagram && (
              <a
                href={`https://instagram.com/${establishment.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontSize: '0.85rem', color: 'var(--text)', border: '1px solid var(--card-border)' }}
              >
                <Instagram size={14} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                {establishment.instagram.startsWith('@') ? establishment.instagram : `@${establishment.instagram}`}
              </a>
            )}

            {/* PDF Menu */}
            {establishment.menu_pdf_url && (
              <a
                href={establishment.menu_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#fff', background: 'var(--secondary)', border: '1px solid var(--secondary)' }}
              >
                <FileText size={14} style={{ flexShrink: 0 }} />
                Ver menú
              </a>
            )}
          </div>

          {/* ── Hours ── */}
          {hours.length > 0 && (
            <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '1rem 1.125rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 10, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                <Clock size={13} /> Horarios
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px 1.5rem' }}>
                {hours.map(([day, time]) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '4px 0', borderBottom: '1px solid var(--card-border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{day}</span>
                    <span style={{ color: time === 'Cerrado' ? 'var(--text-faint)' : 'var(--text)', fontWeight: 500 }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Promotions ── */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'rgba(0,206,201,0.15)', borderRadius: 8, fontSize: '1rem' }}>🏷️</span>
              Promos para estudiantes
            </h2>

            {activePromos.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {activePromos.map((promo) => (
                  <div
                    key={promo.id}
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      background: 'linear-gradient(135deg, rgba(0,206,201,0.1) 0%, rgba(108,92,231,0.08) 100%)',
                      border: '1px solid rgba(0,206,201,0.2)',
                      position: 'relative',
                    }}
                  >
                    {/* Discount badge */}
                    {promo.discount_percentage && (
                      <div style={{
                        position: 'absolute', top: 0, right: 0,
                        background: 'var(--secondary)',
                        color: '#fff',
                        padding: '0.35rem 1rem',
                        borderBottomLeftRadius: 'var(--radius-md)',
                        fontWeight: 900,
                        fontSize: '1rem',
                        letterSpacing: '-0.02em',
                      }}>
                        -{promo.discount_percentage}%
                      </div>
                    )}

                    <div style={{ padding: '1.125rem 1.25rem' }}>
                      {/* Title */}
                      <h3 style={{ color: 'var(--text)', fontWeight: 700, margin: '0 0 0.4rem', fontSize: '1rem', paddingRight: promo.discount_percentage ? '4rem' : 0 }}>
                        {promo.title}
                      </h3>

                      {/* Description — what it applies to */}
                      {promo.description && (
                        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                          {promo.description}
                        </p>
                      )}

                      {/* Price comparison — only if both prices exist */}
                      {promo.discounted_price != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                          {promo.original_price != null && (
                            <span style={{ color: 'var(--text-faint)', textDecoration: 'line-through', fontSize: '0.9rem' }}>
                              ${promo.original_price}
                            </span>
                          )}
                          <span style={{ color: 'var(--secondary)', fontWeight: 800, fontSize: '1.35rem' }}>
                            ${promo.discounted_price}
                          </span>
                        </div>
                      )}

                      {/* Footer: valid until + terms */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6, marginBottom: '0.875rem' }}>
                        {promo.valid_until && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '3px 8px' }}>
                            Válido hasta {formatDate(promo.valid_until)}
                          </span>
                        )}
                        {promo.terms_conditions && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                            * {promo.terms_conditions}
                          </span>
                        )}
                      </div>

                      {/* Save / redeem button */}
                      {user ? (
                        <SaveBenefitButton
                          promotionId={promo.id}
                          establishmentId={establishment.id}
                          promoTitle={promo.title}
                          termsConditions={promo.terms_conditions}
                          savedBenefitId={savedMap[promo.id]?.id ?? null}
                          isRedeemed={savedMap[promo.id]?.status === 'redeemed'}
                        />
                      ) : (
                        <Link
                          href={`/auth/register?redirect=/establishment/${establishment.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 8, padding: '0.75rem 1rem',
                            background: 'rgba(108,92,231,0.12)',
                            border: '1px solid rgba(108,92,231,0.25)',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                              Guardá este beneficio
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: 1 }}>
                              Registrate gratis como estudiante internacional
                            </div>
                          </div>
                          <span style={{ flexShrink: 0, background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.35rem 0.875rem', fontSize: '0.78rem', fontWeight: 700 }}>
                            Unirme →
                          </span>
                        </Link>
                      )}
                    </div>
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
      </div>
    </>
  )
}
