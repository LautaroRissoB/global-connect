import Link from 'next/link'
import { Globe, MapPin, Tag, GraduationCap, ArrowRight } from 'lucide-react'
import Navbar from '@/components/ui/Navbar'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

async function getFeatured() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select(`
      id, name, category, city, country, image_url, price_range, plan,
      promotions ( discounted_price, original_price, discount_percentage, is_active )
    `)
    .eq('is_active', true)
    .order('plan', { ascending: false })   // pro first
    .limit(6)

  return data ?? []
}

export default async function HomePage() {
  const featured = await getFeatured()

  return (
    <>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero" style={{ paddingBottom: '3.5rem' }}>
        <p className="fade-in" style={{
          color: 'var(--primary-light)', fontWeight: 600,
          marginBottom: '1rem', fontSize: '0.875rem',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Para estudiantes de intercambio
        </p>
        <h1 className="hero-title slide-up-1">
          Explorá Buenos Aires<br />
          <span className="gradient-text">con descuentos</span>
        </h1>
        <p className="hero-subtitle slide-up-2" style={{ maxWidth: 480 }}>
          Restaurantes, bares, cafeterías y más — con ofertas exclusivas
          para estudiantes universitarios. Mostrá tu carnet y ahorrá.
        </p>
        <div className="slide-up-3" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/explore" className="btn btn-primary" style={{ padding: '0.7rem 1.75rem', fontSize: '0.95rem' }}>
            Explorar lugares <ArrowRight size={16} />
          </Link>
          <Link href="/auth/register" className="btn btn-outline" style={{ padding: '0.7rem 1.75rem', fontSize: '0.95rem' }}>
            Registrarse gratis
          </Link>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--card-border)',
        borderBottom: '1px solid var(--card-border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          textAlign: 'center', padding: '1.5rem 1rem',
        }}>
          {[
            { icon: MapPin,         label: 'Ciudad',         value: 'Buenos Aires' },
            { icon: Tag,            label: 'Siempre gratis', value: 'Para estudiantes' },
            { icon: GraduationCap,  label: 'Universidades',  value: 'Todas las de BsAs' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ padding: '0.5rem' }}>
              <Icon size={20} style={{ color: 'var(--primary-light)', margin: '0 auto 0.35rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
          ¿Cómo funciona?
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Tres pasos para empezar a ahorrar.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {[
            { step: '01', title: 'Registrate',   desc: 'Creá tu cuenta con tu email y datos universitarios.' },
            { step: '02', title: 'Explorá',       desc: 'Buscá por categoría, precio o con descuento activo.' },
            { step: '03', title: 'Mostrá carnet', desc: 'Presentá tu carnet universitario y accedé al descuento.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--card-border)', padding: '1.75rem 1.25rem',
            }}>
              <div style={{
                display: 'inline-block', fontFamily: 'var(--font-heading)',
                fontSize: '2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: '0.75rem',
              }}>
                {step}
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: 6 }}>{title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured establishments ───────────────────────── */}
      {featured.length > 0 && (
        <section className="feed-section" style={{ paddingTop: 0 }}>
          <div className="feed-header">
            <h2 className="feed-title">Lugares destacados</h2>
            <Link href="/explore" style={{ fontSize: '0.85rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid-establishments">
            {featured.map((e) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const promos = (e as any).promotions ?? []
              const promo = promos.find((p: { is_active: boolean }) => p.is_active) ?? promos[0]
              return (
                <Link key={e.id} href={`/establishment/${e.id}`} style={{ textDecoration: 'none' }}>
                  <Card
                    image={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/300`}
                    title={e.name}
                    category={e.category}
                    location={`${e.city}, ${e.country}`}
                    priceRange={e.price_range}
                    originalPrice={promo?.original_price ?? undefined}
                    discountedPrice={promo?.discounted_price ?? undefined}
                    discountPercentage={promo?.discount_percentage ?? undefined}
                    featured={(e as any).plan === 'pro'}
                  />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── CTA bottom ───────────────────────────────────── */}
      <section style={{
        margin: '3rem auto 5rem', maxWidth: 600,
        textAlign: 'center', padding: '0 1.5rem',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.08))',
          border: '1px solid rgba(108,92,231,0.25)',
          borderRadius: 'var(--radius-lg)', padding: '2.5rem 2rem',
        }}>
          <Globe size={32} style={{ color: 'var(--primary-light)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.6rem' }}>
            ¿Sos estudiante en Buenos Aires?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Registrate gratis y accedé a todos los descuentos exclusivos.
          </p>
          <Link href="/auth/register" className="btn btn-primary" style={{ padding: '0.7rem 2rem' }}>
            Crear cuenta gratis
          </Link>
        </div>
      </section>
    </>
  )
}
