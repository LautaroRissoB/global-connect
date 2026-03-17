'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle, Mail, Zap, X } from 'lucide-react'

interface PromoRow {
  title: string
  discount: number | null
  saved: number
  redeemed: number
  redemptionRate: number
}

export interface ReportData {
  name: string
  city: string
  plan: string
  monthName: string
  lastMonthName: string
  viewsThis: number
  viewsLast: number
  viewDelta: number | null
  uniqueVisitors: number
  totalSaved: number
  totalRedeemed: number
  avgRating: string | null
  promoRows: PromoRow[]
}

type Format = 'whatsapp' | 'email' | 'exec'

/* ─── WhatsApp: conciso, emojis, listo para chat ─────── */
function buildWhatsApp(r: ReportData): string {
  const trend =
    r.viewDelta === null ? '' :
    r.viewDelta > 0  ? ` 📈 *+${r.viewDelta}%* vs ${r.lastMonthName}` :
    r.viewDelta < 0  ? ` 📉 *${r.viewDelta}%* vs ${r.lastMonthName}` :
                       ` ➡️ igual que ${r.lastMonthName}`

  const bestPromo  = r.promoRows[0]
  const promoLine  = bestPromo
    ? `\n🏆 *Mejor promo:* "${bestPromo.title}"${bestPromo.discount ? ` (${bestPromo.discount}% off)` : ''} — ${bestPromo.saved} guardados, ${bestPromo.redeemed} canjeados (${bestPromo.redemptionRate}%)`
    : ''

  const ratingLine = r.avgRating     ? `\n⭐ Calificación: *${r.avgRating}/5*`            : ''
  const uniqueLine = r.uniqueVisitors > 0 ? `\n👥 Visitantes únicos: *${r.uniqueVisitors}*` : ''

  return (
`📊 *Reporte mensual — ${r.monthName}*
🏢 *${r.name}* · ${r.city}

👁 Vistas al perfil: *${r.viewsThis}*${trend}${uniqueLine}
🔖 Beneficios guardados: *${r.totalSaved}*
✅ Canjes realizados: *${r.totalRedeemed}*${ratingLine}${promoLine}

_Reporte de Global Connect — plataforma de beneficios para estudiantes internacionales_`)
}

/* ─── Email: formal, con asunto y próximos pasos ─────── */
function buildEmail(r: ReportData): string {
  const trend =
    r.viewDelta === null
      ? 'Es el primer mes con datos comparables.'
    : r.viewDelta > 0
      ? `Esto representa un aumento del ${r.viewDelta}% respecto a ${r.lastMonthName} (${r.viewsLast} visitas).`
    : r.viewDelta < 0
      ? `Esto representa una caída del ${Math.abs(r.viewDelta)}% respecto a ${r.lastMonthName} (${r.viewsLast} visitas).`
    : `Las visitas se mantuvieron estables respecto a ${r.lastMonthName}.`

  const promoSection = r.promoRows.length === 0
    ? 'No se registró actividad en promociones este mes.'
    : r.promoRows.map(p =>
        `  - "${p.title}"${p.discount ? ` (${p.discount}% de descuento)` : ''}: ` +
        `${p.saved} guardados, ${p.redeemed} canjeados (tasa: ${p.redemptionRate}%)`
      ).join('\n')

  const ratingLine = r.avgRating ? `Las valoraciones promediaron ${r.avgRating}/5.\n\n` : ''
  const uniqueLine = r.uniqueVisitors > 0
    ? `De esas visitas, ${r.uniqueVisitors} correspondieron a estudiantes únicos identificados.\n` : ''

  const cta =
    r.totalSaved === 0
      ? 'Activar o renovar una promoción puede aumentar la visibilidad ante los estudiantes que visiten tu perfil.'
    : r.totalRedeemed === 0
      ? 'Tus beneficios están siendo guardados pero aún no canjeados. Recordale a los estudiantes que los tienen disponibles.'
    : `Con una tasa de canje del ${r.promoRows[0] ? r.promoRows[0].redemptionRate + '%' : 'positiva'}, el perfil muestra buena conversión. Mantener las promociones activas potencia los resultados.`

  return (
`Asunto: Tu reporte mensual en Global Connect — ${r.monthName}

Hola equipo de ${r.name},

A continuación encontrás el resumen de actividad de tu perfil en Global Connect durante ${r.monthName}.

VISITAS AL PERFIL
─────────────────
Tu perfil recibió ${r.viewsThis} visitas este mes. ${trend}
${uniqueLine}
BENEFICIOS Y CANJES
───────────────────
Los estudiantes guardaron ${r.totalSaved} beneficio${r.totalSaved !== 1 ? 's' : ''}, con ${r.totalRedeemed} canje${r.totalRedeemed !== 1 ? 's' : ''} efectivos.
${ratingLine}DETALLE POR PROMOCIÓN
─────────────────────
${promoSection}

PRÓXIMOS PASOS
──────────────
${cta}

Cualquier consulta no dudes en contactarnos.
Equipo Global Connect`)
}

