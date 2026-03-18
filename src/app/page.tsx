import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const revalidate = 300

const TICKER_ITEMS = [
  { flag: '🇧🇷', name: 'Ana', action: 'canjeó -30% en La Biela', time: 'hace 1h' },
  { flag: '🇮🇹', name: 'Marco', action: 'guardó Irish Pub Palermo', time: 'hace 2h' },
  { flag: '🇫🇷', name: 'Claire', action: 'canjeó -25% en Café Tortoni', time: 'hace 3h' },
  { flag: '🇩🇪', name: 'Felix', action: 'descubrió 4 bares nuevos', time: 'hace 4h' },
  { flag: '🇨🇴', name: 'Sofía', action: 'canjeó -20% en Doppelganger', time: 'hace 5h' },
  { flag: '🇲🇽', name: 'Diego', action: 'guardó Club Niceto', time: 'hace 6h' },
  { flag: '🇯🇵', name: 'Yuki', action: 'canjeó descuento en SushiClub', time: 'hace 7h' },
  { flag: '🇺🇸', name: 'Emma', action: 'exploró 6 restaurantes nuevos', time: 'hace 8h' },
  { flag: '🇨🇱', name: 'Valentina', action: 'canjeó -35% en El Federal', time: 'hace 9h' },
  { flag: '🇰🇷', name: 'Jimin', action: 'guardó Bar El Taller', time: 'hace 10h' },
]

const COUNTRIES = [
  { flag: '🇧🇷', name: 'Brasil' },
  { flag: '🇨🇴', name: 'Colombia' },
  { flag: '🇫🇷', name: 'Francia' },
  { flag: '🇮🇹', name: 'Italia' },
  { flag: '🇩🇪', name: 'Alemania' },
  { flag: '🇺🇸', name: 'EE.UU.' },
  { flag: '🇲🇽', name: 'México' },
  { flag: '🇨🇱', name: 'Chile' },
  { flag: '🇯🇵', name: 'Japón' },
  { flag: '🇰🇷', name: 'Corea' },
  { flag: '🇵🇪', name: 'Perú' },
  { flag: '🇪🇸', name: 'España' },
]

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
      .select('id, name, category, image_url, promotions(discount_percentage, is_active)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  type Place = { id: string; name: string; category: string; image_url: string | null; discount: number | null }

  const places: Place[] = (recent ?? []).map((e: {
    id: string; name: string; category: string; image_url: string | null;
    promotions: { discount_percentage: number | null; is_active: boolean }[]
  }) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    image_url: e.image_url,
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
          <Link href="/auth/register" className="btn btn-primary btn-sm">Registrarse gratis</Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-glow" aria-hidden />
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <span className="lp-hero-dot" />
            {totalEstabs} establecimientos activos en Buenos Aires
          </div>
          <h1 className="lp-hero-h1">
            Mientras no estás<br />
            registrado, te estás<br />
            <span className="lp-hero-accent">perdiendo de esto.</span>
          </h1>
          <p className="lp-hero-sub">
            Descuentos exclusivos para intercambistas. Solo para los que están adentro.
          </p>
          <Link href="/auth/register" className="btn btn-primary lp-hero-cta">
            Crear cuenta gratis — 2 minutos
          </Link>
          <p className="lp-hero-fine">Sin tarjeta de crédito. Sin compromisos.</p>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="lp-ticker-wrap" aria-hidden>
        <div className="lp-ticker-track">
          {tickerDouble.map((item, i) => (
            <span key={i} className="lp-ticker-item">
              <span className="lp-ticker-flag">{item.flag}</span>
              <strong>{item.name}</strong>
              {' '}{item.action}
              <span className="lp-ticker-time">{item.time}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── TEASER BLOQUEADO ── */}
      <section className="lp-teaser">
        <div className="lp-section-header">
          <h2 className="lp-section-title">
            Descuentos disponibles <span className="lp-section-title-accent">esta semana</span>
          </h2>
          <p className="lp-section-sub">Solo visible para miembros registrados.</p>
        </div>

        <div className="lp-teaser-grid">
          {places.map((place) => (
            <div key={place.id} className="lp-teaser-card">
              <div className="lp-teaser-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={place.image_url ?? '/placeholder.jpg'}
                  alt={place.name}
                  className="lp-teaser-img"
                  loading="lazy"
                />
                <div className="lp-teaser-overlay">
                  <span className="lp-lock-icon">🔒</span>
                  <span className="lp-lock-label">Registrate para ver</span>
                </div>
              </div>
              <div className="lp-teaser-body">
                <span className="lp-teaser-name">{place.name}</span>
                <div className="lp-teaser-discount-blur">
                  <span className="lp-teaser-blur-text">
                    {place.discount ? `-${place.discount}% OFF` : 'Descuento exclusivo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {/* Placeholder si hay menos de 4 */}
          {Array.from({ length: Math.max(0, 4 - places.length) }).map((_, i) => (
            <div key={`ph-${i}`} className="lp-teaser-card lp-teaser-card-ph">
              <div className="lp-teaser-img-wrap lp-teaser-img-ph" />
              <div className="lp-teaser-body">
                <span className="lp-teaser-name lp-ph-line" />
                <div className="lp-teaser-discount-blur"><span className="lp-teaser-blur-text">Descuento exclusivo</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-teaser-cta-row">
          <Link href="/auth/register" className="btn btn-secondary lp-teaser-cta">
            Ver todos los descuentos →
          </Link>
          <p className="lp-teaser-cta-hint">+{totalEstabs} lugares disponibles</p>
        </div>
      </section>

      {/* ── COMUNIDAD ── */}
      <section className="lp-community">
        <div className="lp-community-inner">
          <h2 className="lp-section-title">Una comunidad de todo el mundo,<br />en Buenos Aires.</h2>
          <p className="lp-section-sub">Estudiantes de intercambio de {COUNTRIES.length}+ países ya están usando Global Connect.</p>
          <div className="lp-flags">
            {COUNTRIES.map((c) => (
              <div key={c.name} className="lp-flag-item" title={c.name}>
                <span className="lp-flag">{c.flag}</span>
                <span className="lp-flag-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="lp-how">
        <h2 className="lp-section-title">Tres pasos.</h2>
        <p className="lp-section-sub">Después de registrarte, empezás a ahorrar de inmediato.</p>
        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-num">01</div>
            <h3 className="lp-step-title">Registrate gratis</h3>
            <p className="lp-step-body">Con tu email universitario o cualquier cuenta. Toma menos de 2 minutos.</p>
          </div>
          <div className="lp-step-sep" />
          <div className="lp-step">
            <div className="lp-step-num">02</div>
            <h3 className="lp-step-title">Explorá los descuentos</h3>
            <p className="lp-step-body">Filtrá por categoría, precio o porcentaje de descuento. Encontrá tu lugar.</p>
          </div>
          <div className="lp-step-sep" />
          <div className="lp-step">
            <div className="lp-step-num">03</div>
            <h3 className="lp-step-title">Mostrá y ahorrá</h3>
            <p className="lp-step-body">Presentá tu beneficio en el local. Listo. Sin vouchers, sin complicaciones.</p>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <div className="lp-final-glow" aria-hidden />
        <div className="lp-final-inner">
          <p className="lp-final-eyebrow">¿Cuántos descuentos más vas a dejar pasar?</p>
          <h2 className="lp-final-title">Entrá. Es gratis.</h2>
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
