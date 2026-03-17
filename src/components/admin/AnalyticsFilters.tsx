'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const SORT_OPTIONS = [
  { value: 'views',    label: 'Vistas este mes' },
  { value: 'trend',    label: 'Mayor crecimiento' },
  { value: 'saved',    label: 'Beneficios guardados' },
  { value: 'redeemed', label: 'Más canjes' },
]

interface Props {
  q: string
  sort: string
  plan: string
  count: number
}

export default function AnalyticsFilters({ q, sort, plan, count }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  return (
    <form
      method="GET"
      style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const params = new URLSearchParams()
        const qVal = fd.get('q') as string
        const sVal = fd.get('sort') as string
        const pVal = fd.get('plan') as string
        if (qVal) params.set('q', qVal)
        if (sVal) params.set('sort', sVal)
        if (pVal) params.set('plan', pVal)
        router.push(`?${params.toString()}`)
      }}
    >
      <input
        name="q"
        defaultValue={q}
        placeholder="Buscar establecimiento o ciudad…"
        className="form-input"
        style={{ flex: '1 1 220px', maxWidth: 320, paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem' }}
      />
      <select
        name="sort"
        defaultValue={sort}
        className="form-select"
        style={{ width: 'auto', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem' }}
        onChange={(e) => updateParam('sort', e.target.value)}
      >
        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        name="plan"
        defaultValue={plan}
        className="form-select"
        style={{ width: 'auto', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem' }}
        onChange={(e) => updateParam('plan', e.target.value)}
      >
        <option value="">Todos los planes</option>
        <option value="free">Gratuito</option>
        <option value="basic">Básico</option>
        <option value="pro">Pro</option>
      </select>
      <button type="submit" className="btn btn-outline btn-sm" style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
        Buscar
      </button>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
        {count} establecimiento{count !== 1 ? 's' : ''}
      </span>
    </form>
  )
}
