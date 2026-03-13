'use client'

import { useState } from 'react'
import { FileText, Copy, Check, X } from 'lucide-react'

interface ReportData {
  name: string
  city: string
  plan: string
  viewsThis: number
  viewsLast: number
  delta: number | null
  activePromos: number
  monthName: string
  lastMonthName: string
}

function buildReportText(r: ReportData): string {
  const trend = r.delta === null
    ? 'Sin datos del mes anterior para comparar.'
    : r.delta > 0
      ? `📈 Las visitas aumentaron un ${r.delta}% respecto a ${r.lastMonthName}.`
      : r.delta < 0
        ? `📉 Las visitas bajaron un ${Math.abs(r.delta)}% respecto a ${r.lastMonthName}.`
        : `➡️ Las visitas se mantuvieron igual que ${r.lastMonthName}.`

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 REPORTE MENSUAL — ${r.monthName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 ${r.name}
📍 ${r.city}
💎 Plan: ${r.plan}

VISITAS AL PERFIL
─────────────────
• Este mes (${r.monthName.split(' ')[0]}):  ${r.viewsThis} visitas
• Mes anterior (${r.lastMonthName}): ${r.viewsLast} visitas
• ${trend}

PROMOCIONES
───────────
• Promociones activas: ${r.activePromos > 0 ? r.activePromos : 'Ninguna'}${r.activePromos === 0 ? '\n  💡 Activá una promoción para atraer más estudiantes.' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reporte generado por Global Connect Admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

interface Props {
  report: ReportData
}

export default function ReportActions({ report }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const text = buildReportText(report)

  async function copyText() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="action-btn"
        title="Ver reporte"
        style={{ fontSize: '0.72rem', width: 'auto', padding: '3px 10px', borderRadius: 6, gap: 4, display: 'inline-flex' }}
      >
        <FileText size={13} /> Ver
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 540,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--card-border)',
            }}>
              <div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Reporte mensual</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{report.name}</p>
              </div>
              <button onClick={() => setOpen(false)} className="action-btn"><X size={16} /></button>
            </div>

            {/* Report text */}
            <pre style={{
              margin: 0, padding: '1.25rem 1.5rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.8rem', lineHeight: 1.65,
              color: 'var(--text)', whiteSpace: 'pre-wrap',
              maxHeight: '55vh', overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
            }}>
              {text}
            </pre>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '1rem 1.5rem', borderTop: '1px solid var(--card-border)',
            }}>
              <button onClick={() => setOpen(false)} className="btn btn-outline btn-sm">
                Cerrar
              </button>
              <button onClick={copyText} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar reporte</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
