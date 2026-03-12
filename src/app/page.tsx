import Link from 'next/link'
import { Globe, MapPin, Tag, GraduationCap, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
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
    .order('plan', { ascending: false })
    .limit(6)

  return data ?? []
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const [featured, t] = await Promise.all([getFeatured(), getTranslations('home')])

  const steps = [
    { num: t('step1_num'), title: t('step1_title'), desc: t('step1_desc') },
    { num: t('step2_num'), title: t('step2_title'), desc: t('step2_desc') },
    { num: t('step3_num'), title: t('step3_title'), desc: t('step3_desc') },
  ]

  const stats = [
    { icon: MapPin,        value: t('stats_city_value'), label: t('stats_city_label') },
    { icon: Tag,           value: t('stats_free_value'), label: t('stats_free_label') },
    { icon: GraduationCap, value: t('stats_uni_value'),  label: t('stats_uni_label') },
  ]

  return (
    <>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero" style={{ paddingBottom: '3.5rem' }}>
        <p className="fade-in" style={{
          color: 'var(--primary-light)', fontWeight: 600, marginBottom: '1rem',
          fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {t('badge')}
        </p>
        <h1 className="hero-title slide-up-1">
          {t('title_line1')}<br />
          <span className="gradient-text">{t('title_line2')}</span>
        </h1>
        <p className="hero-subtitle slide-up-2" style={{ maxWidth: 480 }}>
          {t('subtitle')}
        </p>
        <div className="slide-up-3" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/explore" className="btn btn-primary" style={{ padding: '0.7rem 1.75rem', fontSize: '0.95rem' }}>
            {t('cta_explore')} <ArrowRight size={16} />
          </Link>
          {isLoggedIn ? (
            <Link href="/compare" className="btn btn-outline" style={{ padding: '0.7rem 1.75rem', fontSize: '0.95rem' }}>
              ⚖ Comparar lugares
            </Link>
          ) : (
            <Link href="/auth/register" className="btn btn-outline" style={{ padding: '0.7rem 1.75rem', fontSize: '0.95rem' }}>
              {t('cta_register')}
            </Link>
          )}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', padding: '1.5rem 1rem' }}>
          {stats.map(({ icon: Icon, value, label }) => (
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
          {t('how_title')}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          {t('how_subtitle')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {steps.map(({ num, title, desc }) => (
            <div key={num} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--card-border)', padding: '1.75rem 1.25rem' }}>
              <div style={{ display: 'inline-block', fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.75rem' }}>
                {num}
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: 6 }}>{title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="feed-section" style={{ paddingTop: 0 }}>
          <div className="feed-header">
            <h2 className="feed-title">{t('featured_title')}</h2>
            <Link href="/explore" style={{ fontSize: '0.85rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('see_all')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid-establishments">
            {featured.map((e) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const promos = (e as any).promotions ?? []
              const promo  = promos.find((p: { is_active: boolean }) => p.is_active) ?? promos[0]
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    featured={(e as any).plan === 'pro'}
                  />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── CTA bottom ───────────────────────────────────── */}
      <section style={{ margin: '3rem auto 5rem', maxWidth: 600, textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.08))', border: '1px solid rgba(108,92,231,0.25)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 2rem' }}>
          <Globe size={32} style={{ color: 'var(--primary-light)', margin: '0 auto 1rem' }} />
          {isLoggedIn ? (
            <>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.6rem' }}>
                ¿Querés comparar opciones?
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Poné hasta 3 lugares lado a lado y encontrá la mejor oferta para vos.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/compare" className="btn btn-primary" style={{ padding: '0.7rem 2rem' }}>
                  ⚖ Comparar lugares
                </Link>
                <Link href="/explore" className="btn btn-outline" style={{ padding: '0.7rem 2rem' }}>
                  Explorar <ArrowRight size={15} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.6rem' }}>
                {t('cta_title')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('cta_subtitle')}
              </p>
              <Link href="/auth/register" className="btn btn-primary" style={{ padding: '0.7rem 2rem' }}>
                {t('cta_btn')}
              </Link>
            </>
          )}
        </div>
      </section>
    </>
  )
}
