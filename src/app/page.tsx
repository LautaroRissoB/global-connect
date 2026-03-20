import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe, MapPin, Coffee, Compass, Users } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const revalidate = 300

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', club: 'Discoteca',
  cafe: 'Cafetería', cultural: 'Cultura', theater: 'Teatro',
  sports: 'Deportes', other: 'Otro',
}

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
    <div className="lp-root" style={{ background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash-move {
          to { stroke-dashoffset: -100; }
        }
        @keyframes node-pulse-anim {
          0% { stroke-width: 0; stroke: var(--primary); opacity: 1; }
          100% { stroke-width: 15; stroke: transparent; opacity: 0; }
        }
        @keyframes float-icon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes pan-map {
          0% { transform: scale(1.05) translate(0, 0); }
          50% { transform: scale(1.05) translate(-1%, 1%); }
          100% { transform: scale(1.05) translate(0, 0); }
        }
        .flight-path-1 { stroke-dashoffset: 0; animation: dash-move 8s linear infinite; }
        .flight-path-2 { stroke-dashoffset: 0; animation: dash-move 12s linear infinite reverse; }
        .flight-path-3 { stroke-dashoffset: 0; animation: dash-move 10s linear infinite; }
        .node-layer circle { transform-origin: center; animation: node-pulse-anim 3s infinite ease-out; }
        .floating-element { animation: float-icon 6s ease-in-out infinite; backdrop-filter: blur(10px); }
        .gamified-bg { animation: pan-map 20s ease-in-out infinite; }
        .feature-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.05); }

        /* ── Landing page responsive ── */

        /* Nav */
        .lp-page-nav { display: flex; align-items: center; justify-content: space-between; }
        .lp-page-nav-links { display: flex; align-items: center; gap: 2rem; }
        .lp-page-nav-login { font-size: 1rem; font-weight: 600; color: var(--text-muted); text-decoration: none; }

        /* Hero */
        .lp-page-hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
        .lp-page-hero-inner { position: relative; z-index: 2; max-width: 900px; text-align: center; }
        .lp-page-hero-btns { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; align-items: center; }

        /* Features */
        .lp-page-features { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; }

        /* Places */
        .lp-page-places { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }

        /* Footer */
        .lp-page-footer { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }

        /* ── Mobile breakpoints ── */
        @media (max-width: 600px) {
          /* Nav: hide "Ingresar" link, compact button */
          .lp-page-nav-login { display: none; }
          .lp-page-nav { padding: 0.8rem 4%; }
          .lp-page-nav-cta { padding: 0.55rem 1.2rem !important; font-size: 0.88rem !important; }

          /* Hero: reduce top padding, smaller text */
          .lp-page-hero { padding: 5rem 4% 3rem !important; min-height: 90vh; }
          .lp-page-hero-inner { margin-top: 2rem !important; }

          /* CTA buttons: stack vertically */
          .lp-page-hero-btns { flex-direction: column; gap: 0.75rem; width: 100%; }
          .lp-page-hero-btns a, .lp-page-hero-btns button {
            width: 100%;
            max-width: 320px;
            justify-content: center;
            text-align: center;
          }

          /* Features: single column */
          .lp-page-features { grid-template-columns: 1fr; gap: 1rem; }
          .lp-page-feature-card { padding: 2rem 1.5rem !important; }

          /* Places: single column */
          .lp-page-places { grid-template-columns: 1fr; gap: 1.25rem; }

          /* Section padding */
          .lp-page-section { padding: 3.5rem 4% !important; }

          /* CTA section */
          .lp-page-cta-section { padding: 4rem 4% !important; }
          .lp-page-cta-btn { padding: 1rem 2.5rem !important; font-size: 1rem !important; }

          /* Footer */
          .lp-page-footer { flex-direction: column; gap: 0.5rem; padding: 2rem 4% !important; text-align: center; }
        }

        @media (min-width: 601px) and (max-width: 900px) {
          .lp-page-places { grid-template-columns: repeat(2, 1fr); }
          .lp-page-features { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
          .lp-page-hero { padding: 5.5rem 5% 3.5rem !important; }
        }
      `}} />

      {/* ── NAV ── */}
      <header className="lp-nav glass-card lp-page-nav" style={{
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        padding: '1rem 5%',
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text)' }}>
          <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Globe size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.4rem', whiteSpace: 'nowrap' }}>
            Global<span style={{ fontWeight: 300, color: 'var(--primary)' }}>Connect</span>
          </span>
        </Link>
        <div className="lp-page-nav-links">
          <Link href="/auth/login" className="lp-page-nav-login">Ingresar</Link>
          <Link href="/auth/register" className="btn lp-page-nav-cta" style={{
            background: 'var(--secondary)', color: '#fff', padding: '0.7rem 1.8rem',
            borderRadius: 'var(--radius-full)', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(246, 180, 14, 0.3)', transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            Comenzar
          </Link>
        </div>
      </header>

      {/* ── HERO CULTURAL & AVENTURA ── */}
      <section className="lp-page-hero" style={{
        padding: '6rem 5% 4rem',
      }}>
        {/* Dynamic Gamified Map Background */}
        <div className="gamified-bg" style={{ position: 'absolute', top: '-50px', left: '-50px', right: '-50px', bottom: '-50px', zIndex: 0, overflow: 'hidden' }}>
          {/* Grid Layer */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'radial-gradient(circle at center, var(--primary) 1.5px, transparent 1.5px)',
            backgroundSize: '48px 48px',
            opacity: 0.08,
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)'
          }} />

          {/* Connection SVGs */}
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.6 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="lineGradRev" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Curved Routes */}
            <path d="M -100,500 Q 300,200 600,300 T 1200,100" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeDasharray="16 24" className="flight-path-1" />
            <path d="M 100,900 Q 500,400 700,600 T 1100,300" fill="none" stroke="url(#lineGradRev)" strokeWidth="6" strokeDasharray="24 32" className="flight-path-2" />
            <path d="M -100,100 Q 400,200 600,700 T 1000,1100" fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeDasharray="12 20" className="flight-path-3" />

            {/* Glowing Nodes Matrix */}
            <g className="node-layer">
              <circle cx="300" cy="400" r="8" fill="var(--primary)" style={{ animationDelay: '0s' }} />
              <circle cx="600" cy="300" r="14" fill="var(--secondary)" style={{ animationDelay: '1.2s' }} />
              <circle cx="700" cy="600" r="10" fill="var(--accent)" style={{ animationDelay: '0.6s' }} />
              <circle cx="450" cy="750" r="12" fill="var(--primary)" style={{ animationDelay: '2.1s' }} />
              <circle cx="850" cy="200" r="6" fill="var(--secondary)" style={{ animationDelay: '1.8s' }} />
              <circle cx="150" cy="650" r="10" fill="var(--primary)" style={{ animationDelay: '0.9s' }} />
            </g>
          </svg>

          {/* Floating UI Elements */}
          <div className="floating-element" style={{ position: 'absolute', top: '25%', left: '15%', padding: '0.8rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '50%', color: 'var(--primary)', boxShadow: '0 10px 25px rgba(43, 136, 216, 0.2)' }}>
            <Globe size={24} />
          </div>
          <div className="floating-element" style={{ position: 'absolute', top: '65%', right: '18%', padding: '1rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '50%', color: 'var(--secondary)', boxShadow: '0 10px 25px rgba(245, 166, 35, 0.2)', animationDelay: '2s' }}>
            <MapPin size={28} />
          </div>
          <div className="floating-element" style={{ position: 'absolute', bottom: '20%', left: '35%', padding: '0.6rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '50%', color: 'var(--accent)', boxShadow: '0 10px 25px rgba(224, 93, 67, 0.15)', animationDelay: '4s' }}>
             <Compass size={20} />
          </div>
        </div>

        <div className="lp-page-hero-inner" style={{ marginTop: '4rem' }}>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', padding: '0.6rem 1.2rem', background: 'rgba(43, 136, 216, 0.1)', borderRadius: 'var(--radius-full)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', border: '1px solid rgba(43, 136, 216, 0.2)' }}>
            <MapPin size={16} /> Intercambio & Cultura Auténtica
          </div>

          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: '2rem', color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Viví la conectividad <br />
            <span style={{
              background: 'linear-gradient(135deg, var(--secondary), var(--accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              position: 'relative'
            }}>
              del mundo real.
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', maxWidth: '750px', margin: '0 auto 3rem', lineHeight: 1.6, color: 'var(--text-muted)', fontWeight: 400 }}>
            Conectá con locales y estudiantes de todos lados, descubrí joyas ocultas de la ciudad, compartí momentos inolvidables y accedé a beneficios exclusivos pensados para vos. La aventura es global, la experiencia es local.
          </p>

          <div className="lp-page-hero-btns">
            <Link href="/auth/register" className="btn" style={{
              padding: '1.2rem 3rem', fontSize: '1.1rem', fontWeight: 700,
              borderRadius: 'var(--radius-full)', background: 'var(--primary)', color: '#fff',
              border: 'none', boxShadow: '0 8px 25px rgba(116, 172, 223, 0.4)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none'
            }}>
              Únete a la Comunidad <Users size={20} />
            </Link>
            <Link href="/explore" style={{
              padding: '1.2rem 3rem', fontSize: '1.1rem', fontWeight: 600,
              borderRadius: 'var(--radius-full)', background: 'transparent', color: 'var(--text)',
              border: '2px solid rgba(0,0,0,0.1)', textDecoration: 'none', transition: 'border-color 0.2s'
            }}>
              Explorar Mapa
            </Link>
          </div>
        </div>
      </section>

      {/* ──FEATURES / EL FEELING ARGENTINO ── */}
      <section className="lp-page-section" style={{ padding: '6rem 5%', background: '#fff', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
              Mucho más que turismo.
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
              Sumergite en la cultura de forma real. Menos guías aburridas, más charlas de café y salidas auténticas con nuestra comunidad.
            </p>
          </div>

          <div className="lp-page-features">
            {[
              { icon: <Coffee size={32} color="var(--accent)" />, title: 'Cultura del Encuentro', desc: 'Conocé los mejores puntos para compartir y hacer amigos locales y de todo el mundo.' },
              { icon: <Compass size={32} color="var(--primary)" />, title: 'Rincones Ocultos', desc: 'Alejate de los circuitos típicos. Te mostramos la ciudad como un verdadero local.' },
              { icon: <Users size={32} color="var(--secondary)" />, title: 'Comunidad Exclusiva', desc: 'Accedé a eventos, descuentos y planes armados a tu medida en nuestra red de confianza.' }
            ].map((feat, i) => (
              <div key={i} className="feature-card lp-page-feature-card" style={{
                padding: '3rem 2rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(0,0,0,0.03)', transition: 'transform 0.3s, box-shadow 0.3s',
                textAlign: 'center', cursor: 'pointer'
              }}>
                <div style={{ background: '#fff', width: '80px', height: '80px', margin: '0 auto 1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                  {feat.icon}
                </div>
                <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>{feat.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESTABLECIMIENTOS & LUGARES AUTÉNTICOS ── */}
      {places.length > 0 && (
        <section className="lp-page-section" style={{ padding: '6rem 5%', background: 'var(--bg-tertiary)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lugares Curados</span>
                <h2 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.5rem)', fontWeight: 800, marginTop: '0.5rem' }}>Elegidos para vos</h2>
              </div>
              <Link href="/explore" style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                Ver todos <MapPin size={18} />
              </Link>
            </div>

            <div className="lp-page-places">
              {places.map((place) => (
                <div key={place.id} style={{
                  background: '#fff', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.05)', transition: 'transform 0.3s, box-shadow 0.3s'
                }} className="card-hover">
                  <div style={{ position: 'relative', height: '200px', background: '#e0e0e0', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={place.image_url ?? '/placeholder.jpg'}
                      alt={place.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                      loading="lazy"
                    />
                    {place.discount && (
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--secondary)', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        -{place.discount}% Beneficio
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{place.name}</h3>
                      {place.price_range && <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>{place.price_range}</span>}
                    </div>
                    <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={14} /> {CATEGORY_LABELS[place.category] ?? place.category}
                    </p>
                    <Link href="/auth/register" style={{
                      display: 'block', width: '100%', textAlign: 'center', padding: '0.8rem',
                      background: 'rgba(116, 172, 223, 0.1)', color: 'var(--primary)',
                      borderRadius: 'var(--radius-md)', fontWeight: 700, textDecoration: 'none',
                      transition: 'background 0.2s'
                    }}>
                      Visitar este lugar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section className="lp-page-cta-section" style={{ padding: '8rem 5%', textAlign: 'center', background: 'linear-gradient(135deg, var(--bg) 0%, #fff 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '0', right: '0', background: 'var(--primary)', height: '200%', width: '100%', opacity: 0.02, transform: 'skewY(-5deg)', zIndex: 0 }}></div>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '2rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Hacé del mundo <br />
            tu propia historia.
          </h2>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-muted)', marginBottom: '3rem' }}>
            Sumate ahora y empezá a vivir la cultura local en primera persona, sin importar dónde estés. Explorá, conectá y disfrutá de una comunidad que trasciende fronteras.
          </p>
          <Link href="/auth/register" className="btn lp-page-cta-btn" style={{
            borderRadius: 'var(--radius-full)', padding: '1.4rem 4rem', fontSize: '1.2rem',
            fontWeight: 700, background: 'var(--primary)', color: '#fff',
            textDecoration: 'none', boxShadow: '0 8px 30px rgba(43, 136, 216, 0.4)'
          }}>
            Arranca tu aventura
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-page-footer" style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)', padding: '2.5rem 5%' }}>
        <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)' }}>
          Global<span style={{ color: 'var(--primary)' }}>Connect</span>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Hecho con ❤️ para los que exploran el mundo // {new Date().getFullYear()}
        </p>
      </footer>

    </div>
  )
}
