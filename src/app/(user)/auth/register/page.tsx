'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Mail, Lock, User, GraduationCap, MapPin, Building2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

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
  'Otra',
]

const COUNTRIES = [
  'Alemania', 'Argentina', 'Australia', 'Austria', 'Bélgica', 'Bolivia',
  'Brasil', 'Canadá', 'Chile', 'China', 'Colombia', 'Corea del Sur',
  'Costa Rica', 'Dinamarca', 'Ecuador', 'España', 'Estados Unidos',
  'Finlandia', 'Francia', 'Grecia', 'Hungría', 'India', 'Israel',
  'Italia', 'Japón', 'México', 'Noruega', 'Nueva Zelanda', 'Países Bajos',
  'Paraguay', 'Perú', 'Polonia', 'Portugal', 'Reino Unido', 'República Checa',
  'Rumania', 'Rusia', 'Sudáfrica', 'Suecia', 'Suiza', 'Turquía',
  'Ucrania', 'Uruguay', 'Venezuela', 'Otro',
]

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// Wrapper de select con ícono custom y flecha
function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  required,
  children,
}: {
  label: string
  icon: React.ElementType
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5,
      }}>
        <Icon size={13} /> {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          required={required}
          style={{
            width: '100%',
            padding: '0.6rem 2.25rem 0.6rem 0.85rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: value ? 'var(--text)' : 'var(--text-faint)',
            fontSize: '0.88rem',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
            color: 'var(--text-muted)',
          }}
        />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    fullName:           '',
    email:              '',
    password:           '',
    homeUniversity:     '',
    homeCountry:        '',
    exchangeUniversity: '',
    customUniversity:   '',
    exchangeCountry:    'Argentina',
    exchangeCity:       'Buenos Aires',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidEmail(form.email)) {
      setError('Ingresá un email válido.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!form.homeCountry) {
      setError('Seleccioná tu país de origen.')
      return
    }
    if (!form.exchangeUniversity) {
      setError('Seleccioná la universidad en la que estás actualmente.')
      return
    }
    if (form.exchangeUniversity === 'Otra' && !form.customUniversity.trim()) {
      setError('Ingresá el nombre de tu universidad.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options:  { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const finalUniversity = form.exchangeUniversity === 'Otra'
        ? form.customUniversity.trim()
        : form.exchangeUniversity

      await supabase.from('profiles').insert({
        id:                  data.user.id,
        full_name:           form.fullName,
        university:          form.homeUniversity,
        exchange_university: finalUniversity,
        home_country:        form.homeCountry,
        exchange_country:    form.exchangeCountry,
        exchange_city:       form.exchangeCity,
      })
    }

    setSuccess(true)
    setLoading(false)

    if (data.session) {
      setTimeout(() => router.push('/explore'), 1500)
    }
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.72rem',
    color: 'var(--text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0.5rem 0 -0.25rem',
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 540 }}>
        <Link href="/" className="auth-logo">
          <Globe size={20} />
          <span>Global Connect</span>
        </Link>

        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">
          Para estudiantes de intercambio en Buenos Aires.
        </p>

        {error && (
          <div className="auth-feedback error" role="alert">{error}</div>
        )}
        {success && (
          <div className="auth-feedback success" role="status">
            ¡Cuenta creada! Revisá tu email para confirmar tu cuenta.
          </div>
        )}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>

            <Input id="fullName" label="Nombre completo" type="text"
              value={form.fullName} onChange={update('fullName')}
              icon={User} required autoComplete="name" />

            <Input id="email" label="Email" type="email"
              value={form.email} onChange={update('email')}
              icon={Mail} required autoComplete="email" />

            <Input id="password" label="Contraseña (mínimo 8 caracteres)" type="password"
              value={form.password} onChange={update('password')}
              icon={Lock} required autoComplete="new-password" minLength={8} />

            <p style={sectionLabel}>Datos académicos</p>

            {/* País de origen */}
            <SelectField label="País de origen" icon={MapPin}
              value={form.homeCountry} onChange={update('homeCountry')} required>
              <option value="">Seleccioná tu país</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectField>

            {/* Universidad de origen */}
            <Input id="homeUniversity" label="Universidad de origen" type="text"
              value={form.homeUniversity} onChange={update('homeUniversity')}
              icon={GraduationCap} required />

            {/* Universidad en Buenos Aires */}
            <SelectField label="Universidad en Buenos Aires (actual)" icon={Building2}
              value={form.exchangeUniversity} onChange={update('exchangeUniversity')} required>
              <option value="">Seleccioná tu universidad</option>
              {BA_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
            </SelectField>

            {/* Campo libre si elige "Otra" */}
            {form.exchangeUniversity === 'Otra' && (
              <Input id="customUniversity" label="Nombre de tu universidad" type="text"
                value={form.customUniversity} onChange={update('customUniversity')}
                icon={Building2} required />
            )}

            <p style={sectionLabel}>Destino de intercambio</p>

            {/* País y ciudad en la misma fila, mismo alto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
              <SelectField label="País" icon={MapPin}
                value={form.exchangeCountry} onChange={update('exchangeCountry')}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectField>

              {/* Ciudad usando mismo estilo que SelectField para que queden alineados */}
              <div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5,
                }}>
                  <MapPin size={13} /> Ciudad
                </label>
                <input
                  type="text"
                  value={form.exchangeCity}
                  onChange={update('exchangeCity')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <Button type="submit" loading={loading} size="lg"
              style={{ marginTop: '0.5rem', width: '100%' }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
        )}

        <p className="auth-footer">
          ¿Ya tenés cuenta?{' '}
          <Link href="/auth/login">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}