/* ─── Ejecutivo: 3 cifras + 1 insight ───────────────── */
function buildExec(r: ReportData): string {
  const comparison =
    r.viewDelta === null ? '' :
    r.viewDelta > 0  ? `  ↑ +${r.viewDelta}% vs ${r.lastMonthName}` :
    r.viewDelta < 0  ? `  ↓ ${r.viewDelta}% vs ${r.lastMonthName}` :
                       `  = igual que ${r.lastMonthName}`

  const convRate = r.totalSaved > 0 ? Math.round((r.totalRedeemed / r.totalSaved) * 100) : 0

  const insight =
    r.totalRedeemed > 0
      ? `Conversión: ${r.totalRedeemed}/${r.totalSaved} beneficios canjeados (${convRate}%).`
    : r.totalSaved > 0
      ? `${r.totalSaved} beneficios guardados sin canjear. Oportunidad de conversión pendiente.`
    : 'Sin actividad en beneficios este mes. Activar una promo puede generar interacción.'

  return (
`${r.name} — ${r.monthName}

  📌  Vistas: ${r.viewsThis}${comparison}
  🔖  Guardados: ${r.totalSaved}   ✅  Canjes: ${r.totalRedeemed}${r.avgRating ? `   ⭐ ${r.avgRating}/5` : ''}

  💡  ${insight}`)
}

/* ─── Component ──────────────────────────────────────── */

const FORMATS: { key: Format; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp',  icon: MessageCircle, desc: 'Conciso, con emojis, para enviar por chat' },
  { key: 'email',    label: 'Email',     icon: Mail,          desc: 'Formal, con asunto, cuerpo y próximos pasos' },
  { key: 'exec',     label: 'Ejecutivo', icon: Zap,           desc: '3 cifras + 1 insight, para revisiones rápidas' },
]

export default function EstabStatsReport({ report, compact = false }: { report: ReportData; compact?: boolean }) {
  const [open,   setOpen]   = useState(false)
  const [format, setFormat] = useState<Format>('whatsapp')
  const [copied, setCopied] = useState(false)

  const text =
    format === 'whatsapp' ? buildWhatsApp(report) :
    format === 'email'    ? buildEmail(report) :
                            buildExec(report)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  function renderBody() {
    return (
      <>
        {/* Format picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.875rem' }}>
          {FORMATS.map(f => {
            const Icon = f.icon
            const active = format === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.55rem 0.875rem', borderRadius: 8,
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--card-border)'}`,
                  background: active ? 'rgba(108,92,231,0.12)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                }}
              >
                <Icon size={15} style={{ color: active ? 'var(--primary-light)' : 'var(--text-muted)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? 'var(--primary-light)' : 'var(--text)' }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-faint)', lineHeight: 1.3, marginTop: 1 }}>
                    {f.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Preview */}
        <pre style={{
          fontFamily: 'monospace', fontSize: '0.71rem', lineHeight: 1.65,
          color: 'var(--text)', background: 'rgba(0,0,0,0.22)', borderRadius: 8,
          padding: '0.875rem', whiteSpace: 'pre-wrap', maxHeight: 300,
          overflowY: 'auto', margin: '0 0 0.75rem', border: '1px solid var(--card-border)',
        }}>
          {text}
        </pre>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setOpen(false)}
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Cerrar
          </button>
          <button
            onClick={copy}
            className="btn btn-primary btn-sm"
            style={{ flex: 2, justifyContent: 'center', gap: 6 }}
          >
            {copied
              ? <><Check size={13} /> Copiado</>
              : <><Copy size={13} /> Copiar {FORMATS.find(f => f.key === format)?.label}</>
            }
          </button>
        </div>
      </>
    )
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="action-btn"
          title="Generar reporte"
          style={{ fontSize: '0.72rem', width: 'auto', padding: '3px 10px', borderRadius: 6, gap: 4, display: 'inline-flex' }}
        >
          <Copy size={13} /> Reporte
        </button>

        {open && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}>
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 540, padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{report.name} — Reporte {report.monthName}</h2>
                <button onClick={() => setOpen(false)} className="action-btn"><X size={16} /></button>
              </div>
              {renderBody()}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 'none', padding: '1.25rem' }}>
      <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.875rem' }}>
        Generar reporte
      </h2>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary btn-sm"
          style={{ width: '100%', justifyContent: 'center', gap: 7 }}
        >
          Generar reporte del mes
        </button>
      ) : (
        <>
          {renderBody()}
        </>
      )}
    </div>
  )
}
