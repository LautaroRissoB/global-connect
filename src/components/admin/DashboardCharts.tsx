'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export type DayCount     = { date: string; count: number }
export type EstabViews   = { name: string; views: number }
export type CountryCount = { country: string; count: number }

const TEAL_SHADES  = ['#00cec9', '#19d3cf', '#33d8d4', '#4ddcda', '#66e0df']
const PURPLE_SHADES = ['#6c5ce7', '#7d6ef0', '#8e80f8', '#9f91ff', '#b0a3ff', '#c1b5ff', '#d2c7ff', '#e3d9ff']

/* ── User Growth ─────────────────────────────────────── */
export function UserGrowthChart({ data }: { data: DayCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={156}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6c5ce7" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
          tickLine={false} axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
          tickLine={false} axisLine={false}
          allowDecimals={false} width={24}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            borderRadius: 8, fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          itemStyle={{ color: '#a29bfe' }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 3, fontSize: 11 }}
          cursor={{ stroke: 'rgba(108,92,231,0.25)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#6c5ce7"
          strokeWidth={2}
          fill="url(#ugGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#a29bfe', strokeWidth: 0 }}
          name="Nuevos estudiantes"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Views by Establishment ─────────────────────────── */
export function ViewsChart({ data }: { data: EstabViews[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 26 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, left: 4, bottom: 2 }} barCategoryGap="32%">
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
          tickLine={false} axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category" dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false} axisLine={false}
          width={108}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            borderRadius: 8, fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          itemStyle={{ color: '#00cec9' }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 3, fontSize: 11 }}
          cursor={{ fill: 'rgba(255,255,255,0.025)' }}
        />
        <Bar dataKey="views" radius={[0, 5, 5, 0]} name="Vistas" maxBarSize={12}>
          {data.map((_, i) => (
            <Cell key={i} fill={TEAL_SHADES[Math.min(i, TEAL_SHADES.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Users by Country ────────────────────────────────── */
export function CountryChart({ data }: { data: CountryCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 26 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, left: 4, bottom: 2 }} barCategoryGap="32%">
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
          tickLine={false} axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category" dataKey="country"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false} axisLine={false}
          width={92}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            borderRadius: 8, fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          itemStyle={{ color: '#a29bfe' }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 3, fontSize: 11 }}
          cursor={{ fill: 'rgba(255,255,255,0.025)' }}
        />
        <Bar dataKey="count" radius={[0, 5, 5, 0]} name="Estudiantes" maxBarSize={12}>
          {data.map((_, i) => (
            <Cell key={i} fill={PURPLE_SHADES[Math.min(i, PURPLE_SHADES.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
