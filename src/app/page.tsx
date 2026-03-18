import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const revalidate = 300

const TICKER_ITEMS = [
  { flag: '🇧🇷', name: 'Ana', action: 'canjeó -30% en La Biela', time: '1h' },
  { flag: '🇮🇹', name: 'Marco', action: 'usó descuento en Irish Pub', time: '2h' },
  { flag: '🇫🇷', name: 'Claire', action: 'canjeó -25% en Café Tortoni', time: '3h' },
  { flag: '🇩🇪', name: 'Felix', action: 'guardó Doppelganger Bar', time: '4h' },
  { flag: '🇨🇴', name: 'Sofía', action: 'canjeó -20% en Club Niceto', time: '5h' },
  { flag: '🇲🇽', name: 'Diego', action: 'usó descuento en SushiClub', time: '6h' },
  { flag: '🇺🇸', name: 'Emma', action: 'canjeó -35% en El Federal', time: '7h' },
  { flag: '🇨🇱', name: 'Valentina', action: 'guardó Bar El Taller', time: '8h' },
]

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
  const tickerDouble = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <header className="lp-nav">
        <Link href="/" className="lp-nav-logo">
          <Globe size={20} />
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
          {/* Left: copy */}
          <div className="lp-hero-copy">
            <div className="lp-hero-pills">
              <span className="lp-pill lp-pill-green">✓ Sin tarjeta de crédito</span>
              <span className="lp-pill">✓ 100% gratis</span>
              <span className="lp-pill">✓ Solo para intercambistas</span>
            </div>
            <h1 className="lp-hero-h1">
              Descuentos en restaurantes, bares y cafeterías.<br />
              <span className="lp-hero-accent">Gratis. Para vos.</span>
            </h1>
            <p className="lp-hero-sub">
              {totalEstabs > 0 ? `+${totalEstabs} establecimientos en Buenos Aires` : 'Establecimientos en Buenos Aires'} con beneficios exclusivos para estudiantes de intercambio. Sin costo, sin trámites, sin excusas.
            </p>
            <div className="lp-hero-cta-row">
              <Link href="/auth/register" className="btn btn-primary lp-hero-cta">
                Crear cuenta gratis
              </Link>
              <span className="lp-hero-fine">2 minutos · Sin tarjeta · Para siempre gratis</span>
            </div>
          </div>

          {/* Right: receipt card */}
          <div className="lp-receipt-wrap">
            <div className="lp-receipt">
              <div className="lp-receipt-header">
                <span className="lp-receipt-icon">🧾</span>
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
            <p className="lp-receipt-note">* Ejemplo con 30% de descuento real disponible en varios establecimientos</p>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="lp-ticker-wrap" aria-label="Actividad reciente">
        <div className="lp-ticker-track">
          {tickerDouble.map((item, i) => (
            <span key={i} className="lp-ticker-item">
              <span className="lp-ticker-flag">{item.flag}</span>
              <strong>{item.name}</strong>
              {' '}{item.action}
              <span className="lp-ticker-time">hace {item.time}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── ESTABLECIMIENTOS ── */}
      {places.length > 0 && (
        <section className="lp-places">
          <div className="lp-section-header lp-places-header-row">
            <div>
              <h2 className="lp-section-title">Algunos de los lugares</h2>
              <p className="lp-section-sub">Nuevos establecimientos se suman cada semana.</p>
            </div>
            <Link href="/auth/register" className="btn btn-outline btn-sm lp-places-cta">
              Ver todos los descuentos →
            </Link>
          </div>
          <div className="lp-places-grid">
            {places.map((place) => (
              <div key={place.id} className="lp-place-card">
                <div className="lp-place-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={place.image_url ?? '/placeholder.jpg'}
                    alt={place.name}
                    className="lp-place-img"
                    loading="lazy"
                  />
                  {place.discount && (
                    <span className="lp-place-discount-badge">-{place.discount}%</span>
                  )}
                </div>
                <div className="lp-place-body">
                  <span className="lp-place-name">{place.name}</span>
                  {place.price_range && <span className="lp-place-price">{place.price_range}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CÓMO FUNCIONA ── */}
      <section className="lp-how">
        <h2 className="lp-section-title">Así de simple.</h2>
        <div className="lp-steps">
          <div className="lp-step">
            <span className="lp-step-num">01</span>
            <div>
              <h3 className="lp-step-title">Creá tu cuenta gratis</h3>
              <p className="lp-step-body">Con cualquier email. Sin tarjeta. En 2 minutos.</p>
            </div>
          </div>
          <div className="lp-step-sep" />
          <div className="lp-step">
            <span className="lp-step-num">02</span>
            <div>
              <h3 className="lp-step-title">Encontrá tu lugar</h3>
              <p className="lp-step-body">Filtrá por categoría o descuento. Elegí dónde ir esta noche.</p>
            </div>
          </div>
          <div className="lp-step-sep" />
          <div className="lp-step">
            <span className="lp-step-num">03</span>
            <div>
              <h3 className="lp-step-title">Mostrá y listo</h3>
              <p className="lp-step-body">Abrí la app en el local, mostrá el beneficio, pagás menos. Nada más.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <div className="lp-final-glow" aria-hidden />
        <div className="lp-final-inner">
          <p className="lp-final-eyebrow">Para estudiantes de intercambio en Buenos Aires</p>
          <h2 className="lp-final-title">Gratis.<br />Sin tarjeta.<br />Ahora.</h2>
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
