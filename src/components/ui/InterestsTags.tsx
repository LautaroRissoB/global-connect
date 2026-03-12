'use client'

import { useState, useTransition } from 'react'

const ALL_INTERESTS = [
  { id: 'food',       label: 'Gastronomía',    emoji: '🍕' },
  { id: 'bars',       label: 'Bares',           emoji: '🍺' },
  { id: 'nightlife',  label: 'Vida nocturna',   emoji: '🌙' },
  { id: 'culture',    label: 'Cultura',         emoji: '🎭' },
  { id: 'music',      label: 'Música',          emoji: '🎵' },
  { id: 'art',        label: 'Arte',            emoji: '🎨' },
  { id: 'sports',     label: 'Deportes',        emoji: '⚽' },
  { id: 'fitness',    label: 'Fitness',         emoji: '🏋️' },
  { id: 'tourism',    label: 'Turismo',         emoji: '🗺️' },
  { id: 'coffee',     label: 'Cafeterías',      emoji: '☕' },
  { id: 'photo',      label: 'Fotografía',      emoji: '📸' },
  { id: 'tech',       label: 'Tecnología',      emoji: '💻' },
]

interface Props {
  initial: string[]
  saveAction: (interests: string[]) => Promise<void>
}

export default function InterestsTags({ initial, saveAction }: Props) {
  const [selected, setSelected]  = useState<string[]>(initial)
  const [saved,    setSaved]     = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSaved(false)
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function handleSave() {
    startTransition(async () => {
      await saveAction(selected)
      setSaved(true)
    })
  }

  const dirty = JSON.stringify(selected.sort()) !== JSON.stringify([...initial].sort())

  return (
    <div>
      {/* Tags grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
        {ALL_INTERESTS.map(({ id, label, emoji }) => {
          const active = selected.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${active ? 'var(--secondary)' : 'var(--card-border)'}`,
                background: active ? 'rgba(0,206,201,0.12)' : 'transparent',
                color: active ? 'var(--secondary)' : 'var(--text-muted)',
                fontSize: '0.82rem', fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              <span>{emoji}</span> {label}
            </button>
          )
        })}
      </div>

      {/* Save button — only when there are changes */}
      {(dirty || saved) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="btn btn-primary btn-sm"
              style={{ opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          )}
          {saved && !dirty && (
            <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>
              ✓ Guardado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
