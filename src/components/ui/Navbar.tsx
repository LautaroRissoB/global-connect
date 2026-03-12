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
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <Globe size={22} className="navbar-logo-icon" />
          <span>Global Connect</span>
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          <Link href="/explore">{t('explore')}</Link>
        </div>

        {/* Desktop actions */}
        <div className="navbar-actions" style={{ minWidth: 160, gap: '0.5rem' }}>
          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            style={{
              background: 'none',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            {locale === 'es' ? 'EN' : 'ES'}
          </button>

          {!authLoaded ? null : userEmail ? (
            <>
              <Link href="/profile" className="btn btn-outline btn-sm">{t('profile')}</Link>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                <LogOut size={14} />
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-outline btn-sm">{t('login')}</Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm">{t('register')}</Link>
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
