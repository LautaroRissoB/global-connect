import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe, MapPin } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const revalidate = 300

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', club: 'Discoteca',
  cafe: 'Cafetería', cultural: 'Cultura', theater: 'Teatro',
  sports: 'Deportes', other: 'Otro',
}

const RECEIPT_ITEMS = [
  { name: 'Hamburguesa + papas', price: 4200 },
  { name: '2 cervezas artesanales', price: 3600 },
  { name: 'Postre compartido', price: 2800 },
]
const DISCOUNT = 0.30
const subtotal = RECEIPT_ITEMS.reduce((s, i) => s + i.price, 0)
const saving = Math.round(subtotal * DISCOUNT)
const total = subtotal - saving

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/explore')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceClient() as any

  const [{ count: estabCount }, { data: recent }] = await Promise.all([
    serviceClient
      .from('establishments')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    serviceClient
      .from('establishments')
      .select('id, name, category, image_url, price_range, promotions(discount_percentage, is_active)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  type Place = { id: string; name: string; category: string; image_url: string | null; price_range: string | null; discount: number | null }
  const places: Place[] = (recent ?? []).map((e: {
    id: string; name: string; category: string; image_url: string | null;
    price_range: string | null;
    promotions: { discount_percentage: number | null; is_active: boolean }[]
  }) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    image_url: e.image_url,
    price_range: e.price_range,
    discount: e.promotions?.find((p) => p.is_active)?.discount_percentage ?? null,
  }))

  const totalEstabs = estabCount ?? 0

  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <header className="lp-nav">
        <Link href="/" className="lp-nav-logo">
          <Globe size={18} />
          <span>Global Connect</span>
        </Link>
        <div className="lp-nav-actions">
          <Link href="/auth/login" className="lp-nav-login">Iniciar sesión</Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">Registrarse — es gratis</Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-glow" aria-hidden />

        <div className="lp-hero-layout">
          {/* Copy */}
          <div className="lp-hero-copy">
            <p className="lp-hero-eyebrow">Buenos Aires</p>
            <h1 className="lp-hero-h1">
              Descubrí Buenos Aires<br />
              como si fueras<br />
              <span className="lp-hero-accent">de acá.</span>
            </h1>
            <p className="lp-hero-sub">
              Descuentos exclusivos en restaurantes, bares y cafeterías para estudiantes de intercambio.
              {totalEstabs > 0 && <> +{totalEstabs} lugares disponibles.</>} Gratis, sin tarjeta, para siempre.
            </p>
            <div className="lp-hero-cta-row">
              <Link href="/auth/register" className="btn btn-primary lp-hero-cta">
                Crear cuenta gratis
              </Link>
              <span className="lp-hero-fine">Sin tarjeta · Para siempre gratis</span>
            </div>
          </div>

          {/* Receipt card */}
          <div className="lp-receipt-wrap">
            <div className="lp-receipt">
              <div className="lp-receipt-header">
                <div className="lp-receipt-icon">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="lp-receipt-title">Bar / Restaurante</p>
                  <p className="lp-receipt-subtitle">Esta noche en Buenos Aires</p>
                </div>
              </div>

              <div className="lp-receipt-items">
                {RECEIPT_ITEMS.map((item) => (
                  <div key={item.name} className="lp-receipt-row">
                    <span className="lp-receipt-name">{item.name}</span>
                    <span className="lp-receipt-price">${item.price.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>

              <div className="lp-receipt-divider" />

              <div className="lp-receipt-row lp-receipt-sub">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="lp-receipt-row lp-receipt-discount-row">
                <span>Descuento estudiante (-{DISCOUNT * 100}%)</span>
                <span className="lp-receipt-saving">-${saving.toLocaleString('es-AR')}</span>
              </div>

              <div className="lp-receipt-divider lp-receipt-divider-bold" />

              <div className="lp-receipt-row lp-receipt-total">
                <span>Total</span>
                <span>${total.toLocaleString('es-AR')}</span>
              </div>

              <div className="lp-receipt-highlight">
                <span className="lp-receipt-hl-label">Ahorraste</span>
                <span className="lp-receipt-hl-amount">${saving.toLocaleString('es-AR')}</span>
              </div>
              <div className="lp-receipt-app-cost">
                Costo de Global Connect: <strong>$0</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CUPONES ── */}
      {places.length > 0 && (
        <section className="lp-coupons">
          <div className="lp-coupons-inner">
            <div className="lp-coupons-header">
              <div>
                <p className="lp-section-eyebrow">Disponible ahora</p>
                <h2 className="lp-section-title">Dónde ir esta noche</h2>
              </div>
              <Link href="/auth/register" className="btn btn-outline btn-sm">
                Ver todos →
              </Link>
            </div>
            <div className="lp-coupons-list">
              {places.map((place) => (
                <div key={place.id} className="lp-coupon">
                  <div className="lp-coupon-left">
                    <div className="lp-coupon-thumb-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={place.image_url ?? '/placeholder.jpg'}
                        alt={place.name}
                        className="lp-coupon-thumb"
                        loading="lazy"
                      />
                    </div>
                    <div className="lp-coupon-info">
                      <span className="lp-coupon-name">{place.name}</span>
                      <span className="lp-coupon-cat">
                        {CATEGORY_LABELS[place.category] ?? place.category}
                        {place.price_range && <> · {place.price_range}</>}
                      </span>
                    </div>
                  </div>

                  <div className="lp-coupon-tear" aria-hidden>
                    <span className="lp-coupon-notch lp-coupon-notch-top" />
                    <span className="lp-coupon-notch lp-coupon-notch-bottom" />
                  </div>

                  <div className="lp-coupon-right">
                    {place.discount ? (
                      <>
                        <span className="lp-coupon-pct">-{place.discount}%</span>
                        <span className="lp-coupon-off">OFF</span>
                      </>
                    ) : (
                      <>
                        <span className="lp-coupon-pct lp-coupon-pct-sm">Beneficio</span>
                        <span className="lp-coupon-off">exclusivo</span>
                      </>
                    )}
                    <Link href="/auth/register" className="lp-coupon-cta">Usar →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <div className="lp-final-glow" aria-hidden />
        <div className="lp-final-inner">
          <p className="lp-final-eyebrow">Para estudiantes de intercambio en Buenos Aires</p>
          <h2 className="lp-final-title">
            <span>Explorá.</span>
            <span>Ahorrá.</span>
            <span className="lp-final-title-dim">Repetí.</span>
          </h2>
          <Link href="/auth/register" className="btn btn-primary lp-final-btn">
            Crear cuenta gratis
          </Link>
          <Link href="/auth/login" className="lp-final-login">Ya tengo cuenta →</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <span className="lp-footer-brand">Global Connect</span>
        <span className="lp-footer-copy">© {new Date().getFullYear()} · Hecho para intercambistas.</span>
      </footer>

    </div>
  )
}
