'use client'

import { useTransition } from 'react'

const PLAN_STYLES: Record<string, { color: string; bg: string }> = {
  free:  { color: 'var(--text-faint)',   bg: 'rgba(255,255,255,0.04)' },
  basic: { color: 'var(--secondary)',    bg: 'rgba(0,206,201,0.1)' },
  pro:   { color: 'var(--primary-light)', bg: 'rgba(108,92,231,0.12)' },
}

interface Props {
  id: string
  plan: string
  action: (id: string, plan: string) => Promise<void>
}

export default function PlanSelector({ id, plan, action }: Props) {
  const [pending, startTransition] = useTransition()
  const style = PLAN_STYLES[plan] ?? PLAN_STYLES.free

  return (
    <select
      value={plan}
      disabled={pending}
      onChange={(e) => {
        startTransition(() => action(id, e.target.value))
      }}
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.color}50`,
        borderRadius: 'var(--radius-full)',
        padding: '3px 8px',
        fontSize: '0.72rem',
        fontWeight: 700,
        cursor: pending ? 'wait' : 'pointer',
        outline: 'none',
        opacity: pending ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      <option value="free">Gratuito</option>
      <option value="basic">Básico</option>
      <option value="pro">Pro</option>
    </select>
  )
}
