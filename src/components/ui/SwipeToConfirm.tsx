'use client'

import { useRef, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'

interface Props {
  onConfirm: () => void
  disabled?: boolean
}

const THUMB = 60
const PAD   = 4

export default function SwipeToConfirm({ onConfirm, disabled }: Props) {
  const trackRef    = useRef<HTMLDivElement>(null)
  const [x, setX]   = useState(0)
  const [done, setDone] = useState(false)
  const dragging    = useRef(false)
  const startX      = useRef(0)

  function maxX() {
    return (trackRef.current?.clientWidth ?? 320) - THUMB - PAD * 2
  }

  function onDown(e: React.PointerEvent) {
    if (disabled || done) return
    dragging.current = true
    startX.current   = e.clientX - x
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return
    setX(Math.max(0, Math.min(e.clientX - startX.current, maxX())))
  }

  function onUp() {
    if (!dragging.current) return
    dragging.current = false
    if (x / maxX() > 0.82) {
      setX(maxX())
      setDone(true)
      onConfirm()
    } else {
      setX(0)
    }
  }

  const progress = x / Math.max(1, maxX())

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative',
        height: THUMB + PAD * 2,
        borderRadius: (THUMB + PAD * 2) / 2,
        background: done
          ? 'rgba(46,204,113,0.18)'
          : 'rgba(255,255,255,0.07)',
        border: `1.5px solid ${done ? 'rgba(46,204,113,0.5)' : 'rgba(255,255,255,0.13)'}`,
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Fill */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: PAD + THUMB / 2 + x,
        background: done
          ? 'rgba(46,204,113,0.25)'
          : `rgba(0,206,201,${0.1 + progress * 0.25})`,
        borderRadius: 'inherit',
        transition: done ? 'none' : (dragging.current ? 'none' : 'width 0.3s ease, background 0.2s'),
      }} />

      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.03em',
        color: done
          ? 'rgba(46,204,113,0.95)'
          : `rgba(255,255,255,${0.35 + (1 - progress) * 0.45})`,
        pointerEvents: 'none',
        transition: 'color 0.2s',
      }}>
        {done ? '✓ Beneficio confirmado' : 'Deslizá para confirmar ▸▸'}
      </div>

      {/* Thumb */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: 'absolute',
          left: PAD + x,
          top: PAD,
          width: THUMB, height: THUMB,
          borderRadius: '50%',
          background: done ? '#2ecc71' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: done ? 'default' : (disabled ? 'not-allowed' : 'grab'),
          touchAction: 'none',
          boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
          transition: done ? 'background 0.25s' : (dragging.current ? 'none' : 'left 0.35s cubic-bezier(.22,.68,0,1.2)'),
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {done
          ? <Check size={26} style={{ color: '#fff' }} />
          : <ChevronRight size={26} style={{ color: '#555', marginLeft: 2 }} />
        }
      </div>
    </div>
  )
}
