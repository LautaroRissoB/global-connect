'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Globe, Menu, X } from 'lucide-react'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

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
          <Link href="/compare">Comparar</Link>
        </div>

        {/* Desktop actions */}
        <div className="navbar-actions">
          <Link href="/auth/login" className="btn btn-outline btn-sm">
            Iniciar sesión
          </Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">
            Registrarse
          </Link>
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
          <Link href="/explore"       onClick={() => setMobileOpen(false)}>Explorar</Link>
          <Link href="/compare"       onClick={() => setMobileOpen(false)}>Comparar</Link>
          <Link href="/auth/login"    onClick={() => setMobileOpen(false)}>Iniciar sesión</Link>
          <Link href="/auth/register" onClick={() => setMobileOpen(false)}>Registrarse</Link>
        </div>
      )}
    </nav>
  )
}
