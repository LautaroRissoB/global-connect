'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Globe, Building2, Users, TrendingUp, BarChart3, User } from 'lucide-react'

const NAV = [
  { href: '/clientes',     label: 'Clientes',      icon: Building2 },
  { href: '/estudiantes',  label: 'Estudiantes',   icon: Users },
  { href: '/empresa',      label: 'Mi Empresa',    icon: BarChart3 },
  { href: '/estadisticas', label: 'Estadísticas',  icon: TrendingUp },
]

interface Props {
  email: string
}

export default function AdminSidebar({ email }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <div className="admin-logo">
        <Globe size={20} className="admin-logo-icon" />
        <span>Global Connect</span>
        <span className="admin-badge">Admin</span>
      </div>

      {/* Nav */}
      <nav className="admin-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`admin-nav-item ${isActive(href) ? 'active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <User size={14} />
        <span title={email}>{email}</span>
      </div>
    </aside>
  )
}
