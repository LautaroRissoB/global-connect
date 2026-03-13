'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export type DayCount    = { date: string; count: number }
export type EstabViews  = { name: string; views: number }
export type CountryCount = { country: string; count: number }

/* ── User Growth ─────────────────────────────────────── */
export function UserGrowthChart({ data }: { data: DayCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12 }}
          itemStyle={{ color: 'var(--primary-light)' }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
        />
        <Line type="monotone" dataKey="count" stroke="var(--primary-light)" strokeWidth={2} dot={false} name="Nuevos usuarios" />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ── Views by Establishment ─────────────────────────── */
export function ViewsChart({ data }: { data: EstabViews[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={120} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12 }}
          itemStyle={{ color: 'var(--secondary)' }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
        />
        <Bar dataKey="views" fill="var(--secondary)" radius={[0, 4, 4, 0]} name="Vistas" />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Users by Country ────────────────────────────────── */
export function CountryChart({ data }: { data: CountryCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={100} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12 }}
          itemStyle={{ color: '#a29bfe' }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
        />
        <Bar dataKey="count" fill="#a29bfe" radius={[0, 4, 4, 0]} name="Estudiantes" />
      </BarChart>
    </ResponsiveContainer>
  )
}
