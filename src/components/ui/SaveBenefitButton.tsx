'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookmarkPlus, Check, ArrowRight, X } from 'lucide-react'

interface Props {
  promotionId: string
  establishmentId: string
  promoTitle: string
  termsConditions: string | null
  savedBenefitId: string | null   // null = not saved yet
  isRedeemed: boolean
}

export default function SaveBenefitButton({
  promotionId,
  establishmentId,
  promoTitle,
  termsConditions,
  savedBenefitId: initialId,
  isRedeemed: initialRedeemed,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [benefitId, setBenefitId] = useState<string | null>(initialId)
  const [redeemed,  setRedeemed]  = useState(initialRedeemed)
  const [error,     setError]     = useState('')

  async function handleSave() {
    setLoading(true); setError('')
    const res = await fetch('/api/save-benefit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId, establishmentId }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Error al guardar'); return }
    setBenefitId(json.id)
    setShowModal(false)
  }

  // Already redeemed
  if (redeemed) {
    void setRedeemed // suppress unused warning
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-full)', background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', fontSize: '0.82rem', color: '#2ecc71', fontWeight: 600 }}>
        <Check size={13} /> Canjeado
      </div>
    )
  }

  // Already saved → go to redeem
  if (benefitId) {
    return (
      <Link
        href={`/redeem/${benefitId}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', background: 'var(--secondary)', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}
      >
        Canjear ahora <ArrowRight size={14} />
      </Link>
    )
  }

  // Not saved yet
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)', color: 'var(--primary-light)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
      >
        <BookmarkPlus size={14} /> Guardar beneficio
      </button>

      {/* Confirmation modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'flex-end', padding: '0 0 env(safe-area-inset-bottom)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0', border: '1px solid var(--card-border)', padding: '1.5rem 1.25rem 2rem', maxWidth: 540, margin: '0 auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {promoTitle}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {termsConditions && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.875rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Condiciones</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{termsConditions}</p>
              </div>
            )}

            <div style={{ background: 'rgba(0,206,201,0.07)', border: '1px solid rgba(0,206,201,0.18)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.875rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Este beneficio se puede usar <strong style={{ color: 'var(--text)' }}>una sola vez</strong>. Al llegar al local, mostrá la pantalla de canje al staff para que lo confirme.
            </div>

            {error && <p style={{ fontSize: '0.82rem', color: '#ff5252', marginBottom: '0.75rem' }}>{error}</p>}

            <button
              onClick={handleSave}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Guardando…' : 'Entendido, guardar beneficio'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
