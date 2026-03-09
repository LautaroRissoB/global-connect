'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Mail, Lock, User, GraduationCap, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isUniversityEmail } from '@/lib/validators'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    fullName:        '',
    email:           '',
    password:        '',
    university:      '',
    homeCountry:     '',
    exchangeCountry: '',
    exchangeCity:    '',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const emailValid   = form.email.length > 0 && isUniversityEmail(form.email)
  const emailInvalid = form.email.length > 0 && !isUniversityEmail(form.email)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isUniversityEmail(form.email)) {
      setError('Necesitás un email universitario para registrarte (.edu, .edu.ar, .ac.uk, etc.)')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
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

    // Crear perfil si el usuario se creó inmediatamente (sin confirmación de email)
    if (data.user) {
      await supabase.from('profiles').insert({
        id:               data.user.id,
        full_name:        form.fullName,
        university:       form.university,
        home_country:     form.homeCountry,
        exchange_country: form.exchangeCountry,
        exchange_city:    form.exchangeCity,
      })
    }

    setSuccess(true)
    setLoading(false)

    // Si no hay confirmación de email, redirigir directo
    if (data.session) {
      setTimeout(() => router.push('/'), 1500)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 520 }}>
        {/* Logo */}
        <Link href="/" className="auth-logo">
          <Globe size={20} />
          <span>Global Connect</span>
        </Link>

        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">
          Solo para estudiantes de intercambio. Necesitás un email universitario.
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
            <div>
              <Input
                id="email"
                label="Email universitario"
                type="email"
                value={form.email}
                onChange={update('email')}
                icon={Mail}
                required
                autoComplete="email"
              />
              {emailValid && (
                <p className="email-hint valid">✓ Email universitario válido</p>
              )}
              {emailInvalid && (
                <p className="email-hint invalid">
                  ✗ Necesitás un email universitario (.edu, .edu.ar, .ac.uk…)
                </p>
              )}
            </div>

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

            {/* Universidad */}
            <Input
              id="university"
              label="Universidad de origen"
              type="text"
              value={form.university}
              onChange={update('university')}
              icon={GraduationCap}
              required
            />

            {/* País de origen + País de intercambio */}
            <div className="form-row">
              <Input
                id="homeCountry"
                label="País de origen"
                type="text"
                value={form.homeCountry}
                onChange={update('homeCountry')}
                icon={MapPin}
                required
              />
              <Input
                id="exchangeCountry"
                label="País de intercambio"
                type="text"
                value={form.exchangeCountry}
                onChange={update('exchangeCountry')}
                icon={MapPin}
                required
              />
            </div>

            {/* Ciudad de intercambio */}
            <Input
              id="exchangeCity"
              label="Ciudad de intercambio"
              type="text"
              value={form.exchangeCity}
              onChange={update('exchangeCity')}
              icon={MapPin}
              required
            />

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
