'use client'

import { useState } from 'react'
import { FileText, Copy, Check } from 'lucide-react'

interface PromoRow {
  title: string
  discount: number | null
  saved: number
  redeemed: number
  redemptionRate: number
}

interface ReportData {
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

function buildReport(r: ReportData): string {
  const trend = r.viewDelta === null
    ? 'Sin datos del mes anterior para comparar.'
    : r.viewDelta > 0
      ? `📈 +${r.viewDelta}% respecto a ${r.lastMonthName} (${r.viewsLast} → ${r.viewsThis}).`
      : r.viewDelta < 0
        ? `📉 ${r.viewDelta}% respecto a ${r.lastMonthName} (${r.viewsLast} → ${r.viewsThis}).`
        : `➡️ Sin cambios respecto a ${r.lastMonthName}.`

  const promoLines = r.promoRows.length === 0
    ? '  (Sin actividad en promociones)'
    : r.promoRows.map(p =>
        `  • ${p.title}${p.discount ? ` (${p.discount}% off)` : ''}\n` +
        `    Guardados: ${p.saved}  |  Canjeados: ${p.redeemed}  |  Tasa: ${p.redemptionRate}%`
      ).join('\n')

  const uniqueNote = r.uniqueVisitors > 0
    ? `  · ${r.uniqueVisitors} visitantes únicos identificados\n`
    : ''

  const ratingNote = r.avgRating
    ? `  · Calificación promedio: ★ ${r.avgRating}/5\n`
    : ''

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 REPORTE MENSUAL — ${r.monthName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 ${r.name}
📍 ${r.city}
💎 Plan: ${r.plan}

VISITAS AL PERFIL
─────────────────
• Este mes (${r.monthName.split(' ')[0]}): ${r.viewsThis} vistas
• ${r.lastMonthName}: ${r.viewsLast} vistas
${uniqueNote}• ${trend}

BENEFICIOS & CANJES
───────────────────
• Beneficios guardados por estudiantes: ${r.totalSaved}
• Canjes realizados: ${r.totalRedeemed}
${ratingNote}
DESGLOSE POR PROMOCIÓN
──────────────────────
${promoLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reporte generado por Global Connect Admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

export default function EstabStatsReport({ report }: { report: ReportData }) {
  const [open, setCopied] = useState(false)
  const [copied, setJustCopied] = useState(false)
  const text = buildReport(report)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setJustCopied(true)
    setTimeout(() => setJustCopied(false), 2000)
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 'none', padding: '1.25rem' }}>
      <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.875rem' }}>
        Reporte del mes
      </h2>
      {!open ? (
        <button
          onClick={() => setCopied(true)}
          className="btn btn-outline btn-sm"
          style={{ width: '100%', justifyContent: 'center', gap: 7 }}
        >
          <FileText size={14} /> Ver reporte completo
        </button>
      ) : (
        <>
          <pre style={{
            fontFamily: 'monospace', fontSize: '0.72rem',
            lineHeight: 1.6, color: 'var(--text)',
            background: 'rgba(0,0,0,0.25)', borderRadius: 8,
            padding: '0.875rem', whiteSpace: 'pre-wrap',
            maxHeight: 340, overflowY: 'auto',
            margin: '0 0 0.75rem',
          }}>
            {text}
          </pre>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCopied(false)} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              Cerrar
            </button>
            <button onClick={copy} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
              {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
