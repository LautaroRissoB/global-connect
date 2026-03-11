'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Globe, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos. Verificá tus datos.')
      setLoading(false)
      return
    }

    const redirectTo = searchParams.get('redirectTo') ?? '/explore'
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <Link href="/" className="auth-logo">
          <Globe size={20} />
          <span>Global Connect</span>
        </Link>

        <h1 className="auth-title">Bienvenido de vuelta</h1>
        <p className="auth-subtitle">Iniciá sesión para acceder a tus descuentos exclusivos.</p>

        {error && (
          <div className="auth-feedback error" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            id="email"
            label="Email universitario"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={Lock}
            required
            autoComplete="current-password"
          />

          <Button type="submit" loading={loading} size="lg" style={{ marginTop: '0.5rem', width: '100%' }}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="auth-footer">
          ¿No tenés cuenta?{' '}
          <Link href="/auth/register">Registrate gratis</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
