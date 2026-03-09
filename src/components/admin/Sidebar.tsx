'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Globe, LayoutDashboard, Building2, Tag, User } from 'lucide-react'

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/establishments', label: 'Establecimientos',   icon: Building2 },
  { href: '/promotions',     label: 'Promociones',        icon: Tag },
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
