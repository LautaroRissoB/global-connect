'use client'

import { useState } from 'react'
import { useRef } from 'react'
import { User, MapPin, GraduationCap, Building2, ChevronDown, Check } from 'lucide-react'

const BA_UNIVERSITIES = [
  'Universidad de Buenos Aires (UBA)',
  'Universidad Torcuato Di Tella (UTDT)',
  'Universidad de San Andrés (UdeSA)',
  'Universidad Austral',
  'ITBA – Instituto Tecnológico de Buenos Aires',
  'Universidad Católica Argentina (UCA)',
  'Universidad CEMA',
  'Universidad de Palermo (UP)',
  'ORT Argentina',
  'UADE – Universidad Argentina de la Empresa',
  'Universidad Abierta Interamericana (UAI)',
  'Universidad Nacional de San Martín (UNSAM)',
  'Universidad Nacional de Tres de Febrero (UNTREF)',
  'Otra / Other',
]

const COUNTRIES = [
  'Alemania / Germany', 'Argentina', 'Australia', 'Austria',
  'Bélgica / Belgium', 'Bolivia', 'Brasil / Brazil', 'Canadá / Canada',
  'Chile', 'China', 'Colombia', 'Corea del Sur / South Korea',
  'Costa Rica', 'Dinamarca / Denmark', 'Ecuador', 'España / Spain',
  'Estados Unidos / USA', 'Finlandia / Finland', 'Francia / France',
  'Grecia / Greece', 'Hungría / Hungary', 'India', 'Israel',
  'Italia / Italy', 'Japón / Japan', 'México / Mexico',
  'Noruega / Norway', 'Nueva Zelanda / New Zealand', 'Países Bajos / Netherlands',
  'Paraguay', 'Perú / Peru', 'Polonia / Poland', 'Portugal',
  'Reino Unido / UK', 'República Checa / Czech Republic',
  'Rumania / Romania', 'Rusia / Russia', 'Sudáfrica / South Africa',
  'Suecia / Sweden', 'Suiza / Switzerland', 'Turquía / Turkey',
  'Ucrania / Ukraine', 'Uruguay', 'Venezuela', 'Otro / Other',
]

function Dropdown({ label, icon: Icon, value, onChange, options, placeholder }: {
  label: string; icon: React.ElementType; value: string
  onChange: (v: string) => void; options: string[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>
        <Icon size={13} /> {label}
      </label>
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 0.85rem', borderRadius: 'var(--radius)',
          border: `1px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          background: 'var(--surface)', color: value ? 'var(--text)' : 'var(--text-faint)',
          fontSize: '0.88rem', cursor: 'pointer', textAlign: 'left',
        }}>
          <span>{value || placeholder}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
            {options.map((opt) => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.85rem', background: opt === value ? 'rgba(108,92,231,0.15)' : 'transparent', color: opt === value ? 'var(--primary-light)' : 'var(--text)', fontSize: '0.88rem', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                {opt}{opt === value && <Check size={13} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  action: (formData: FormData) => Promise<void>
}

export default function ProfileCompleteForm({ action }: Props) {
  const [country, setCountry]     = useState('')
  const [university, setUniversity] = useState('')
  const [custom, setCustom]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!country)     { setError('Seleccioná tu país de origen'); return }
    if (!university)  { setError('Seleccioná tu universidad en Buenos Aires'); return }
    if (university === 'Otra / Other' && !custom.trim()) { setError('Ingresá el nombre de tu universidad'); return }

    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    fd.set('home_country', country)
    fd.set('exchange_university', university === 'Otra / Other' ? custom.trim() : university)

    try {
      await action(fd)
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', textAlign: 'left' }}>

      {error && (
        <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 'var(--radius)', padding: '0.6rem 0.875rem', fontSize: '0.85rem', color: '#ff5252' }}>
          {error}
        </div>
      )}

      {/* Full name */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>
          <User size={13} /> Nombre completo
        </label>
        <input
          name="full_name"
          type="text"
          required
          placeholder="Tu nombre y apellido"
          style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Home university */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>
          <GraduationCap size={13} /> Universidad de origen
        </label>
        <input
          name="university"
          type="text"
          required
          placeholder="Ej: Universidad de Valencia"
          style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Country */}
      <Dropdown
        label="País de origen"
        icon={MapPin}
        value={country}
        onChange={setCountry}
        options={COUNTRIES}
        placeholder="Seleccioná tu país"
      />

      {/* Exchange university */}
      <Dropdown
        label="Universidad en Buenos Aires"
        icon={Building2}
        value={university}
        onChange={setUniversity}
        options={BA_UNIVERSITIES}
        placeholder="Seleccioná tu universidad"
      />
      {university === 'Otra / Other' && (
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Nombre de tu universidad"
          style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
        />
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.7rem', marginTop: '0.25rem', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </form>
  )
}
