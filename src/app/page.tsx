import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import Card from '@/components/ui/Card'

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

export const revalidate = 300

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
      .limit(8),
  ])

  const places = (recent ?? []).map((e: {
    id: string; name: string; category: string; image_url: string | null;
    price_range: string | null;
    promotions: { discount_percentage: number | null; is_active: boolean }[]
  }) => {
    const activePromo = e.promotions?.find((p) => p.is_active)
    return {
      id: e.id,
      name: e.name,
      category: e.category,
      image_url: e.image_url,
      price_range: e.price_range,
      discountPercentage: activePromo?.discount_percentage ?? null,
    }
  })

  const totalEstabs = estabCount ?? 0

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="container landing-hero-content slide-up">
          <p className="landing-eyebrow">Para estudiantes internacionales en Buenos Aires</p>
          <h1 className="landing-headline">
            Tu carnet estudiantil<br />
            <span className="gradient-text">vale más de lo que pensás.</span>
          </h1>
          <p className="landing-subhead">
            Descubrí restaurantes, bares, cafeterías y más con descuentos exclusivos.<br />
            Una sola app. Todos los beneficios.
          </p>
          <div className="landing-hero-ctas">
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Crear cuenta gratis
            </Link>
            <Link href="/explore" className="btn btn-outline btn-lg">
              Explorar sin registrarse
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="landing-stats">
        <div className="container landing-stats-grid">
          <div className="landing-stat">
            <span className="landing-stat-number">{totalEstabs}+</span>
            <span className="landing-stat-label">Establecimientos</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-number">{Object.keys(CATEGORY_LABELS).length - 1}</span>
            <span className="landing-stat-label">Categorías</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-number">100%</span>
            <span className="landing-stat-label">Gratis para estudiantes</span>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="landing-how">
        <div className="container">
          <h2 className="landing-section-title">¿Cómo funciona?</h2>
          <p className="landing-section-sub">Tres pasos y ya estás ahorrando.</p>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-icon">🎓</div>
              <h3>Registrate</h3>
              <p>Creá tu cuenta con tu email universitario. Es gratis y toma 2 minutos.</p>
            </div>
            <div className="landing-step-arrow">→</div>
            <div className="landing-step">
              <div className="landing-step-icon">🔍</div>
              <h3>Explorá</h3>
              <p>Buscá por categoría, ubicación o descuento. Encontrá el lugar perfecto para hoy.</p>
            </div>
            <div className="landing-step-arrow">→</div>
            <div className="landing-step">
              <div className="landing-step-icon">✅</div>
              <h3>Canjeá</h3>
              <p>Mostrá tu beneficio en el local y disfrutá tu descuento de inmediato.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LUGARES RECIENTES ── */}
      {places.length > 0 && (
        <section className="landing-places">
          <div className="container">
            <div className="landing-places-header">
              <div>
                <h2 className="landing-section-title" style={{ marginBottom: 4 }}>Últimos lugares sumados</h2>
                <p className="landing-section-sub" style={{ marginBottom: 0 }}>La red crece cada semana.</p>
              </div>
              <Link href="/explore" className="btn btn-outline btn-sm">Ver todos →</Link>
            </div>
          </div>
          <div className="landing-places-scroll">
            {places.map((place: { id: string; name: string; category: string; image_url: string | null; price_range: string | null; discountPercentage: number | null }) => (
              <div key={place.id} className="landing-place-item">
                <Card
                  image={place.image_url ?? '/placeholder.jpg'}
                  title={place.name}
                  category={place.category}
                  priceRange={place.price_range}
                  discountPercentage={place.discountPercentage ?? undefined}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA FINAL ── */}
      <section className="landing-cta">
        <div className="landing-cta-bg" aria-hidden />
        <div className="container landing-cta-content">
          <h2 className="landing-cta-title">Empezá a ahorrar hoy.</h2>
          <p className="landing-cta-sub">
            Cientos de estudiantes ya lo usan. Unite sin costo.
          </p>
          <div className="landing-hero-ctas">
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Crear cuenta gratis
            </Link>
            <Link href="/auth/login" className="btn btn-outline btn-lg">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <span className="landing-footer-brand">Global Connect</span>
          <span className="landing-footer-copy">© {new Date().getFullYear()}. Hecho para intercambistas.</span>
        </div>
      </footer>
    </>
  )
}
