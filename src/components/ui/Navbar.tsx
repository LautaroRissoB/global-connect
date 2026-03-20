'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Globe, Menu, X, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'

export default function Navbar() {
  const router     = useRouter()
  const pathname   = usePathname()
  const locale     = useLocale()
  const t          = useTranslations('nav')

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail,  setUserEmail]  = useState<string | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      setAuthLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  function toggleLocale() {
    const next = locale === 'es' ? 'en' : 'es'
    window.location.href = `/api/set-locale?locale=${next}&redirect=${encodeURIComponent(pathname)}`
  }

  return (
    <nav className="navbar glass-card" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '1.2rem 0' }}>
      <div className="navbar-container">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <Globe size={22} color="var(--primary)" style={{ marginRight: '10px' }} />
          <span style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.04em' }}>Global<span style={{ fontWeight: 300 }}>Connect</span></span>
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          <Link href="/explore" style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em' }}>Explorar</Link>
        </div>

        {/* Desktop actions */}
        <div className="navbar-actions" style={{ minWidth: 160, gap: '1.5rem' }}>
          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            className="premium-chip"
            style={{ padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}
          >
            {locale === 'es' ? 'EN' : 'ES'}
          </button>

          {!authLoaded ? null : userEmail ? (
            <>
              <Link href="/profile" style={{ fontSize: '14px', fontWeight: 600 }}>Perfil</Link>
              <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.2rem' }}>
                <LogOut size={14} style={{ marginRight: '6px' }} />
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" style={{ fontSize: '14px', fontWeight: 600 }}>Ingresar</Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.5rem' }}>Comenzar</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar-mobile">
          <Link href="/explore" onClick={() => setMobileOpen(false)}>{t('explore')}</Link>
          <button
            onClick={toggleLocale}
            style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '1rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {locale === 'es' ? '🇺🇸 English' : '🇦🇷 Español'}
          </button>
          {userEmail ? (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)}>{t('profile')}</Link>
              <button
                onClick={handleLogout}
                style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '1rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <LogOut size={16} /> {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login"    onClick={() => setMobileOpen(false)}>{t('login')}</Link>
              <Link href="/auth/register" onClick={() => setMobileOpen(false)}>{t('register')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
