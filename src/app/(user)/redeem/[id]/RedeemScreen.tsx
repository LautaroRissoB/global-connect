'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SwipeToConfirm from '@/components/ui/SwipeToConfirm'

const TIMER_SECONDS = 180 // 3 minutes

interface Props {
  benefitId: string
  establishmentName: string
  establishmentCategory: string
  promoTitle: string
  promoDescription: string | null
  discountPercentage: number | null
  discountedPrice: number | null
  originalPrice: number | null
  termsConditions: string | null
}

function pad(n: number) { return String(n).padStart(2, '0') }

export default function RedeemScreen({
  benefitId,
  establishmentName,
  establishmentCategory,
  promoTitle,
  promoDescription,
  discountPercentage,
  discountedPrice,
  originalPrice,
  termsConditions,
}: Props) {
  const router = useRouter()
  const [seconds,  setSeconds]  = useState(TIMER_SECONDS)
  const [phase,    setPhase]    = useState<'ready' | 'confirmed' | 'rating' | 'done' | 'expired'>('ready')
  const [loading,  setLoading]  = useState(false)
  const [rating,   setRating]   = useState(0)

  // Countdown
  useEffect(() => {
    if (phase !== 'ready') return
    if (seconds <= 0) { setPhase('expired'); return }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, phase])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const urgent = seconds <= 30

  const handleSwipe = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/redeem/${benefitId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setLoading(false)
    if (res.ok) {
      setPhase('rating')
    }
  }, [benefitId])

  async function submitRating(stars: number) {
    setRating(stars)
    await fetch(`/api/redeem/${benefitId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: stars }),
    }).catch(() => {})
    setPhase('done')
    setTimeout(() => router.push('/profile?tab=history'), 1800)
  }

  // ── EXPIRED ─────────────────────────────────────────────────────
  if (phase === 'expired') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', textAlign: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⏱</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem' }}>La pantalla expiró</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Volvé a abrir el beneficio desde tu perfil.</p>
        <button onClick={() => router.push('/profile?tab=benefits')} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          Volver a beneficios
        </button>
      </div>
    )
  }

  // ── DONE ────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', textAlign: 'center', gap: '1rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(46,204,113,0.15)', border: '2px solid #2ecc71', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
          ✓
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: '#2ecc71' }}>¡Beneficio canjeado!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gracias por tu calificación. Redirigiendo…</p>
      </div>
    )
  }

  // ── RATING ──────────────────────────────────────────────────────
  if (phase === 'rating') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', textAlign: 'center', gap: '1.5rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(46,204,113,0.15)', border: '2px solid #2ecc71', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
          ✓
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: 6 }}>¡Beneficio confirmado!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>¿Cómo fue tu experiencia en {establishmentName}?</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => submitRating(star)}
              style={{
                fontSize: '2.2rem', background: 'none', border: 'none', cursor: 'pointer',
                opacity: rating === 0 || rating >= star ? 1 : 0.3,
                transform: 'scale(1)', transition: 'transform 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              ⭐
            </button>
          ))}
        </div>
        <button onClick={() => setPhase('done')} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Omitir
        </button>
      </div>
    )
  }

  // ── READY (main screen) ──────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── WARNING BANNER ── */}
      <div style={{
        background: 'rgba(255,82,82,0.13)',
        border: 'none',
        borderBottom: '1px solid rgba(255,82,82,0.25)',
        padding: '0.75rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <span style={{ fontSize: '1.3rem' }}>⚠️</span>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ff5252', lineHeight: 1.3 }}>
            No hagas swipe vos mismo
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Solo el staff del local puede confirmar el beneficio
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem', gap: '1.25rem' }}>

        {/* Establishment + promo card */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                {establishmentCategory}
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {establishmentName}
              </h2>
            </div>
            {/* Live timer */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginBottom: 2 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: urgent ? '#ff5252' : '#2ecc71',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
                <span style={{
                  fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800,
                  color: urgent ? '#ff5252' : 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}>
                  {pad(mins)}:{pad(secs)}
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>válido por</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.875rem' }}>
            {discountPercentage && (
              <div style={{
                display: 'inline-block',
                background: 'var(--secondary)', color: '#fff',
                borderRadius: 'var(--radius-full)', padding: '0.2rem 0.75rem',
                fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem',
              }}>
                -{discountPercentage}%
              </div>
            )}
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
              {promoTitle}
            </h3>
            {promoDescription && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                {promoDescription}
              </p>
            )}
            {discountedPrice != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.25rem' }}>
                {originalPrice != null && (
                  <span style={{ color: 'var(--text-faint)', textDecoration: 'line-through', fontSize: '0.9rem' }}>
                    ${originalPrice}
                  </span>
                )}
                <span style={{ color: 'var(--secondary)', fontWeight: 800, fontSize: '1.3rem' }}>
                  ${discountedPrice}
                </span>
              </div>
            )}
            {termsConditions && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '0.5rem', margin: 0 }}>
                * {termsConditions}
              </p>
            )}
          </div>
        </div>

        {/* Instructions for staff */}
        <div style={{
          background: 'rgba(0,206,201,0.07)',
          border: '1px solid rgba(0,206,201,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem 1rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>👋</span>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: 3 }}>
              Para el staff del local
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Deslizá el botón de abajo después de entregar el beneficio al estudiante.
            </div>
          </div>
        </div>
      </div>

      {/* ── SWIPE BAR (fixed at bottom) ── */}
      <div style={{
        padding: '1rem 1.25rem 2rem',
        background: 'var(--bg)',
        borderTop: '1px solid var(--card-border)',
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center', marginBottom: '0.75rem' }}>
          El staff desliza para confirmar
        </div>
        <SwipeToConfirm onConfirm={handleSwipe} disabled={loading} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
