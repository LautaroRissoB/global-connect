'use client'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINS_LIST = ['00', '15', '30', '45']

export interface DayConfig {
  enabled: boolean
  closed:  boolean
  from:    string   // "HH:MM"
  to:      string   // "HH:MM"
}

export type WeekHours = Record<string, DayConfig>

export const DEFAULT_WEEK: WeekHours = Object.fromEntries(
  DAYS.map((d) => [d, { enabled: false, closed: false, from: '10:00', to: '22:00' }])
)

export function parseOpeningHours(raw: Record<string, string>): WeekHours {
  const week: WeekHours = Object.fromEntries(
    DAYS.map((d) => [d, { enabled: false, closed: false, from: '10:00', to: '22:00' }])
  )
  for (const [day, val] of Object.entries(raw)) {
    if (!week[day]) continue
    if (val === 'Cerrado') {
      week[day] = { enabled: true, closed: true, from: '10:00', to: '22:00' }
    } else {
      const parts = val.split(' - ')
      week[day] = { enabled: true, closed: false, from: parts[0] ?? '10:00', to: parts[1] ?? '22:00' }
    }
  }
  return week
}

export function weekToOpeningHours(week: WeekHours): Record<string, string> | null {
  const result: Record<string, string> = {}
  for (const [day, cfg] of Object.entries(week)) {
    if (!cfg.enabled) continue
    result[day] = cfg.closed ? 'Cerrado' : `${cfg.from} - ${cfg.to}`
  }
  return Object.keys(result).length > 0 ? result : null
}

// ── Time picker (2 selects: HH + MM) ──────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h = '10', m = '00'] = value.split(':')

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    padding: '6px 4px',
    cursor: 'pointer',
    width: 52,
    textAlign: 'center',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <select style={selectStyle} value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)}>
        {HOURS_LIST.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>:</span>
      <select style={selectStyle} value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)}>
        {MINS_LIST.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  value:    WeekHours
  onChange: (next: WeekHours) => void
}

const PRESETS = [
  { label: 'Lun – Vie',  days: DAYS.slice(0, 5) },
  { label: 'Lun – Sáb', days: DAYS.slice(0, 6) },
  { label: 'Todos',     days: DAYS },
]

export default function WeekHoursEditor({ value, onChange }: Props) {
  function toggle(day: string) {
    onChange({ ...value, [day]: { ...value[day], enabled: !value[day].enabled } })
  }

  function setClosed(day: string, closed: boolean) {
    onChange({ ...value, [day]: { ...value[day], closed } })
  }

  function setTime(day: string, field: 'from' | 'to', time: string) {
    onChange({ ...value, [day]: { ...value[day], [field]: time } })
  }

  function applyPreset(days: string[]) {
    const next = { ...value }
    // Enable the chosen days, disable the rest
    for (const d of DAYS) {
      next[d] = { ...next[d], enabled: days.includes(d) }
    }
    // Keep existing times or default
    onChange(next)
  }

  const chipBtn: React.CSSProperties = {
    fontSize: '0.72rem',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--card-border)',
    background: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      {/* Presets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', alignSelf: 'center', marginRight: 2 }}>Selección rápida:</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" style={chipBtn} onClick={() => applyPreset(p.days)}>
            {p.label}
          </button>
        ))}
        <button type="button" style={{ ...chipBtn, color: 'var(--text-faint)' }} onClick={() => onChange(Object.fromEntries(DAYS.map((d) => [d, { ...value[d], enabled: false }])))}>
          Limpiar
        </button>
      </div>

      {/* Days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DAYS.map((day) => {
          const cfg = value[day]
          return (
            <div
              key={day}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr',
                gap: 8,
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: cfg.enabled ? 'rgba(108,92,231,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${cfg.enabled ? 'rgba(108,92,231,0.2)' : 'var(--card-border)'}`,
                transition: 'all 0.15s',
              }}
            >
              {/* Toggle + name */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <span
                  onClick={() => toggle(day)}
                  style={{
                    display: 'inline-block',
                    width: 34,
                    height: 20,
                    borderRadius: 10,
                    background: cfg.enabled ? 'var(--primary)' : 'var(--card-border)',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: cfg.enabled ? 17 : 3,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </span>
                <span style={{ fontSize: '0.85rem', color: cfg.enabled ? 'var(--text)' : 'var(--text-faint)', fontWeight: cfg.enabled ? 500 : 400 }}>
                  {day}
                </span>
              </label>

              {/* Hours */}
              {cfg.enabled ? (
                cfg.closed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Cerrado</span>
                    <button type="button" onClick={() => setClosed(day, false)} style={{ ...chipBtn, fontSize: '0.7rem' }}>
                      Agregar horario
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <TimePicker value={cfg.from} onChange={(v) => setTime(day, 'from', v)} />
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>a</span>
                    <TimePicker value={cfg.to}   onChange={(v) => setTime(day, 'to',   v)} />
                    <button type="button" onClick={() => setClosed(day, true)} style={{ ...chipBtn, fontSize: '0.7rem', marginLeft: 'auto' }}>
                      Cerrado
                    </button>
                  </div>
                )
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>No disponible</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
