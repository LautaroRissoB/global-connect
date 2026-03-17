'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'

interface SavedBenefit {
  id: string
  saved_at: string
  status: 'saved' | 'redeemed'
  establishment_id: string | null
  promo_title: string
  promo_discount: number | null
  valid_until: string | null
  establishment_name: string
  establishment_category: string
}

interface Redemption {
  id: string
  redeemed_at: string
  rating: number | null
  promo_title: string
  promo_discount: number | null
  establishment_name: string
}

interface Props {
  profileContent: React.ReactNode
  savedBenefits: SavedBenefit[]
  redemptions: Redemption[]
}

const TABS = [
  { id: 'profile',  label: 'Perfil' },
  { id: 'benefits', label: 'Beneficios' },
  { id: 'history',  label: 'Historial' },
]

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', club: 'Discoteca',
  cafe: 'Cafetería', cultural: 'Cultura', theater: 'Teatro',
  sports: 'Deportes', other: 'Otro',
}

export default function ProfileTabs({ profileContent, savedBenefits, redemptions }: Props) {
  const available = savedBenefits.filter((b) => b.status === 'saved')
  const searchParams = useSearchParams()

  const urlTab = searchParams.get('tab') ?? 'profile'
  const [active, setActive] = useState<string>(
    urlTab === 'benefits' ? 'benefits' : urlTab === 'history' ? 'history' : 'profile'
  )

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--card-border)',
        marginBottom: '1.5rem',
        position: 'sticky', top: 56, background: 'var(--bg)', zIndex: 10,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              flex: 1, padding: '0.75rem 0.5rem',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.88rem', fontWeight: active === tab.id ? 700 : 400,
              color: active === tab.id ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: active === tab.id ? '2px solid var(--primary-light)' : '2px solid transparent',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.id === 'benefits' && available.length > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                {available.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {active === 'profile' && profileContent}

      {/* Benefits tab */}
      {active === 'benefits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {available.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏷️</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                Todavía no guardaste ningún beneficio.
              </p>
              <Link href="/explore" className="btn btn-primary btn-sm">
                Ver establecimientos <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            available.map((b) => (
              <div key={b.id} className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '1rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    {CATEGORY_LABELS[b.establishment_category] ?? b.establishment_category}
                  </div>
                  {b.establishment_id ? (
                    <Link href={`/establishment/${b.establishment_id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textDecoration: 'none' }}>
                      {b.establishment_name}
                    </Link>
                  ) : (
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.establishment_name}
                    </div>
                  )}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {b.promo_discount && <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>-{b.promo_discount}%</span>}
                    {b.promo_title}
                  </div>
                  {b.valid_until && (() => {
                    const days = daysUntil(b.valid_until)
                    const expiring = days >= 0 && days <= 7
                    const expired = days < 0
                    if (expired) return null
                    return (
                      <div style={{ fontSize: '0.7rem', marginTop: 4, fontWeight: 600,
                        color: expiring ? '#e17055' : 'var(--text-faint)',
                        background: expiring ? 'rgba(225,112,85,0.1)' : 'transparent',
                        borderRadius: 4, padding: expiring ? '1px 5px' : 0, display: 'inline-block',
                      }}>
                        {expiring ? `⚠️ Vence en ${days} día${days !== 1 ? 's' : ''}` : `Válido hasta ${formatDate(b.valid_until)}`}
                      </div>
                    )
                  })()}
                </div>
                <Link
                  href={`/redeem/${b.id}`}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-full)', background: 'var(--secondary)', color: '#fff', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Canjear <ArrowRight size={13} />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {active === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {redemptions.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Todavía no canjeaste ningún beneficio.
              </p>
            </div>
          ) : (
            redemptions.map((r) => (
              <div key={r.id} className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', opacity: 0.85 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.establishment_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {r.promo_discount && <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>-{r.promo_discount}%</span>}
                    {r.promo_title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {formatDate(r.redeemed_at)}
                    {r.rating && <span style={{ marginLeft: 6 }}>{'⭐'.repeat(r.rating)}</span>}
                  </div>
                </div>
                <span style={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, color: '#2ecc71', background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 'var(--radius-full)', padding: '3px 10px' }}>
                  Canjeado
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
