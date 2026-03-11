'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Mail, Lock, User, GraduationCap, MapPin, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// Universidades en Buenos Aires (intercambio)
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

// Países (selección común para estudiantes de intercambio)
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

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    fullName:           '',
    email:              '',
    password:           '',
    homeUniversity:     '',
    homeCountry:        '',
    exchangeUniversity: '',
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
      await supabase.from('profiles').insert({
        id:                  data.user.id,
        full_name:           form.fullName,
        university:          form.homeUniversity,
        exchange_university: form.exchangeUniversity,
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

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
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
          <div className="auth-feedback error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="auth-feedback success" role="status">
            ¡Cuenta creada! Revisá tu email para confirmar tu cuenta.
          </div>
        )}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>

            {/* Nombre */}
            <Input
              id="fullName"
              label="Nombre completo"
              type="text"
              value={form.fullName}
              onChange={update('fullName')}
              icon={User}
              required
              autoComplete="name"
            />

            {/* Email */}
            <Input
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={update('email')}
              icon={Mail}
              required
              autoComplete="email"
            />

            {/* Contraseña */}
            <Input
              id="password"
              label="Contraseña (mínimo 8 caracteres)"
              type="password"
              value={form.password}
              onChange={update('password')}
              icon={Lock}
              required
              autoComplete="new-password"
              minLength={8}
            />

            {/* Separador: datos académicos */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.25rem 0 -0.25rem' }}>
              Datos académicos
            </p>

            {/* País de origen */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                <MapPin size={14} /> País de origen
              </label>
              <select
                value={form.homeCountry}
                onChange={update('homeCountry')}
                required
                style={selectStyle}
              >
                <option value="">Seleccioná tu país</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Universidad de origen */}
            <Input
              id="homeUniversity"
              label="Universidad de origen"
              type="text"
              value={form.homeUniversity}
              onChange={update('homeUniversity')}
              icon={GraduationCap}
              required
            />

            {/* Universidad actual (Buenos Aires) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                <Building2 size={14} /> Universidad en Buenos Aires (actual)
              </label>
              <select
                value={form.exchangeUniversity}
                onChange={update('exchangeUniversity')}
                required
                style={selectStyle}
              >
                <option value="">Seleccioná tu universidad</option>
                {BA_UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Separador: destino */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.25rem 0 -0.25rem' }}>
              Destino de intercambio
            </p>

            {/* País y ciudad de intercambio (pre-filled, editables) */}
            <div className="form-row">
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  <MapPin size={14} /> País
                </label>
                <select
                  value={form.exchangeCountry}
                  onChange={update('exchangeCountry')}
                  style={selectStyle}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Input
                id="exchangeCity"
                label="Ciudad"
                type="text"
                value={form.exchangeCity}
                onChange={update('exchangeCity')}
                icon={MapPin}
                required
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              size="lg"
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
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
