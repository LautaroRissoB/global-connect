'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Menu, X, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
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
          <Link href="/explore">Explorar</Link>
        </div>

        {/* Desktop actions */}
        <div className="navbar-actions">
          {userEmail ? (
            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              <LogOut size={14} />
              Salir
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-outline btn-sm">
                Iniciar sesión
              </Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm">
                Registrarse
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar-mobile">
          <Link href="/explore" onClick={() => setMobileOpen(false)}>Explorar</Link>
          {userEmail ? (
            <button
              onClick={handleLogout}
              style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '1rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          ) : (
            <>
              <Link href="/auth/login"    onClick={() => setMobileOpen(false)}>Iniciar sesión</Link>
              <Link href="/auth/register" onClick={() => setMobileOpen(false)}>Registrarse</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
